import { type Browser, type BrowserContext, chromium } from "playwright"
import type { Session } from "./session"
import type { CrawlRequest, CrawlResponse } from "./types"

export class BrowserSession implements Session {
	readonly type = "browser"
	readonly name: string
	private browser: Browser | null = null
	private context: BrowserContext | null = null

	constructor(name = "browser") {
		this.name = name
	}

	async start(): Promise<void> {
		if (this.browser) return
		try {
			this.browser = await chromium.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
			})
			this.context = await this.browser.newContext({
				userAgent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			})
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			if (msg.includes("Executable doesn't exist") || msg.includes("browserType.launch")) {
				process.stderr.write("\n  \x1b[31mError: Chromium not found. Run: npx playwright install chromium\x1b[0m\n\n")
			}
			throw err
		}
	}

	async close(): Promise<void> {
		if (this.context) {
			await this.context.close()
			this.context = null
		}
		if (this.browser) {
			await this.browser.close()
			this.browser = null
		}
	}

	async fetch(request: CrawlRequest): Promise<CrawlResponse> {
		if (!this.context) await this.start()

		const timeout = (request.meta?.timeout as number) ?? 15000
		const page = await this.context!.newPage()

		try {
			await page.goto(request.url, { waitUntil: "networkidle", timeout })

			await page
				.waitForSelector("main, article, [class*='content'], [class*='docs'], h1, h2", { timeout: 5000 })
				.catch(() => {})

			await page.waitForTimeout(500)

			const html = await page.content()
			const finalUrl = page.url()
			const encoder = new TextEncoder()
			const body = encoder.encode(html)

			return {
				url: finalUrl,
				status: 200,
				headers: {},
				body,
				request,
				text(): string {
					return html
				},
			}
		} catch {
			return {
				url: request.url,
				status: 0,
				headers: {},
				body: new Uint8Array(0),
				request,
				text: () => "",
			}
		} finally {
			await page.close()
		}
	}
}
