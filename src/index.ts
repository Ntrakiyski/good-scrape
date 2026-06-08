#!/usr/bin/env bun
import { mkdir } from "node:fs/promises"
import { cpus } from "node:os"
import { join, resolve } from "node:path"
import { Effect } from "effect"
import { frontmatter, productFrontmatter } from "./convert"
import { isSPAShell } from "./detect"
import { discover } from "./discover"
import { downloadImages } from "./download"
import { crawlWithEngine } from "./engine-cli"
import { buildProductUrlSet, slugFromUrl } from "./product"
import { closeBrowser } from "./renderer"
import { createUI } from "./ui"
import { pathForUrl, write, writeTo } from "./write"

const TERMINAL_SIZE_LIMIT = 50_000

interface Config {
	url: string
	out: string
	max: number
	format?: "json" | "md"
	proxies: string[]
	respectRobotsTxt: boolean
	cacheDir?: string
	ecommerce: boolean
}

type MediaRef = {
	url: string
	alt?: string
	type?: "image" | "video" | "source"
}

const mediaSection = (media: MediaRef[]): string => {
	if (media.length === 0) return ""
	return `\n\n---\n\n### Page Assets\n\n${media
		.map((item) => `- [${item.alt || (item.type === "video" ? "video" : item.url)}](${item.url})`)
		.join("\n")}`
}

