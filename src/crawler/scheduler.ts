import { CrawlRequest } from "./types"

export interface CheckpointData {
	requests: SerializedRequest[]
	seen: string[]
}

export interface SerializedRequest {
	url: string
	priority: number
	sid: string
	method: string
	headers: Record<string, string>
	body: string | null
	dontFilter: boolean
	retryCount: number
	maxRetries: number
	meta: Record<string, unknown>
	proxy?: string
	callback: string
	fingerprint: string
}

export class Scheduler {
	private heap: CrawlRequest[] = []
	private seen: Set<string> = new Set()
	private size = 0

	async enqueue(request: CrawlRequest): Promise<boolean> {
		request.computeFingerprint()

		if (!request.dontFilter && this.seen.has(request.fingerprint)) {
			return false
		}

		this.seen.add(request.fingerprint)
		this.heap.push(request)
		this.bubbleUp(this.size)
		this.size++
		return true
	}

	async dequeue(): Promise<CrawlRequest> {
		if (this.size === 0) throw new Error("Scheduler is empty")
		const top = this.heap[0]!
		const last = this.heap.pop()!
		this.size--
		if (this.size > 0) {
			this.heap[0] = last
			this.sinkDown(0)
		}
		return top
	}

	peek(): CrawlRequest | undefined {
		return this.heap[0]
	}

	get length(): number {
		return this.size
	}

	get empty(): boolean {
		return this.size === 0
	}

	snapshot(): CheckpointData {
		const sorted = [...this.heap].sort((a, b) => b.priority - a.priority || a.id - b.id)
		return {
			requests: sorted.map((r) => ({
				url: r.url,
				priority: r.priority,
				sid: r.sid,
				method: r.method,
				headers: { ...r.headers },
				body: r.body ? String(r.body) : null,
				dontFilter: r.dontFilter,
				retryCount: r.retryCount,
				maxRetries: r.maxRetries,
				meta: { ...r.meta },
				callback: r.callback,
				fingerprint: r.fingerprint,
			})),
			seen: [...this.seen],
		}
	}

	restore(data: CheckpointData): void {
		this.heap = []
		this.seen = new Set(data.seen)
		this.size = 0
		for (const s of data.requests) {
			const req = new CrawlRequest({
				url: s.url,
				priority: s.priority,
				sid: s.sid,
				method: s.method as "GET" | "POST" | "PUT" | "DELETE",
				headers: s.headers,
				body: s.body ?? undefined,
				dontFilter: s.dontFilter,
				retryCount: s.retryCount,
				maxRetries: s.maxRetries,
				meta: s.meta,
				callback: s.callback,
			})
			req.fingerprint = s.fingerprint
			this.heap.push(req)
			this.bubbleUp(this.size)
			this.size++
		}
	}

	private parent(idx: number): number {
		return (idx - 1) >> 1
	}

	private left(idx: number): number {
		return (idx << 1) + 1
	}

	private right(idx: number): number {
		return (idx << 1) + 2
	}

	private bubbleUp(idx: number): void {
		while (idx > 0) {
			const p = this.parent(idx)
			if (this.compare(this.heap[idx]!, this.heap[p]!) <= 0) break
			;[this.heap[idx], this.heap[p]] = [this.heap[p]!, this.heap[idx]!]
			idx = p
		}
	}

	private sinkDown(idx: number): void {
		while (true) {
			let largest = idx
			const l = this.left(idx)
			const r = this.right(idx)
			if (l < this.size && this.compare(this.heap[l]!, this.heap[largest]!) > 0) largest = l
			if (r < this.size && this.compare(this.heap[r]!, this.heap[largest]!) > 0) largest = r
			if (largest === idx) break
			;[this.heap[idx], this.heap[largest]] = [this.heap[largest]!, this.heap[idx]!]
			idx = largest
		}
	}

	private compare(a: CrawlRequest, b: CrawlRequest): number {
		if (a.priority !== b.priority) return a.priority - b.priority
		return b.id - a.id
	}
}
