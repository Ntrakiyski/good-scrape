import { existsSync } from "node:fs"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"
import type { CheckpointData } from "./scheduler"

const CHECKPOINT_FILE = "checkpoint.json"
const TMP_SUFFIX = ".tmp"

export class CheckpointManager {
	private dir: string
	private interval: number
	private lastSave: number

	constructor(dir: string | undefined, interval = 300) {
		this.dir = dir ?? ""
		this.interval = interval * 1000
		this.lastSave = 0
	}

	get enabled(): boolean {
		return this.dir.length > 0
	}

	get isDue(): boolean {
		if (!this.enabled || this.interval === 0) return false
		return Date.now() - this.lastSave >= this.interval
	}

	private checkpointPath(): string {
		return join(this.dir, CHECKPOINT_FILE)
	}

	private tmpPath(): string {
		return this.checkpointPath() + TMP_SUFFIX
	}

	private validatePath(filePath: string): void {
		const rel = relative(this.dir, filePath)
		if (rel.startsWith("..") || rel.startsWith("/")) {
			throw new Error(`Path traversal detected: ${filePath}`)
		}
	}

	async save(data: CheckpointData): Promise<void> {
		if (!this.enabled) return

		if (!existsSync(this.dir)) {
			await mkdir(this.dir, { recursive: true })
		}

		const tmp = this.tmpPath()
		const dst = this.checkpointPath()
		this.validatePath(tmp)
		this.validatePath(dst)

		const json = JSON.stringify(data, null, 2)
		await writeFile(tmp, json, "utf-8")
		await rename(tmp, dst)
		this.lastSave = Date.now()
	}

	async load(): Promise<CheckpointData | null> {
		if (!this.enabled) return null

		const path = this.checkpointPath()
		if (!existsSync(path)) return null

		try {
			const raw = await readFile(path, "utf-8")
			return JSON.parse(raw) as CheckpointData
		} catch {
			return null
		}
	}

	async clear(): Promise<void> {
		const path = this.checkpointPath()
		if (existsSync(path)) {
			await unlink(path)
		}
	}

	async cleanup(): Promise<void> {
		await this.clear()
		const tmp = this.tmpPath()
		if (existsSync(tmp)) {
			await unlink(tmp)
		}
	}
}
