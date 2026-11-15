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

For a PR with `deploy`, successful CI is followed by **Deprecate previous canaries**, then **Publish**. Only that PR's
earlier canaries are deprecated, across base versions and dist-tags; the exact version planned for the new deployment
is excluded. Other PRs' canaries are untouched. If deprecation fails, Publish is skipped. The Publish job itself only publishes.

The separate **Deprecate** job deprecates all of a PR's canaries when it is closed, including after a merge,
independently of its branch name and labels. Workflows never delete versions: deprecated versions remain downloadable
and display `Obsolete prerelease. Use execution-engine@latest for production.`

For manual deprecation, open **Actions → Deprecate from NPM → Run workflow** on `main` and enter exact prerelease
versions, comma-separated. Stable versions, tags and ranges are rejected. Versions already carrying the expected
message require no additional write. Deprecation is verified against fresh registry metadata, allowing three checks
two seconds apart. A zero exit code from npm alone is not sufficient; unresolved failures fail the job.

Deprecation requires `NPM_TOKEN` scoped to `execution-engine` with read/write access and **Bypass 2FA** enabled.
The action first checks authentication with `npm whoami`. When the token expires, replace it in
**Settings → Secrets and variables → Actions → NPM_TOKEN** in GitHub. Publishing continues to use OIDC separately.

## Delete a prerelease manually with 2FA

npm rejects unpublish requests authenticated with a **Bypass 2FA** token. Use an interactive npm login and validate
the 2FA challenge instead. Deletion is still subject to the [npm unpublish policy](https://docs.npmjs.com/policies/unpublish/).

1. In a terminal, log in to the package owner's account and complete the browser authentication:

   ```bash
   npm login --registry=https://registry.npmjs.org/
   ```

2. Delete one exact prerelease version, replacing the example with the version you intend to remove. Complete the
   2FA challenge requested by npm. Run without `sudo`; `--dry-run=false` explicitly disables simulation.

   ```bash
   npm unpublish execution-engine@5.0.0-canary.78.4f96394 --registry=https://registry.npmjs.org/ --dry-run=false --loglevel=http
   ```

3. Verify that the registry no longer serves that version:

   ```bash
   npm view execution-engine@5.0.0-canary.78.4f96394 version --registry=https://registry.npmjs.org/ --prefer-online
   ```

   Expect `E404` once the removal has propagated. The `- execution-engine@...` output alone does not prove deletion;
   if the version remains available, inspect the unpublish HTTP logs. The npm website can take longer to update.

An unpublished version number cannot be reused. See the [registry authentication rules](https://api-docs.npmjs.com/)
and [npm unpublish reference](https://docs.npmjs.com/cli/v11/commands/npm-unpublish/).

## Documentation site

The `Deploy docs` workflow publishes the site to [GitHub Pages](https://tabkram.github.io/execution-engine/).
It runs on pushes to `main` that change `docs/`, `DEPLOYMENT.md` or the docs workflow, and supports manual dispatch.
The `github-pages` environment controls this deployment. The site includes this file so publishing instructions have one source.
