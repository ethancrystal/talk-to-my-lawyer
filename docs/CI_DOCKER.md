# Running CI in Docker (no GitHub Actions billing)

When GitHub Actions is unavailable (e.g. the account is blocked or out of
runner minutes), you can run the exact same validation gate locally in Docker.
This reproduces the `build-and-test` job from
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

```
pnpm install --frozen-lockfile → pnpm check → pnpm test → pnpm build   (== pnpm revalidate)
```

## Quick start

```bash
# Full gate (check + test + build) — same as GitHub's build-and-test job
scripts/ci-docker.sh

# Or run a single stage:
scripts/ci-docker.sh check    # tsc --noEmit
scripts/ci-docker.sh test     # vitest run
scripts/ci-docker.sh build    # vite + esbuild bundles
```

A non-zero exit means the gate failed — exactly like CI. The wrapper just calls:

```bash
docker build -f Dockerfile.ci --target <stage> .
```

so you can run that directly too.

## Files

| File | Purpose |
| ---- | ------- |
| `Dockerfile.ci` | Multi-stage CI image. Targets: `check`, `test`, `build`, `revalidate` (default). |
| `Dockerfile.ci.dockerignore` | Build-context ignore that **keeps** `*.test.ts` and `*.md` (the default `.dockerignore` strips tests). BuildKit selects it automatically for `-f Dockerfile.ci`. |
| `scripts/ci-docker.sh` | One-command wrapper around `docker build`. |

## Notes & caveats

- **pnpm is pinned to 10.4.1** (the repo's `packageManager`), because `.npmrc`
  sets `package-manager-strict=true`.
- **No Chromium is installed.** `scripts/prerender.ts` degrades gracefully when
  puppeteer can't launch, so `pnpm build` still succeeds; the prerender step is
  simply skipped (the SPA routes still serve at runtime).
- **Lockfile drift:** the image installs with `--frozen-lockfile` to match
  GitHub. If `pnpm-lock.yaml` has drifted from `package.json` the install fails
  on purpose. To unblock a local run:
  ```bash
  PNPM_INSTALL_FLAGS=--no-frozen-lockfile scripts/ci-docker.sh
  ```
  (then commit the regenerated lockfile so the gate is reproducible again).
- **The `test` stage runs the full vitest suite.** If there are pre-existing
  failures unrelated to your change, `test`/`revalidate` will be red; use
  `scripts/ci-docker.sh check` and `scripts/ci-docker.sh build` to validate the
  rest while those are addressed separately.

## Alternative: self-hosted GitHub Actions runner

If you'd rather keep using `.github/workflows/ci.yml` as-is (PR status checks,
etc.) without GitHub-hosted minutes, register a **self-hosted runner** — runner
minutes on self-hosted machines are free regardless of plan. The official
runner ships as a container image; point it at this repo and label it
`self-hosted`, then change `runs-on: ubuntu-latest` to
`runs-on: [self-hosted, linux]`. This is more setup than the local Docker gate
above but restores PR check integration. (Note: if the account itself is
*blocked* rather than just out of minutes, resolve the block first.)
