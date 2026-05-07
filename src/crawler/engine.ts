import { Effect } from "effect"
import { CheckpointManager } from "./checkpoint"
import { DevCache } from "./cache"
import { RobotsTxt } from "./robots"
import { ProxyRotator } from "./proxy"
import type { Scheduler } from "./scheduler"
import type { SessionManager } from "./session"
import {
	type CrawlConfig,
	type CrawlItem,
	CrawlRequest,
	type CrawlResponse,
	type CrawlResult,
	CrawlStats,
	defaultConfig,
} from "./types"

const BLOCKED_CODES = new Set([401, 403, 407, 429, 444, 500, 502, 503, 504])

export type CallbackFn = (
	response: CrawlResponse,
) => AsyncGenerator<CrawlItem | CrawlRequest | null, void, undefined>

export interface EngineHooks {
	onStart?: (resuming: boolean) => Promise<void>
	onClose?: () => Promise<void>
	onError?: (request: CrawlRequest, error: Error) => Promise<void>
	onItem?: (item: CrawlItem) => Promise<CrawlItem | null>
	isBlocked?: (response: CrawlResponse) => boolean | Promise<boolean>
	onRetry?: (request: CrawlRequest, response: CrawlResponse) => CrawlRequest
}

class TokenPool {
	private available: number
	private waiters: Array<() => void> = []

	constructor(size: number) {
		this.available = size
	}

	async acquire(): Promise<void> {
		if (this.available > 0) {
			this.available--
			return
		}
		return new Promise<void>((resolve) => {
			this.waiters.push(resolve)
		})
	}

	release(): void {
		const waiter = this.waiters.shift()
		if (waiter) {
			waiter()
		} else {
			this.available++
		}
	}
}

export class CrawlerEngine {
	private scheduler: Scheduler
	private sessionManager: SessionManager
	private config: CrawlConfig
	private hooks: EngineHooks
	private callbacks: Map<string, CallbackFn>
	private stats: CrawlStats
	private running: boolean
	private pauseRequested: boolean
	private forceStop: boolean
	private onItemCb?: (item: CrawlItem) => void
	private checkpointManager: CheckpointManager
	private sigintHandler?: () => void
	private cache: DevCache
	private robotsTxt: Map<string, RobotsTxt>
	private proxyRotator: ProxyRotator

	constructor(
		scheduler: Scheduler,
		sessionManager: SessionManager,
		config: CrawlConfig = defaultConfig,
		hooks: EngineHooks = {},
	) {
		this.scheduler = scheduler
		this.sessionManager = sessionManager
		this.config = config
		this.hooks = hooks
		this.callbacks = new Map()
		this.stats = new CrawlStats()
		this.running = false
		this.pauseRequested = false
		this.forceStop = false
		this.checkpointManager = new CheckpointManager(undefined)
		this.cache = new DevCache(config.cacheDir, config.cacheTtl)
		this.robotsTxt = new Map()
		this.proxyRotator = new ProxyRotator(config.proxies)
	}

	registerCallback(name: string, fn: CallbackFn): void {
		this.callbacks.set(name, fn)
	}

	requestPause(): void {
		if (this.forceStop) return
		if (this.pauseRequested) {
			this.forceStop = true
			return
		}
		this.pauseRequested = true
	}

	private setupSigint(): void {
		const handler = () => this.requestPause()
		this.sigintHandler = handler
		process.on("SIGINT", handler)
	}

	private teardownSigint(): void {
		if (this.sigintHandler) {
			process.off("SIGINT", this.sigintHandler)
			this.sigintHandler = undefined
		}
	}

	private resolveCallback(request: CrawlRequest): CallbackFn {
		return this.callbacks.get(request.callback) ?? this.callbacks.get("parse")!
	}

