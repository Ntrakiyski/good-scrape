import { mkdir, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"

const IMAGE_TIMEOUT = 15_000

function getImageFilename(url: string): string {
	try {
		const u = new URL(url)
		const pathname = u.pathname
		const segments = pathname.split("/")
		let name = segments[segments.length - 1] || ""
		if (!name.includes(".")) name = "image.jpg"
		name = name.split("?")[0] || ""
		const ext = extname(name).toLowerCase()
		const base = name.slice(0, -ext.length)
		const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "")
		return safe ? `${safe}${ext}` : `image${ext}`
	} catch {
		return `image_${Date.now()}.jpg`
	}
}

export async function downloadImage(url: string, destDir: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(IMAGE_TIMEOUT),
		})
		if (!response.ok) return null
		const buffer = await response.arrayBuffer()
		const filename = getImageFilename(url)
		const dest = join(destDir, filename)
		await mkdir(destDir, { recursive: true })
		await writeFile(dest, new Uint8Array(buffer))
		return filename
	} catch {
		return null
	}
}

export async function downloadImages(urls: string[], destDir: string): Promise<string[]> {
	const results = await Promise.allSettled(urls.map((url) => downloadImage(url, destDir)))
	return results
		.filter((r) => r.status === "fulfilled" && r.value !== null)
		.map((r) => (r as PromiseFulfilledResult<string>).value)
}
