let idx = 0

export class ProxyRotator {
	private proxies: string[]

	constructor(proxies: string[]) {
		this.proxies = proxies
	}

	get enabled(): boolean {
		return this.proxies.length > 0
	}

	next(): string | undefined {
		if (!this.enabled) return undefined
		const proxy = this.proxies[idx++ % this.proxies.length]
		return proxy
	}

	assign(request: { proxy?: string }): string | undefined {
		if (request.proxy) return request.proxy
		return this.next()
	}
}
