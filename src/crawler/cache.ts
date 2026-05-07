import { existsSync } from "node:fs"
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises"
import { join, relative } from "node:path"
import { createHash } from "node:crypto"
import type { CrawlResponse } from "./types"

const CACHE_VERSION = 1

interface CacheEntry {
	version: number
	url: string
	status: number
	headers: Record<string, string>
	bodyBase64: string
	timestamp: number
}

export class DevCache {
	private dir: string
	private ttl: number

	constructor(dir: string, ttlMs = 86_400_000) {
		this.dir = dir
		this.ttl = ttlMs
	}

	get enabled(): boolean {
		return this.dir.length > 0
	}

	private keyPath(fingerprint: string): string {
		const h = createHash("sha256").update(fingerprint).digest("hex")
		return join(this.dir, h.slice(0, 2), h)
	}

	private validatePath(filePath: string): void {
		const rel = relative(this.dir, filePath)
		if (rel.startsWith("..") || rel.startsWith("/")) {
			throw new Error(`Path traversal detected: ${filePath}`)
		}
	}

	async get(requestFingerprint: string): Promise<CrawlResponse | null> {
		if (!this.enabled) return null

		const path = this.keyPath(requestFingerprint)
		if (!existsSync(path)) return null

		try {
			const raw = await readFile(path, "utf-8")
			const entry: CacheEntry = JSON.parse(raw)

			if (entry.version !== CACHE_VERSION) return null

			if (Date.now() - entry.timestamp > this.ttl) {
				await unlink(path).catch(() => {})
				return null
			}

			const body = Uint8Array.from(atob(entry.bodyBase64), (c) => c.charCodeAt(0))
			const bodyText = new TextDecoder().decode(body)

			return {
				url: entry.url,
				status: entry.status,
				headers: entry.headers,
				body,
				request: null as unknown as CrawlResponse["request"],
				text: () => bodyText,
			}
		} catch {
			return null
		}
	}

	async set(fingerprint: string, response: CrawlResponse): Promise<void> {
		if (!this.enabled) return

		const path = this.keyPath(fingerprint)
		this.validatePath(path)

		if (!existsSync(this.dir)) {
			await mkdir(this.dir, { recursive: true })
		}

		const parts = path.split("/")
		const subdir = parts.slice(0, -1).join("/")
		if (!existsSync(subdir)) {
			await mkdir(subdir, { recursive: true })
		}

		const entry: CacheEntry = {
			version: CACHE_VERSION,
			url: response.url,
			status: response.status,
			headers: response.headers,
			bodyBase64: btoa(String.fromCharCode(...new Uint8Array(response.body))),
			timestamp: Date.now(),
		}

		const tmp = path + ".tmp"
		await writeFile(tmp, JSON.stringify(entry), "utf-8")
		await rename(tmp, path)
	}

	async clear(): Promise<void> {
		if (!this.enabled || !existsSync(this.dir)) return
		await unlink(this.dir).catch(() => {})
	}
}
