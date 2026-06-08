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

## 2026-06-08 - Verify package availability before documenting install commands

Mistake:
Left `npm install -g webpull-cli` in the README even though the package is not currently published on npm.

Why it happened:
I treated package metadata and publish intent as enough evidence for user-facing install instructions.

Rule for next time:
Before documenting an external package install path, verify the package is currently available in the registry or clearly label the command as future/pending.

Example check:
Run `npm view <package> name version --json` before adding or keeping `npm install` instructions.
