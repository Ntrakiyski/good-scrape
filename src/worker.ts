// Suppress defuddle's internal error logging
const _stderr = process.stderr.write.bind(process.stderr)
process.stderr.write = (chunk: any, ...args: any[]) => {
	if (typeof chunk === "string" && (chunk.includes("Defuddle Error") || chunk.includes("pseudo-class"))) return true
	return _stderr(chunk, ...args)
}
console.error = () => {}

import { Defuddle } from "defuddle/node"
import { parseHTML } from "linkedom"
import { isSPAShell } from "./detect"
import { isBrowserLaunched, launchBrowser, renderPage } from "./renderer"
import { getHeaders } from "./ua"

declare const self: Worker

const MARKDOWN_SIGNAL = /^(#{1,6}\s|[-*]\s|\d+\.\s|```|>\s|\[.+\]\(.+\))/m
const DEFUDDLE_TIMEOUT = 5000

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
	Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))])

export interface MediaRef {
	url: string
	alt?: string
	type?: "image" | "video" | "source"
}

const extractMedia = (html: string, baseUrl: string): MediaRef[] => {
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

	document.querySelectorAll("img[src], img[data-src]").forEach((el) => {
		add(el.getAttribute("src") || el.getAttribute("data-src") || "", "image", el.getAttribute("alt") || undefined)
	})

	document.querySelectorAll("video[src]").forEach((el) => {
		add(el.getAttribute("src") || "", "video", "video")
		el.querySelectorAll("source").forEach((src) => {
			add(src.getAttribute("src") || src.getAttribute("srcset") || "", "video")
		})
	})

	document.querySelectorAll("[style]").forEach((el) => {
		const style = el.getAttribute("style") || ""
		const match = style.match(/url\(["']?([^"')\s]+)/)
		if (match) add(match[1], "image")
	})

	return results
}

const fallbackExtract = (html: string) => {
	const { document } = parseHTML(html)
	const t = document.querySelector("title")?.textContent || ""
	const el = document.querySelector("main") ?? document.querySelector("article") ?? document.querySelector("body")
	return { title: t, content: el?.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "" }
}

self.onmessage = async (e: MessageEvent<{ url: string; useBrowser?: boolean }>) => {
	const { url, useBrowser } = e.data
	try {
		const headers = { ...getHeaders(), Accept: "text/markdown" }
		const res = await fetch(url, { redirect: "follow", headers })
		if (!res.ok) {
			self.postMessage({ ok: false, error: `HTTP ${res.status}: ${url}` })
			return
		}

		let text = await res.text()
		// Preserve original URL for hash-routed SPAs (res.url strips the hash)
		const finalUrl = url.includes("#") ? url : res.url
		const ct = res.headers.get("content-type") ?? ""

		if (ct.includes("text/markdown") || (!ct.includes("text/html") && MARKDOWN_SIGNAL.test(text))) {
			const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || new URL(finalUrl).pathname
			self.postMessage({ ok: true, url: finalUrl, title, content: text, media: [] })
			return
		}

		let media: MediaRef[] = []

		// If it's an SPA shell, render with headless browser
		if (useBrowser && isSPAShell(text)) {
			try {
				if (!isBrowserLaunched()) await launchBrowser()
				const renderUrl = url.includes("#") ? url : finalUrl
				const rendered = await renderPage(renderUrl, { timeout: 20000 })
				if (rendered) {
					text = rendered.html
					media = extractMedia(text, finalUrl)
				}
			} catch {}
		} else {
			media = extractMedia(text, finalUrl)
		}

		const cleaned = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")

		try {
			const result = await withTimeout(Defuddle(cleaned, finalUrl, { markdown: true }), DEFUDDLE_TIMEOUT)
			self.postMessage({ ok: true, url: finalUrl, title: result.title || "", content: result.content || "", media })
		} catch {
			const { title, content } = fallbackExtract(cleaned)
			self.postMessage({ ok: true, url: finalUrl, title, content, media })
		}
	} catch (err: any) {
		self.postMessage({ ok: false, error: err?.message ?? "Unknown error" })
	}
}
