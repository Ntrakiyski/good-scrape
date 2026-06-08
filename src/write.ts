import { mkdir } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { Effect } from "effect"
import type { Page } from "./convert"

export const pathForUrl = (url: string): string => {
	const parsed = new URL(url)
	let p = parsed.pathname
	if (parsed.hash && parsed.hash.length > 1) {
		p = parsed.hash.replace(/^#\/?/, "/")
	}
	if (p.endsWith("/")) p += "index"
	p = p.replace(/\.html?$/, "").replace(/^\//, "")
	if (!p.endsWith(".md")) p += ".md"
	return p
}

const checkPathEscape = (outDir: string, full: string, label: string): void => {
	const rel = relative(resolve(outDir), resolve(full))
	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(`path escape: ${label}`)
	}
}

export const write = (page: Page, outDir: string) =>
	Effect.gen(function* () {
		const p = pathForUrl(page.url)
		const full = join(outDir, p)
		checkPathEscape(outDir, full, p)
		yield* Effect.tryPromise({
			try: () => mkdir(dirname(full), { recursive: true }),
			catch: () => new Error(`mkdir: ${full}`),
		})
		yield* Effect.tryPromise({
			try: () => Bun.write(full, page.markdown),
			catch: () => new Error(`write: ${full}`),
		})
		return full
	})

export const writeTo = (page: Page, outDir: string, relPath: string) =>
	Effect.gen(function* () {
		const full = join(outDir, relPath)
		checkPathEscape(outDir, full, relPath)
		yield* Effect.tryPromise({
			try: () => mkdir(dirname(full), { recursive: true }),
			catch: () => new Error(`mkdir: ${full}`),
		})
		yield* Effect.tryPromise({
			try: () => Bun.write(full, page.markdown),
			catch: () => new Error(`write: ${full}`),
		})
		return full
	})
