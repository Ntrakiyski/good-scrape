const G = "\x1b[32m"
const Y = "\x1b[33m"
const D = "\x1b[90m"
const B = "\x1b[1m"
const RST = "\x1b[0m"

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const CLEAR = "\x1b[2K"
const UP5 = "\x1b[5F"

export interface UIState {
	total: number
	ok: number
	err: number
	elapsed: number
	workerStates: ("idle" | "busy")[]
	recentFiles: string[]
}

export function createUI(url: string, out: string, concurrency: number, mode: "workers" | "engine" = "workers") {
	process.stderr.write(`  ${B}⚡ webpull${RST} ${D}·${RST} ${Y}${concurrency}${RST} ${D}${mode}${RST}\n`)
	process.stderr.write(`  ${D}${url} → ${out}${RST}\n\n`)

	// Reserve 5 lines
	process.stderr.write("\n\n\n\n\n")

	let frame = 0

	const render = (state: UIState) => {
		frame++
		const cols = process.stderr.columns || 80
		const pct = Math.round(((state.ok + state.err) / state.total) * 100)
		const pps = state.elapsed > 0 ? Math.round(state.ok / state.elapsed) : 0
		const spin = state.workerStates.some((s) => s === "busy")
			? `${Y}${SPINNER[frame % SPINNER.length]}${RST}`
			: `${G}✓${RST}`

		// Status line — dots for workers, activity indicator for engine
		const hasActivity =
			state.workerStates.length > 0 ? state.workerStates.some((s) => s === "busy") : state.ok + state.err < state.total
		const statusLine = hasActivity
			? `${CLEAR}  ${Y}●${RST} ${D}processing...${RST}`
			: `${CLEAR}  ${G}●${RST} ${D}done${RST}`

		// Progress bar
		const barWidth = Math.max(0, Math.min(20, cols - 35))
		const frac = state.total > 0 ? (state.ok + state.err) / state.total : 0
		const filled = Math.round(frac * barWidth)
		const bar =
			barWidth > 0
				? `${G}${"█".repeat(filled)}${RST}${D}${"░".repeat(barWidth - filled)}${RST}`
				: `${G}${"█".repeat(filled)}${RST}`

		// Recent files — last 3, truncated
		const maxFileLen = cols - 8
		const files: string[] = []
		for (let i = Math.max(0, state.recentFiles.length - 3); i < state.recentFiles.length; i++) {
			const f = state.recentFiles[i]!
			const display = f.length > maxFileLen ? `…${f.slice(-maxFileLen + 1)}` : f
			files.push(`${CLEAR}  ${D}├─${RST} ${G}✓${RST} ${display}`)
		}
		while (files.length < 3) files.push(`${CLEAR}  ${D}│${RST}`)

		const progressLine = `${CLEAR}  ${spin} ${bar} ${B}${pct}%${RST} ${D}${state.ok}/${state.total}${RST} ${D}·${RST} ${Y}${pps}${RST}${D}p/s${RST} ${D}·${RST} ${D}${state.elapsed.toFixed(1)}s${RST}`

		// Single atomic write: move up 5, rewrite all 5 lines
		process.stderr.write(`${UP5}${statusLine}\n${files[0]}\n${files[1]}\n${files[2]}\n${progressLine}\n`)
	}

	const finish = () => {}

	return { render, finish }
}
