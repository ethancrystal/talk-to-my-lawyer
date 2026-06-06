# Self-hosted GitHub Actions runner

Run `.github/workflows/ci.yml` on your own hardware. Self-hosted runner minutes
are **not billed**, so PR status checks keep working even when GitHub-hosted
runners are unavailable (account blocked / out of included minutes).

> Prefer zero infrastructure? `docs/CI_DOCKER.md` runs the same gate locally with
> one command and **none** of the security caveats below. Use a self-hosted
> runner only when you specifically want the checks to report back on the PR.

---

## ⚠️ Security: this repository is PUBLIC

GitHub [strongly advises against](https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security)
self-hosted runners on public repos: anyone can fork the repo and open a pull
request whose workflow would execute **arbitrary code on your runner machine**.

This setup ships two mitigations — **keep both in place**:

1. **Fork-PR guard in `ci.yml`.** Each job has:
   ```yaml
   if: >-
     github.event_name != 'pull_request' ||
     github.event.pull_request.head.repo.full_name == github.repository
   ```
   so jobs run only for pushes and **same-repo** PRs. Pull requests from forks
   are skipped on the self-hosted runner. (Because this workflow uses the
   `pull_request` trigger — not `pull_request_target` — a fork cannot alter this
   guard; the base branch's workflow is what runs.)

2. **GitHub approval setting.** Go to **repo → Settings → Actions → General →
   Fork pull request workflows from outside collaborators** and select
   **“Require approval for all external contributors”** (at minimum). Belt and
   braces with the guard above.

Safest of all: **make the repo private** (Settings → General → Danger Zone →
Change visibility), which removes the fork-PR attack vector entirely.

---

## One-time setup

```bash
# 1. Configure
cp .env.runner.example .env.runner
#    edit .env.runner → set GH_PAT (classic PAT with `repo` scope,
#    or fine-grained PAT with Administration: Read & write on this repo)

# 2. Build + start the runner (Docker required)
docker compose -f docker-compose.runner.yml up -d --build

# 3. Verify: repo → Settings → Actions → Runners → shows "ttml-…" as Idle
```

Re-run any workflow (or push a commit) and `build-and-test` will execute on your
machine. Watch logs with:

```bash
docker compose -f docker-compose.runner.yml logs -f
```

Stop and cleanly deregister:

```bash
docker compose -f docker-compose.runner.yml down
```

---

## How it works

| File | Purpose |
| ---- | ------- |
| `.github/actions-runner/Dockerfile` | Ubuntu 24.04 image with git + Node build deps; downloads the latest `actions/runner`. |
| `.github/actions-runner/entrypoint.sh` | Exchanges `GH_PAT` for a registration token, registers (`config.sh`), runs (`run.sh`), and deregisters on stop. |
| `docker-compose.runner.yml` | Builds/runs the runner with `restart: unless-stopped` and a persistent `_work` volume. |
| `.env.runner.example` | Config template (copy to gitignored `.env.runner`). |

The runner registers with labels `self-hosted,linux,x64`, which is what the
workflow's `runs-on: [self-hosted, linux, x64]` targets.

---

## Operational notes

- **Merge order:** merge the `ci.yml` change only **after** a runner is online,
  otherwise `build-and-test` will queue indefinitely waiting for a runner.
- **Reverting to GitHub-hosted:** set `runs-on: ubuntu-latest` and remove the
  `if:` guard in `ci.yml`.
- **Ephemeral mode:** set `RUNNER_EPHEMERAL=true` in `.env.runner` for a fresh
  runner per job (cleanest isolation; compose restarts it automatically).
- **Pre-existing test failures:** `pnpm revalidate` runs the full vitest suite,
  which currently has unrelated failures — so `build-and-test` may still be red
  on the test step until those are fixed (same as GitHub-hosted would be).
- **Scheduled workflows** (`citation-audit.yml`, `sync-blog.yml`) still use
  `ubuntu-latest`; leave them unless you also want those on self-hosted.
