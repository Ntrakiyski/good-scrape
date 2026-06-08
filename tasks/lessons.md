# Lessons

## 2026-06-08 - Do not mutate dependencies during checks

Mistake:
Ran `npm ci` in parallel with `bun run check`, causing TypeScript to lose access to installed type libraries while `node_modules` was being replaced.

Why it happened:
I treated dependency installation and validation as independent, but both read or mutate the same dependency tree.

Rule for next time:
Run package-manager installs and checks sequentially when they share `node_modules`, lockfiles, or generated dependency state. This includes verification installs such as `bun install --frozen-lockfile`.

Example check:
Finish `npm ci` or `bun install` first, then run `bun run check` in a separate step.
