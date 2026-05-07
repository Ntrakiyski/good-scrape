interface RobotRule {
	userAgent: string
	allow: string[]
	disallow: string[]
	crawlDelay: number
}

export interface RobotsTxtInfo {
	rules: RobotRule[]
	sitemaps: string[]
	defaultDelay: number
}

export class RobotsTxt {
	private rules: RobotRule[]
	readonly sitemaps: string[]
	readonly defaultDelay: number
	private domain: string

	constructor(text: string, domain: string) {
		this.domain = domain
		this.rules = []
		this.sitemaps = []
		this.defaultDelay = 0

		const parsed = this.parse(text)
		this.rules = parsed.rules
		this.sitemaps = parsed.sitemaps
	}

	isAllowed(url: string, userAgent = "*"): boolean {
		try {
			const path = new URL(url).pathname

			const matchedRule = this.findRule(userAgent)
			if (!matchedRule) return true

			if (matchedRule.allow.some((p) => this.matchPath(p, path))) return true
			if (matchedRule.disallow.some((p) => this.matchPath(p, path))) return false

			return true
		} catch {
			return true
		}
	}

	getCrawlDelay(userAgent = "*"): number {
		const matchedRule = this.findRule(userAgent)
		return matchedRule?.crawlDelay ?? this.defaultDelay
	}

	private findRule(userAgent: string): RobotRule | undefined {
		const exact = this.rules.find((r) => r.userAgent === userAgent)
		if (exact) return exact

		if (userAgent !== "*") {
			const agentPrefix = userAgent.split("/")[0]
			const prefix = this.rules.find((r) => r.userAgent === agentPrefix)
			if (prefix) return prefix
		}

		return this.rules.find((r) => r.userAgent === "*")
	}

	private matchPath(pattern: string, path: string): boolean {
		if (pattern === "/") return path === "/"

		const regexStr = pattern
			.replace(/[.+^${}()|[\]\\]/g, "\\$&")
			.replace(/\*/g, ".*")
			.replace(/\?$/, "?")
		try {
			return new RegExp(`^${regexStr}`).test(path)
		} catch {
			return path.startsWith(pattern.replace(/\*$/, ""))
		}
	}

	private parse(text: string): { rules: RobotRule[]; sitemaps: string[] } {
		const rules: RobotRule[] = []
		const sitemaps: string[] = []
		let current: RobotRule | null = null

		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith("#")) continue

			const colonIdx = trimmed.indexOf(":")
			if (colonIdx === -1) continue

			const field = trimmed.slice(0, colonIdx).trim().toLowerCase()
			const value = trimmed.slice(colonIdx + 1).trim()

			if (field === "user-agent") {
				if (current && current.userAgent) {
					rules.push(current)
				}
				current = { userAgent: value, allow: [], disallow: [], crawlDelay: 0 }
			} else if (field === "disallow") {
				if (current) current.disallow.push(value || "/")
			} else if (field === "allow") {
				if (current) current.allow.push(value || "/")
			} else if (field === "crawl-delay") {
				const delay = Number.parseFloat(value)
				if (!Number.isNaN(delay) && current) {
					current.crawlDelay = delay
				}
			} else if (field === "sitemap") {
				if (value) sitemaps.push(value)
			}
		}

		if (current && current.userAgent) {
			rules.push(current)
		}

		return { rules, sitemaps }
	}
}
