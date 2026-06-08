const PRODUCT_SITEMAP_RE = /\/product-sitemap\d*\.xml$/

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
	try {
		const res = await fetch(sitemapUrl, { redirect: "follow" })
		if (!res.ok) return []
		const text = await res.text()
		return [...text.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)].map((m) => (m[1] ?? "").trim()).filter(Boolean)
	} catch {
		return []
	}
}

async function fetchSitemapIndex(url: string): Promise<string[]> {
	try {
		const res = await fetch(url, { redirect: "follow" })
		if (!res.ok) return []
		const text = await res.text()
		return [...text.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)].map((m) => (m[1] ?? "").trim()).filter(Boolean)
	} catch {
		return []
	}
}

export async function buildProductUrlSet(baseUrl: string): Promise<Set<string>> {
	const origin = new URL(baseUrl).origin
	const indexUrl = `${origin}/sitemap_index.xml`
	const childSitemaps = await fetchSitemapIndex(indexUrl)

	const productUrls = new Set<string>()

	for (const sitemap of childSitemaps) {
		if (PRODUCT_SITEMAP_RE.test(sitemap)) {
			const urls = await fetchSitemapUrls(sitemap)
			for (const url of urls) {
				productUrls.add(url.replace(/\/$/, ""))
			}
		}
	}

	return productUrls
}

export function slugFromUrl(url: string): string {
	return new URL(url).pathname.replace(/\/$/, "").split("/").filter(Boolean).pop() || "product"
}