	private isDomainAllowed(request: CrawlRequest): boolean {
		if (this.config.allowedDomains.size === 0) return true
		try {
			const domain = new URL(request.url).hostname
			for (const allowed of this.config.allowedDomains) {
				if (domain === allowed || domain.endsWith(`.${allowed}`)) return true
			}
		} catch {}
		return false
	}

	private getDomain(url: string): string {
		try {
			return new URL(url).hostname
		} catch {
			return ""
		}
	}

	private async ensureRobotsTxt(domain: string): Promise<void> {
		if (!this.config.respectRobotsTxt) return
		if (this.robotsTxt.has(domain)) return

		try {
			const res = await fetch(`https://${domain}/robots.txt`, {
				redirect: "follow",
				signal: AbortSignal.timeout(5000),
			})
			if (res.ok) {
				const text = await res.text()
				if (text && !text.includes("<!doctype") && !text.includes("<html")) {
					this.robotsTxt.set(domain, new RobotsTxt(text, domain))
				}
			}
		} catch {
			this.robotsTxt.set(domain, new RobotsTxt("", domain))
		}
	}

	private async isRobotsAllowed(request: CrawlRequest): Promise<boolean> {
		if (!this.config.respectRobotsTxt) return true
		const domain = this.getDomain(request.url)
		if (!domain) return true

		await this.ensureRobotsTxt(domain)

		const robots = this.robotsTxt.get(domain)
		if (!robots) return true

		return robots.isAllowed(request.url)
	}

	private async processRequest(request: CrawlRequest): Promise<void> {
		try {
			const domain = this.getDomain(request.url)
			if (!domain) {
				this.stats.failedRequests++
				return
			}

			this.proxyRotator.assign(request)

			const fingerprint = request.fingerprint || request.computeFingerprint()

			const cached = await this.cache.get(fingerprint)
			if (cached) {
				this.stats.cacheHits++
				const response: CrawlResponse = {
					...cached,
					request,
				}
				this.stats.incrementRequests(request.sid, domain)
				this.stats.incrementResponseBytes(domain, response.body.length)
				this.stats.incrementStatus(response.status)
				await this.handleResponse(request, response)
				return
			}
			this.stats.cacheMisses++

			const t0 = performance.now()
			const response = await this.sessionManager.fetch(request)
			const responseTime = performance.now() - t0

			this.stats.incrementRequests(request.sid, domain)
			this.stats.incrementResponseBytes(domain, response.body.length)
			this.stats.incrementStatus(response.status)
			this.stats.addResponseTime(domain, responseTime)

			const blocked = this.isBlocked(response)
			if (blocked) {
				this.stats.blockedRequests++
				if (request.retryCount < this.config.maxRetries) {
					const retryReq = request.clone()
					retryReq.retryCount++
					retryReq.priority--
					retryReq.dontFilter = true
					const modified =
						this.hooks.onRetry?.(retryReq, response) ?? retryReq
					await this.scheduler.enqueue(modified)
					this.stats.retryCount++
				}
				return
			}

			await this.cache.set(fingerprint, response)
			await this.handleResponse(request, response)
		} catch (err) {
			this.stats.failedRequests++
			await this.hooks.onError?.(
				request,
				err instanceof Error ? err : new Error(String(err)),
			)
		}
	}

	private async handleResponse(
		request: CrawlRequest,
		response: CrawlResponse,
	): Promise<void> {
		const callback = this.resolveCallback(request)

		for await (const result of callback(response)) {
			if (
				result != null &&
				typeof result === "object" &&
				(result as CrawlRequest)._brand === "CrawlRequest"
			) {
				const req = result as CrawlRequest
				if (this.isDomainAllowed(req)) {
					if (this.config.respectRobotsTxt) {
						const allowed = await this.isRobotsAllowed(req)
						if (!allowed) {
							this.stats.robotsDisallowed++
							continue
						}
					}
					const enqueued = await this.scheduler.enqueue(req)
					if (enqueued) {
						this.stats.incrementRequests(req.sid, this.getDomain(req.url))
					}
				} else {
					this.stats.offsiteFiltered++
				}
			} else if (result !== null) {
				const processed =
					(await this.hooks.onItem?.(result as CrawlItem)) ??
					(result as CrawlItem)
				if (processed !== null) {
					this.stats.itemsScraped++
					this.onItemCb?.(processed)
				} else {
					this.stats.itemsDropped++
				}
			}
		}
	}