const parseArgs = (args: string[]): Config => {
	if (!args.length || args.includes("-h") || args.includes("--help")) {
		console.log(`
  webpull-cli - Pull docs into markdown

  Usage:  webpull-cli <url> [options]

    -o, --out <dir>       Output directory (default: ./<hostname>)
    -m, --max <n>         Max pages (default: 500)
    -f, --format <fmt>    Output format: json or md (prints to terminal; writes to file if >50k chars)
    -p, --proxy <url>     Proxy URL (can repeat for rotation)
    --respect-robots      Respect robots.txt rules
    --cache <dir>         Dev mode cache directory
    --ecommerce           Ecommerce mode: products in subfolders with images
`)
		process.exit(0)
	}

	let raw = args[0]!
	if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`

	let url: URL
	try {
		url = new URL(raw)
	} catch {
		console.error(`Bad URL: ${args[0]}`)
		process.exit(1)
	}

	let out = `./${url.hostname}`
	let max = 500
	const proxies: string[] = []
	let respectRobotsTxt = false
	let cacheDir: string | undefined
	let ecommerce = false

	let format: Config["format"]

	for (let i = 1; i < args.length; i++) {
		const arg = args[i]
		const next = args[i + 1]
		if (("-o" === arg || "--out" === arg) && next) {
			out = next
			i++
		} else if (("-m" === arg || "--max" === arg) && next) {
			max = +next
			i++
		} else if (("-f" === arg || "--format" === arg) && next) {
			if (next === "json" || next === "md") {
				format = next
			} else {
				console.error(`Bad format: ${next} (use json or md)`)
				process.exit(1)
			}
			i++
		} else if (("-p" === arg || "--proxy" === arg) && next) {
			proxies.push(next)
			i++
		} else if ("--respect-robots" === arg) {
			respectRobotsTxt = true
		} else if ("--cache" === arg && next) {
			cacheDir = resolve(next)
			i++
		} else if ("--ecommerce" === arg) {
			ecommerce = true
		}
	}

	return { url: url.href, out: resolve(out), max, format, proxies, respectRobotsTxt, cacheDir, ecommerce }
}

const program = Effect.gen(function* () {
	const config = parseArgs(process.argv.slice(2))
	const t0 = performance.now()
	let concurrency = Math.max(8, cpus().length * 2)

	process.stderr.write(`\n  \x1b[1m⚡ webpull\x1b[0m \x1b[90m· discovering pages...\x1b[0m\n\n`)

	try {
		const urls = yield* discover(config.url, config.max)
		if (!urls.length) {
			process.stderr.write("  No pages found.\n")
			process.exit(1)
		}

		const sampleHtml = yield* Effect.tryPromise({
			try: () => fetch(config.url, { redirect: "follow" }).then((r) => r.text()),
			catch: () => new Error("Failed to detect SPA"),
		}).pipe(Effect.catchAll(() => Effect.succeed("")))
		const needsBrowser = isSPAShell(sampleHtml)
		if (needsBrowser) {
			concurrency = Math.min(concurrency, 4)
		}

		let productUrls = new Set<string>()
		if (config.ecommerce) {
			process.stderr.write("  \x1b[90mBuilding product URL set from sitemaps...\x1b[0m\n")
			productUrls = yield* Effect.tryPromise({
				try: () => buildProductUrlSet(config.url),
				catch: () => new Set<string>(),
			})
			process.stderr.write(`  \x1b[90mFound \x1b[1m${productUrls.size}\x1b[0m\x1b[90m product URLs\x1b[0m\n`)
		}

		const tDisc = performance.now()
		const total = urls.length
		const ui = createUI(config.url, config.out, concurrency, "engine")

		let ok = 0
		let err = 0
		let productCount = 0
		const recentFiles: string[] = []
		const pendingEffects: Effect.Effect<unknown, Error>[] = []
		let lastRender = 0

		const tick = () => {
			const now = performance.now()
			if (now - lastRender < 80) return
			lastRender = now
			ui.render({ total, ok, err, elapsed: (now - tDisc) / 1000, workerStates: [], recentFiles })
		}

		yield* Effect.tryPromise(() =>
			crawlWithEngine(urls, {
				concurrency,
				useBrowser: needsBrowser,
				proxies: config.proxies,
				respectRobotsTxt: config.respectRobotsTxt,
				cacheDir: config.cacheDir,
				onItem: (data) => {
					ok++
					const { url: finalUrl, title, markdown, media } = data
					const isProduct = config.ecommerce && productUrls.has(finalUrl.replace(/\/$/, ""))

					if (isProduct) {
						productCount++
						const slug = slugFromUrl(finalUrl)
						const mdPath = `products/${slug}/${slug}.md`
						const productMarkdown = productFrontmatter(title, finalUrl, slug) + markdown + mediaSection(media)
						const prodPage = { url: finalUrl, title, markdown: productMarkdown }

						if (config.format && productMarkdown.length <= TERMINAL_SIZE_LIMIT) {
							if (config.format === "json") {
								process.stdout.write(`${JSON.stringify({ title, url: finalUrl, content: markdown, media })}\n`)
							} else {
								process.stdout.write(`${prodPage.markdown}\n\n---\n\n`)
							}
						} else {
							recentFiles.push(mdPath)
							const writeEffect = config.format
								? writeTo(prodPage, config.out, mdPath).pipe(
										Effect.map((path) => {
											process.stderr.write(`  \x1b[90m→\x1b[0m ${path} \x1b[33m(file too large for terminal)\x1b[0m\n`)
											return path
										}),
									)
								: writeTo(prodPage, config.out, mdPath)
							pendingEffects.push(writeEffect)

							const imgUrls = media.filter((m) => m.type === "image" || !m.type).map((m) => m.url)
							if (imgUrls.length > 0) {
								const imagesDir = join(config.out, "products", slug, "images")
								pendingEffects.push(
									Effect.tryPromise({
										try: () => downloadImages(imgUrls, imagesDir),
										catch: (cause) => new Error(`download images for ${finalUrl}: ${cause}`),
									}),
								)
							}
						}
					} else {
						const fullMd = frontmatter(title, finalUrl) + markdown
						const pageWithAssets = {
							url: finalUrl,
							title,
							markdown: fullMd + mediaSection(media),
						}

						const filepath = pathForUrl(finalUrl)

						if (config.format && pageWithAssets.markdown.length <= TERMINAL_SIZE_LIMIT) {
							if (config.format === "json") {
								process.stdout.write(`${JSON.stringify({ title, url: finalUrl, content: markdown, media })}\n`)
							} else {
								process.stdout.write(`${pageWithAssets.markdown}\n\n---\n\n`)
							}
						} else {
							recentFiles.push(filepath)
							if (config.format) {
								pendingEffects.push(
									write(pageWithAssets, config.out).pipe(
										Effect.map((path) => {
											process.stderr.write(`  \x1b[90m→\x1b[0m ${path} \x1b[33m(file too large for terminal)\x1b[0m\n`)
											return path
										}),
									),
								)
							} else {
								pendingEffects.push(write(pageWithAssets, config.out))
							}
						}
					}
					tick()
				},
				onError: (url, error) => {
					err++
					process.stderr.write(`  \x1b[31m✗\x1b[0m ${url} \x1b[90m${error}\x1b[0m\n`)
					tick()
				},
			}),
		)

		if (pendingEffects.length > 0) {
			yield* Effect.all(pendingEffects, { concurrency: 8 })
		}

		if (config.ecommerce) {
			const summary = [
				"# Site Summary",
				"",
				`- **Source**: ${config.url}`,
				`- **Total products**: ${productCount}`,
				`- **Total pages**: ${ok}`,
				`- **Crawled at**: ${new Date().toISOString()}`,
				"",
			].join("\n")
			const summaryPath = join(config.out, "_index.md")
			yield* Effect.tryPromise({
				try: async () => {
					await mkdir(config.out, { recursive: true })
					await Bun.write(summaryPath, summary)
				},
				catch: () => new Error("Failed to write summary"),
			})
		}

		ui.render({ total, ok, err, elapsed: (performance.now() - tDisc) / 1000, workerStates: [], recentFiles })
		ui.finish()

		const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
		const pps = Math.round(ok / ((performance.now() - tDisc) / 1000))

		process.stderr.write(
			`\n  \x1b[32m\x1b[1mDone!\x1b[0m ${ok} pages in ${elapsed}s \x1b[90m(${pps} pages/sec)\x1b[0m\n`,
		)
		if (err) process.stderr.write(`  \x1b[31m${err} failed\x1b[0m\n`)
		process.stderr.write("\n")
	} finally {
		// engine-cli handles browser session cleanup internally
	}
})

Effect.runPromise(program)
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => closeBrowser())
