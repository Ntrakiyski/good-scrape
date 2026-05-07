import { getHeaders } from "../ua"
import { ProxyRotator } from "./proxy"
import type { CrawlRequest, CrawlResponse } from "./types"

export interface Session {
	readonly type: string
	readonly name: string
	fetch(request: CrawlRequest): Promise<CrawlResponse>
	start?(): Promise<void>
	close?(): Promise<void>
}

export class HttpSession implements Session {
	readonly type = "http"
	readonly name: string
	private proxyRotator: ProxyRotator

	constructor(name = "default", proxies: string[] = []) {
		this.name = name
		this.proxyRotator = new ProxyRotator(proxies)
	}

	async fetch(request: CrawlRequest): Promise<CrawlResponse> {
		const headers: Record<string, string> = {
			...getHeaders(),
			...request.headers,
		}

		const init: RequestInit & { proxy?: string } = {
			method: request.method,
			headers,
			redirect: "follow",
		}

		const proxy = this.proxyRotator.assign(request)
		if (proxy) {
			init.proxy = proxy
		}

		if (request.body) {
			init.body = request.body
		}

		const t0 = performance.now()
		const res = await fetch(request.url, init)
		const responseTime = performance.now() - t0
		const body = new Uint8Array(await res.arrayBuffer())

		const respHeaders: Record<string, string> = {}
		res.headers.forEach((v, k) => {
			respHeaders[k] = v
		})

		return {
			url: res.url,
			status: res.status,
			headers: respHeaders,
			body,
			request,
			responseTime,
			text(): string {
				const decoder = new TextDecoder()
				return decoder.decode(body)
			},
		}
	}
}

interface SessionEntry {
	session: Session
	lazy: boolean
}

export class SessionManager {
	private entries: Map<string, SessionEntry> = new Map()
	private started = false

	get defaultSessionName(): string {
		return this.entries.keys().next().value ?? "default"
	}

	add(name: string, session: Session, lazy = false): void {
		this.entries.set(name, { session, lazy })
	}

	get(name: string): Session | undefined {
		return this.entries.get(name)?.session
	}

	async start(): Promise<void> {
		if (this.started) return
		this.started = true
		for (const [, { session, lazy }] of this.entries) {
			if (!lazy) await session.start?.()
		}
	}

	async close(): Promise<void> {
		if (!this.started) return
		this.started = false
		for (const [, { session }] of this.entries) {
			await session.close?.()
		}
	}

	async fetch(request: CrawlRequest): Promise<CrawlResponse> {
		const sid = request.sid || this.defaultSessionName
		const entry = this.entries.get(sid)
		if (!entry) throw new Error(`Unknown session: ${sid}`)
		if (entry.lazy) {
			await entry.session.start?.()
			entry.lazy = false
		}
		return entry.session.fetch(request)
	}
}
