# Deployment

Publishing uses GitHub Actions OIDC instead of a long-lived npm publish token. The workflows use Node.js 24 and npm 11,
which supports trusted publishing without changing to npm 12's installation defaults.

## One-time npm setup

Open the [execution-engine package](https://www.npmjs.com/package/execution-engine) settings and add two GitHub Actions
trusted publisher connections. For both, use owner **tabkram**, repository **execution-engine**, and enable **Allow npm publish**.
Stage-only permission would require human approval for each version.

| Purpose | Workflow filename | Environment |
| --- | --- | --- |
| Releases | `publish.yml` | Leave blank |
| PR canaries | `pull-request.yml` | `canary` |

Enter only the workflow filename, not its path. The names must match exactly.
Complete the first publish within two days of creating each connection; otherwise recreate the expired connection.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for setup and troubleshooting.

## Releases

1. Prepare the version using the existing release workflow, or commit the intended package version.
2. Publish a GitHub Release for its tag, such as `v5.0.0`.
3. `publish.yml` checks out that tag, verifies it matches `package.json`, runs tests, builds and publishes automatically.

Prereleases use the `next` npm tag; normal releases use `latest`. No `NPM_TOKEN` is passed to publishing.

For an existing release whose publish failed, first merge the corrected workflow to `main`. Then open
**Actions → Publish to NPM → Run workflow**, choose `main`, and enter the existing tag, for example `v5.0.0`.
Rerunning the old failed job uses its old workflow revision and does not pick up the fix.
Do not retry a version that is already published: npm versions are immutable.

## PR canaries

Add the `deploy` label to a PR targeting `main` to run CI and publish a canary, including when the label is added
after the initial checks. Eligible branch prefixes are `feat/`, `feature/`, `fix/` and `ci/`. Adding other labels
does not trigger the canary jobs. Subsequent commits and reopened PRs also publish when the label is present.
Only branches in this repository can publish; fork PRs still run CI. Canary publication uses the second trusted
publisher connection and the `canary` npm tag.

Publishing a PR canary works with OIDC; deleting it on merge is a separate operation.
OIDC does not support `npm unpublish`, and npm rejects unpublish requests authenticated with bypass-2FA granular tokens.
Actual deletion requires interactive 2FA and must satisfy the [npm unpublish policy](https://docs.npmjs.com/policies/unpublish/).
See the [registry authentication rules](https://github.com/npm/api-documentation/blob/main/api/base.yaml).

The legacy cleanup steps still attempt token authentication when `NPM_TOKEN` is present, but automatic deletion is not guaranteed.
They currently search dist-tags rather than all published versions, so older untagged canaries can also be missed.
A missing token or cleanup failure does not block a new canary. The manual unpublish workflow has the same authentication limit.

For automatic preview retirement, a possible next step is a tag per PR, such as `pr-123`, removed when the PR closes.
This requires npm 11.21.0 or later in the 11.x line and **Allow npm dist-tag** on the matching trusted publisher.
That permission and per-PR tag cleanup are not configured by this migration. Removing a tag leaves exact versions installable;
it is not an unpublish. See [dist-tags with OIDC](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

## Documentation site

The `Deploy docs` workflow publishes the site to [GitHub Pages](https://tabkram.github.io/execution-engine/).
It runs on pushes to `main` that change `docs/`, `DEPLOYMENT.md` or the docs workflow, and supports manual dispatch.
The `github-pages` environment controls this deployment. The site includes this file so publishing instructions have one source.
