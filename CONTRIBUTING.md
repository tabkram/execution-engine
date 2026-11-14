# Contributing to execution-engine

These rules apply only to this repository. Keep development rules here and deployment rules in [DEPLOYMENT.md](DEPLOYMENT.md).

## Scope

Follow the requested scope and preserve existing work. Analysis and review requests do not authorize fixes.
Commit, push or publish only when requested; a commit request does not require another confirmation when its scope is clear.

## Naming and attribution

Use task-based branch names, such as `feat/73-retry`, `fix/cache-expiration` or `docs/api-examples`.
Describe changes by their purpose and behavior in commit messages and pull requests.

## Development setup

Use **Node.js 24 or later and npm**. Install with `npm ci`; keep `package-lock.json` in sync with dependency changes.
The documentation has its own package and lockfile: use `npm ci --prefix docs` when working on the site.

## Code and public APIs

- Keep changes focused, reuse existing code and follow nearby conventions. Preserve behavior outside the requested change.
- Change source modules, not `dist/` or generated barrels. `npm run build` regenerates exports and compiles the package.
- For affected APIs, check both plain-function and decorator forms: arguments, return types, receiver scope, errors and timing.
- Cover features and bug fixes with meaningful `*.spec.ts` tests near the implementation, including the regression being fixed.
- Follow [ESLint](eslint.config.mjs) and [Prettier](.prettierrc); keep formatting changes scoped to the work.

## Validation

Choose checks that exercise the change. Reuse existing tests and distinguish new failures from pre-existing ones.

| Check | Command |
| --- | --- |
| Types | `npx --no-install tsc --noEmit` |
| Changed TypeScript files | `npx --no-install eslint <files>` |
| Targeted tests | `npm test -- --runTestsByPath <file.spec.ts> --runInBand` |
| Full test suite | `npm test -- --runInBand` |
| Package build and exports | `npm run build` |
| Documentation site | `npm --prefix docs run build` |

`npm run lint` applies `--fix` across `src/`; use targeted ESLint for checks and reviews.
The package build rewrites generated files. Neither command is a read-only review check.
Report the checks actually run and any remaining limits; do not claim compatibility from mocked behavior alone.

## Documentation

Document public APIs in source JSDoc and the relevant page under `docs/`. Keep examples consistent with the exported types,
defaults, units, return values and error behavior. Update `README.md` only when its overview or setup changes.
Keep explanations short and verify changed examples when practical. Build the site for changes to pages or navigation.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), following [commitlint.config.js](commitlint.config.js):

```text
type(scope): short summary

Explain the behavior change and why it is needed.
```

Write the summary in English, in the present tense, without a final period. The scope is optional and names the affected API or area.
A body of at least 20 characters is required except for `docs` commits. State breaking changes explicitly.
Keep one purpose per commit and let the existing hooks run. A message-only request does not authorize creating a commit.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for one-time OIDC setup and the release/canary workflows.
