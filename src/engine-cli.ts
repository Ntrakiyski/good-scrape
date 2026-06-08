import { Defuddle } from "defuddle/node"
import { parseHTML } from "linkedom"
import { BrowserSession } from "./crawler/browser-session"
import { CrawlerEngine } from "./crawler/engine"
import { Scheduler } from "./crawler/scheduler"
import { HttpSession, SessionManager } from "./crawler/session"
import {
	type CrawlConfig,
	type CrawlItem,
	CrawlRequest,
	type CrawlResponse,
	type CrawlStats,
	defaultConfig,
} from "./crawler/types"
import { isSPAShell } from "./detect"

const DEFUDDLE_TIMEOUT = 5_000
const MARKDOWN_SIGNAL = /^(#{1,6}\s|[-*]\s|\d+\.\s|```|>\s|\[.+\]\(.+\))/m
const STYLE_SCRIPT_RE = /<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>/gi
const LINK_RE = /<a\s[^>]*href=["']([^"']+)["']/gi
const IGNORED_EXT = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|tar|gz|mp[34]|woff2?|ttf|eot|css|js|json|xml|rss|atom)$/i
const MAX_FOLLOW_PER_PAGE = 8

interface MediaRef {
	url: string
	alt?: string
	type?: "image" | "video" | "source"
}

export interface CrawlItemData {
	url: string
	title: string
	markdown: string
	media: MediaRef[]
}

interface CrawlResultData {
	stats: CrawlStats
	paused: boolean
	errors: number
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))])
}

