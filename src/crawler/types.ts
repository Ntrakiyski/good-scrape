import { createHash } from "node:crypto"

let requestId = 0

function canonicalUrl(url: string): string {
	try {
		const u = new URL(url)
		u.hash = ""
		return u.href.replace(/\/$/, "")
	} catch {
		return url
	}
}

export class CrawlRequest {
	readonly _brand = "CrawlRequest"
	readonly id: number
	readonly url: string
	priority: number
	sid: string
	readonly method: "GET" | "POST" | "PUT" | "DELETE"
	readonly headers: Record<string, string>
	readonly body?: string | Uint8Array
	dontFilter: boolean
	retryCount: number
	readonly maxRetries: number
	readonly meta: Record<string, unknown>
	readonly proxy?: string
	readonly callback: string
	fingerprint: string

	constructor(init: {
		url: string
		priority?: number
		sid?: string
		method?: "GET" | "POST" | "PUT" | "DELETE"
		headers?: Record<string, string>
		body?: string | Uint8Array
		dontFilter?: boolean
		retryCount?: number
		maxRetries?: number
		meta?: Record<string, unknown>
		proxy?: string
		callback?: string
	}) {
		this.id = ++requestId
		this.url = init.url
		this.priority = init.priority ?? 0
		this.sid = init.sid ?? "default"
		this.method = init.method ?? "GET"
		this.headers = init.headers ?? {}
		this.body = init.body
		this.dontFilter = init.dontFilter ?? false
		this.retryCount = init.retryCount ?? 0
		this.maxRetries = init.maxRetries ?? 3
		this.meta = init.meta ?? {}
		this.proxy = init.proxy
		this.callback = init.callback ?? "parse"
		this.fingerprint = ""
	}

	computeFingerprint(): string {
		const canon = canonicalUrl(this.url)
		const data = `${canon}|${this.method}|${this.sid}|${this.body ? String(this.body) : ""}`
		this.fingerprint = createHash("sha256").update(data).digest("hex")
		return this.fingerprint
	}

	clone(): CrawlRequest {
		return new CrawlRequest({
			url: this.url,
			priority: this.priority,
			sid: this.sid,
			method: this.method,
			headers: { ...this.headers },
			body: this.body,
			dontFilter: this.dontFilter,
			retryCount: this.retryCount,
			maxRetries: this.maxRetries,
			meta: { ...this.meta },
			proxy: this.proxy,
			callback: this.callback,
		})
	}
}

export interface CrawlResponse {
	readonly url: string
	readonly status: number
	readonly headers: Record<string, string>
	readonly body: Uint8Array
	readonly request: CrawlRequest
	readonly responseTime?: number
	text(): string
}

export interface CrawlConfig {
	concurrentRequests: number
	concurrentRequestsPerDomain: number
	downloadDelay: number
	maxRetries: number
	allowedDomains: Set<string>
	useBrowser: boolean
	proxies: string[]
	respectRobotsTxt: boolean
	cacheDir: string
	cacheTtl: number
}

export const defaultConfig: CrawlConfig = {
	concurrentRequests: 4,
	concurrentRequestsPerDomain: 0,
	downloadDelay: 0,
	maxRetries: 3,
	allowedDomains: new Set(),
	useBrowser: false,
	proxies: [],
	respectRobotsTxt: false,
	cacheDir: "",
	cacheTtl: 86_400_000,
}

export class CrawlStats {
	startTime: number
	endTime?: number
	requestsCount = 0
	failedRequests = 0
	blockedRequests = 0
	itemsScraped = 0
	itemsDropped = 0
	responseBytes = 0
	offsiteFiltered = 0
	robotsDisallowed = 0
	cacheHits = 0
	cacheMisses = 0
	totalResponseTime = 0
	sessionsRequestsCount: Record<string, number> = {}
	domainsResponseBytes: Record<string, number> = {}
	domainsRequestCount: Record<string, number> = {}
	domainsResponseTime: Record<string, number> = {}
	responseStatusCount: Record<string, number> = {}
	retryCount = 0

	constructor() {
		this.startTime = Date.now()
	}

	get elapsedSeconds(): number {
		const end = this.endTime ?? Date.now()
		return (end - this.startTime) / 1000
	}

	get requestsPerSecond(): number {
		const elapsed = this.elapsedSeconds
		return elapsed > 0 ? this.requestsCount / elapsed : 0
	}

	get avgResponseTime(): number {
		return this.requestsCount > 0 ? this.totalResponseTime / this.requestsCount : 0
	}

	get cacheHitRate(): number {
		const total = this.cacheHits + this.cacheMisses
		return total > 0 ? this.cacheHits / total : 0
	}

	incrementRequests(sid: string, domain: string): void {
		this.requestsCount++
		this.sessionsRequestsCount[sid] = (this.sessionsRequestsCount[sid] ?? 0) + 1
		this.domainsRequestCount[domain] = (this.domainsRequestCount[domain] ?? 0) + 1
	}

	incrementResponseBytes(domain: string, bytes: number): void {
		this.responseBytes += bytes
		this.domainsResponseBytes[domain] = (this.domainsResponseBytes[domain] ?? 0) + bytes
	}

	addResponseTime(domain: string, ms: number): void {
		this.totalResponseTime += ms
		this.domainsResponseTime[domain] = (this.domainsResponseTime[domain] ?? 0) + ms
	}

	incrementStatus(status: number): void {
		const key = `status_${status}`
		this.responseStatusCount[key] = (this.responseStatusCount[key] ?? 0) + 1
	}
}

export type CrawlItem = Record<string, unknown>

export interface CrawlResult {
	stats: CrawlStats
	paused: boolean
}
