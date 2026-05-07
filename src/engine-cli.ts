import { Defuddle } from "defuddle/node"
import { parseHTML } from "linkedom"
import { Scheduler } from "./crawler/scheduler"
import { CrawlerEngine } from "./crawler/engine"
import { HttpSession, SessionManager } from "./crawler/session"
import { BrowserSession } from "./crawler/browser-session"
import {
	type CrawlItem,
	type CrawlResponse,
	type CrawlStats,
	type CrawlConfig,
	defaultConfig,
} from "./crawler/types"
import { isSPAShell } from "./detect"
import { getHeaders } from "./ua"

const DEFUDDLE_TIMEOUT = 5_000
const MARKDOWN_SIGNAL = /^(#{1,6}\s|[-*]\s|\d+\.\s|```|>\s|\[.+\]\(.+\))/m
const STYLE_SCRIPT_RE = /<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>/gi

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
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
	])
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
		add(
			el.getAttribute("src") || el.getAttribute("data-src") || "",
			"image",
			el.getAttribute("alt") || undefined,
		)
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
	const el =
		document.querySelector("main") ??
		document.querySelector("article") ??
		document.querySelector("body")
	return {
		title,
		content: el?.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "",
	}
}

async function convertToMarkdown(
	html: string,
	url: string,
): Promise<{ title: string; content: string }> {
	const cleaned = html.replace(STYLE_SCRIPT_RE, "")

	try {
		const result = await withTimeout(
			Defuddle(cleaned, url, { markdown: true }),
			DEFUDDLE_TIMEOUT,
		)
		return { title: result.title || "", content: result.content || "" }
	} catch {
		return fallbackExtract(cleaned)
	}
}

export interface CrawlOptions {
	concurrency?: number
	useBrowser?: boolean
	proxies?: string[]
	respectRobotsTxt?: boolean
	cacheDir?: string
	onItem?: (data: CrawlItemData) => void
	onError?: (url: string, error: string) => void
}

export async function crawlWithEngine(
	seedUrls: string[],
	options: CrawlOptions = {},
): Promise<CrawlResultData> {
	const scheduler = new Scheduler()
	const sessionManager = new SessionManager()
	const httpSession = new HttpSession("http", options.proxies)
	sessionManager.add("http", httpSession)

	let browserSession: BrowserSession | undefined
	if (options.useBrowser) {
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

	engine.registerCallback("parse", async function* (response: CrawlResponse) {
		const ct = response.headers["content-type"] ?? ""
		let text = response.text()
		let finalUrl = response.url

		if (
			ct.includes("text/markdown") ||
			(!ct.includes("text/html") && MARKDOWN_SIGNAL.test(text))
		) {
			const title =
				text.match(/^#\s+(.+)$/m)?.[1]?.trim() || new URL(finalUrl).pathname
			yield {
				url: finalUrl,
				title,
				markdown: text,
				media: [],
			} satisfies CrawlItem
			return
		}

		if (isSPAShell(text) && browserSession) {
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

		const media = extractMedia(text, finalUrl)
		const { title, content } = await convertToMarkdown(text, finalUrl)

		yield {
			url: finalUrl,
			title: title || new URL(finalUrl).pathname,
			markdown: content,
			media,
		} satisfies CrawlItem
	})

	const result = await engine.crawl(seedUrls, {
		onItem: (item) => {
			const data = item as unknown as CrawlItemData
			options.onItem?.(data)
		},
	})

	return { stats: result.stats, paused: result.paused, errors: errorCount }
}