function extractMedia(html: string, baseUrl: string): MediaRef[] {
	const { document } = parseHTML(html)
	const base = new URL(baseUrl)
	const seen = new Set<string>()
	const results: MediaRef[] = []

	const resolveUrl = (src: string): string => {
		if (!src || src.startsWith("data:") || src.startsWith("blob:")) return ""
		try {
			return new URL(src, base).href
		} catch {
			return ""
		}
	}

	const add = (src: string, type: MediaRef["type"], alt?: string) => {
		const url = resolveUrl(src)
		if (url && !seen.has(url)) {
			seen.add(url)
			results.push({ url, alt, type })
		}
	}

	for (const el of document.querySelectorAll("img[src], img[data-src]")) {
		add(el.getAttribute("src") || el.getAttribute("data-src") || "", "image", el.getAttribute("alt") || undefined)
	}

	for (const el of document.querySelectorAll("video[src]")) {
		add(el.getAttribute("src") || "", "video", "video")
		for (const src of el.querySelectorAll("source")) {
			add(src.getAttribute("src") || src.getAttribute("srcset") || "", "video")
		}
	}

	for (const el of document.querySelectorAll("[style]")) {
		const style = el.getAttribute("style") || ""
		const match = style.match(/url\(["']?([^"')\s]+)/)
		if (match) add(match[1], "image")
	}

	return results
}

function fallbackExtract(html: string) {
	const { document } = parseHTML(html)
	const title = document.querySelector("title")?.textContent || ""
	const el = document.querySelector("main") ?? document.querySelector("article") ?? document.querySelector("body")
	return {
		title,
		content: el?.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "",
	}
}

function urlKey(url: string): string {
	try {
		const parsed = new URL(url)
		parsed.hash = ""
		parsed.search = ""
		return parsed.href.replace(/\/$/, "")
	} catch {
		return url.replace(/\/$/, "")
	}
}

async function convertToMarkdown(html: string, url: string): Promise<{ title: string; content: string }> {
	const cleaned = html.replace(STYLE_SCRIPT_RE, "")

	try {
		const result = await withTimeout(Defuddle(cleaned, url, { markdown: true }), DEFUDDLE_TIMEOUT)
		return { title: result.title || "", content: result.content || "" }
	} catch {
		return fallbackExtract(cleaned)
	}
}

function extractLinks(
	html: string,
	baseUrl: string,
	hostname: string,
	seen: Set<string>,
	allowedUrls?: Set<string>,
): string[] {
	const out: string[] = []
	for (const [, href] of html.matchAll(LINK_RE)) {
		if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue
		try {
			const resolved = new URL(href, baseUrl)
			if (resolved.hostname !== hostname) continue
			resolved.hash = ""
			const key = urlKey(resolved.href)
			if (allowedUrls && !allowedUrls.has(key)) continue
			if (IGNORED_EXT.test(resolved.pathname)) continue
			if (seen.has(key)) continue
			seen.add(key)
			out.push(resolved.href)
			if (out.length >= MAX_FOLLOW_PER_PAGE) break
		} catch {}
	}
	return out
}

export interface CrawlOptions {
	concurrency?: number
	useBrowser?: boolean
	forceBrowser?: boolean
	proxies?: string[]
	respectRobotsTxt?: boolean
	cacheDir?: string
	allowedUrls?: Set<string>
	onItem?: (data: CrawlItemData) => void
	onError?: (url: string, error: string) => void
}

export async function crawlWithEngine(seedUrls: string[], options: CrawlOptions = {}): Promise<CrawlResultData> {
	const scheduler = new Scheduler()
	const sessionManager = new SessionManager()
	const httpSession = new HttpSession("http", options.proxies)
	sessionManager.add("http", httpSession)

	let browserSession: BrowserSession | undefined
	if (options.useBrowser || options.forceBrowser) {
		browserSession = new BrowserSession("browser")
		sessionManager.add("browser", browserSession, true)
	}

	const config: CrawlConfig = {
		...defaultConfig,
		concurrentRequests: options.concurrency ?? (options.useBrowser ? 4 : 8),
		proxies: options.proxies ?? [],
		respectRobotsTxt: options.respectRobotsTxt ?? false,
		cacheDir: options.cacheDir ?? "",
	}

	let errorCount = 0

	const engine = new CrawlerEngine(scheduler, sessionManager, config, {
		onError: async (_req, _err) => {
			errorCount++
			options.onError?.(_req.url, _err.message)
		},
	})

	const linkSeen = new Set<string>()
	const allowedUrls = options.allowedUrls ? new Set([...options.allowedUrls].map((url) => urlKey(url))) : undefined

	async function* convertAndEmit(
		response: CrawlResponse,
		followLinks: boolean,
	): AsyncGenerator<CrawlItem | CrawlRequest> {
		try {
			const ct = response.headers["content-type"] ?? ""
			let text: string
			let finalUrl: string
			try {
				text = response.text()
				finalUrl = response.url
			} catch {
				text = ""
				finalUrl = response.url
			}

			if (ct.includes("text/markdown") || (!ct.includes("text/html") && MARKDOWN_SIGNAL.test(text))) {
				const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || new URL(finalUrl).pathname
				yield { url: finalUrl, title, markdown: text, media: [] } satisfies CrawlItem
				return
			}

			if (browserSession && (options.forceBrowser || isSPAShell(text))) {
				try {
					const browserResp = await browserSession.fetch(response.request)
					if (browserResp.status === 200 && browserResp.body.length > 0) {
						text = browserResp.text()
						finalUrl = browserResp.url
					}
				} catch {
					// fall through to use original HTML
				}
			}

			if (followLinks) {
				let hostname: string
				try {
					hostname = new URL(finalUrl).hostname
				} catch {
					hostname = ""
				}
				const links = extractLinks(text, finalUrl, hostname, linkSeen, allowedUrls)
				for (const link of links) {
					yield new CrawlRequest({
						url: link,
						sid: response.request.sid,
						callback: "leaf",
						priority: -1,
						meta: { parent: finalUrl },
					})
				}
			}

			let pageMedia: MediaRef[] = []
			try {
				pageMedia = extractMedia(text, finalUrl)
			} catch {
				// best-effort
			}

			let pageTitle: string
			let pageContent: string
			try {
				const { title, content } = await convertToMarkdown(text, finalUrl)
				pageTitle = title
				pageContent = typeof content === "string" ? content : String(content ?? "")
			} catch {
				const fallback = fallbackExtract(text)
				pageTitle = fallback.title
				pageContent = fallback.content
			}

			yield {
				url: finalUrl,
				title: pageTitle || new URL(finalUrl).pathname,
				markdown: pageContent,
				media: pageMedia,
			} satisfies CrawlItem
		} catch (err) {
			const errorUrl = response?.url ?? "unknown"
			process.stderr.write(`  \x1b[31m✗\x1b[0m convertAndEmit error for ${errorUrl}: ${err}\n`)
		}
	}

	engine.registerCallback("parse", async function* (response: CrawlResponse) {
		yield* convertAndEmit(response, true)
	})

	engine.registerCallback("leaf", async function* (response: CrawlResponse) {
		yield* convertAndEmit(response, false)
	})

	const result = await engine.crawl(seedUrls, {
		onItem: (item) => {
			const data = item as unknown as CrawlItemData
			options.onItem?.(data)
		},
	})

	return { stats: result.stats, paused: result.paused, errors: errorCount }
}