	private isBlocked(response: CrawlResponse): boolean {
		if (BLOCKED_CODES.has(response.status)) return true
		if (this.hooks.isBlocked) {
			const result = this.hooks.isBlocked(response)
			if (result instanceof Promise) return false
			return result
		}
		return false
	}

	async crawl(
		seedUrls: string[],
		options?: { crawldir?: string; onItem?: (item: CrawlItem) => void },
	): Promise<CrawlResult> {
		this.running = true
		this.stats = new CrawlStats()
		this.pauseRequested = false
		this.forceStop = false
		this.onItemCb = options?.onItem
		this.checkpointManager = new CheckpointManager(options?.crawldir)
		this.robotsTxt = new Map()
		this.cache = new DevCache(this.config.cacheDir, this.config.cacheTtl)

		const tokens = new TokenPool(this.config.concurrentRequests)
		const pending: Promise<void>[] = []

		let paused = false

		const resuming =
			this.checkpointManager.enabled &&
			(await this.checkpointManager.load()) !== null

		await this.hooks.onStart?.(resuming)
		await this.sessionManager.start()

		if (resuming) {
			const data = await this.checkpointManager.load()
			if (data) {
				this.scheduler.restore(data)
			}
		} else {
			const defaultSid = this.sessionManager.defaultSessionName
			for (const url of seedUrls) {
				const req = new CrawlRequest({ url, sid: defaultSid })
				req.computeFingerprint()
				if (this.config.respectRobotsTxt) {
					const allowed = await this.isRobotsAllowed(req)
					if (!allowed) {
						this.stats.robotsDisallowed++
						continue
					}
				}
				await this.scheduler.enqueue(req)
			}
		}

		this.setupSigint()

		try {
			while (this.running && !this.forceStop) {
				if (this.pauseRequested) {
					if (pending.length === 0 || this.forceStop) {
						if (this.checkpointManager.enabled) {
							await this.checkpointManager.save(
								this.scheduler.snapshot(),
							)
							paused = true
						}
						if (this.forceStop) {
							pending.length = 0
						}
						this.running = false
						break
					}
					await this.sleep(50)
					continue
				}

				if (this.checkpointManager.isDue) {
					await this.checkpointManager.save(this.scheduler.snapshot())
				}

				if (this.scheduler.empty) {
					if (pending.length === 0) {
						this.running = false
						break
					}
					await this.sleep(50)
					continue
				}

				const request = await this.scheduler.dequeue()
				await tokens.acquire()

				const task = (async () => {
					try {
						await this.processRequest(request)
					} finally {
						tokens.release()
					}
				})()

				pending.push(task)

				task.then(() => {
					const idx = pending.indexOf(task)
					if (idx >= 0) pending.splice(idx, 1)
				})
			}

			if (!this.forceStop) {
				await Promise.all(pending)
			}
		} finally {
			this.teardownSigint()
		}

		this.stats.endTime = Date.now()
		this.running = false

		await this.hooks.onClose?.()
		await this.sessionManager.close()

		if (!paused && this.checkpointManager.enabled) {
			await this.checkpointManager.cleanup()
		}

		return { stats: this.stats, paused }
	}

	crawlEffect(
		seedUrls: string[],
		options?: { crawldir?: string },
	): Effect.Effect<CrawlResult, Error> {
		return Effect.tryPromise({
			try: () => this.crawl(seedUrls, options),
			catch: (e) => new Error(String(e)),
		})
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
