#!/usr/bin/env bun
import { cpus } from "node:os"
import { Effect } from "effect"
import { isSPAShell } from "./detect"
import { discover } from "./discover"
import { type CrawlItemData, crawlWithEngine } from "./engine-cli"
import { closeBrowser } from "./renderer"

const DEFAULT_MAX_PAGES = 5
const MAX_SERVER_PAGES = 25

interface ScrapeInput {
	url: string
	max: number
	respectRobotsTxt: boolean
}

interface ScrapeOutput {
	source: string
	discovered: number
	returned: number
	limit: number
	needsBrowser: boolean
	errors: number
	pages: CrawlItemData[]
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body, null, 2), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	})

const normalizeUrl = (value: unknown): string => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error("Missing URL")
	}
	const raw = value.trim()
	const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
	return new URL(withProtocol).href
}

const parseMax = (value: unknown): number => {
	const n = typeof value === "number" ? value : Number(value)
	if (!Number.isFinite(n) || n <= 0) return DEFAULT_MAX_PAGES
	return Math.min(Math.floor(n), MAX_SERVER_PAGES)
}

async function parseInput(request: Request): Promise<ScrapeInput> {
	const contentType = request.headers.get("content-type") ?? ""

	if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
		const form = await request.formData()
		return {
			url: normalizeUrl(form.get("url")),
			max: parseMax(form.get("max")),
			respectRobotsTxt: form.get("respectRobotsTxt") === "on" || form.get("respectRobotsTxt") === "true",
		}
	}

	const body = request.body ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {}
	return {
		url: normalizeUrl(body.url),
		max: parseMax(body.max),
		respectRobotsTxt: body.respectRobotsTxt === true,
	}
}

async function detectBrowserNeed(url: string): Promise<boolean> {
	try {
		const html = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10_000) }).then((r) => r.text())
		return isSPAShell(html)
	} catch {
		return false
	}
}

async function scrape(input: ScrapeInput): Promise<ScrapeOutput> {
	const urls = await Effect.runPromise(discover(input.url, input.max))
	const needsBrowser = await detectBrowserNeed(input.url)
	const pages: CrawlItemData[] = []

	const result = await crawlWithEngine(urls, {
		concurrency: needsBrowser ? 4 : Math.max(4, Math.min(12, cpus().length * 2)),
		useBrowser: needsBrowser,
		respectRobotsTxt: input.respectRobotsTxt,
		onItem: (data) => pages.push(data),
	})

	return {
		source: input.url,
		discovered: urls.length,
		returned: pages.length,
		limit: input.max,
		needsBrowser,
		errors: result.errors,
		pages,
	}
}

const page = () => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Good Scrape</title>
	<style>
		:root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
		body { margin: 0; background: #f7f7f4; color: #181816; }
		main { max-width: 860px; margin: 0 auto; padding: 48px 20px; }
		header { margin-bottom: 28px; }
		h1 { margin: 0 0 8px; font-size: clamp(2rem, 6vw, 4rem); letter-spacing: 0; }
		p { color: #52524b; line-height: 1.6; }
		form { display: grid; gap: 14px; padding: 20px; border: 1px solid #d8d8d0; background: #fff; border-radius: 8px; }
		label { display: grid; gap: 6px; font-weight: 650; }
		input, button { font: inherit; }
		input[type="url"], input[type="number"] { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 6px; border: 1px solid #c9c9bf; }
		button { width: fit-content; padding: 11px 16px; border: 0; border-radius: 6px; background: #1f6feb; color: white; font-weight: 700; cursor: pointer; }
		.row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
		.check { display: flex; gap: 8px; align-items: center; font-weight: 500; }
		pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 16px; border-radius: 8px; background: #181816; color: #f7f7f4; min-height: 120px; }
		@media (prefers-color-scheme: dark) {
			body { background: #181816; color: #f7f7f4; }
			p { color: #bdbdb4; }
			form { background: #22221f; border-color: #3a3a34; }
			input[type="url"], input[type="number"] { background: #181816; color: #f7f7f4; border-color: #4a4a42; }
			pre { background: #0d1117; }
		}
	</style>
</head>
<body>
	<main>
		<header>
			<h1>Good Scrape</h1>
			<p>Pull public pages into structured Markdown. Server mode caps requests at ${MAX_SERVER_PAGES} pages.</p>
		</header>
		<form id="scrape-form">
			<label>
				URL
				<input name="url" type="url" value="https://example.com" required>
			</label>
			<div class="row">
				<label>
					Max pages
					<input name="max" type="number" min="1" max="${MAX_SERVER_PAGES}" value="${DEFAULT_MAX_PAGES}">
				</label>
				<label class="check">
					<input name="respectRobotsTxt" type="checkbox" checked>
					Respect robots.txt
				</label>
			</div>
			<button type="submit">Pull Markdown</button>
		</form>
		<p>API: <code>POST /api/pull</code> with JSON <code>{"url":"https://example.com","max":5,"respectRobotsTxt":true}</code>.</p>
		<pre id="result">Ready.</pre>
	</main>
	<script>
		const form = document.querySelector("#scrape-form");
		const result = document.querySelector("#result");
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			result.textContent = "Working...";
			const data = Object.fromEntries(new FormData(form).entries());
			data.respectRobotsTxt = Boolean(data.respectRobotsTxt);
			data.max = Number(data.max || ${DEFAULT_MAX_PAGES});
			try {
				const response = await fetch("/api/pull", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(data)
				});
				const payload = await response.json();
				result.textContent = JSON.stringify(payload, null, 2);
			} catch (error) {
				result.textContent = String(error);
			}
		});
	</script>
</body>
</html>`

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
	port,
	hostname: "0.0.0.0",
	async fetch(request) {
		const url = new URL(request.url)

		if (request.method === "GET" && url.pathname === "/health") {
			return json({ ok: true, service: "good-scrape" })
		}

		if (request.method === "GET" && url.pathname === "/") {
			return new Response(page(), {
				headers: { "content-type": "text/html; charset=utf-8" },
			})
		}

		if (request.method === "POST" && url.pathname === "/api/pull") {
			try {
				const input = await parseInput(request)
				const output = await scrape(input)
				return json(output)
			} catch (error) {
				return json({ error: error instanceof Error ? error.message : String(error) }, 400)
			}
		}

		return json({ error: "Not found" }, 404)
	},
})

process.stderr.write(`good-scrape listening on 0.0.0.0:${port}\n`)

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		closeBrowser().finally(() => process.exit(0))
	})
}
