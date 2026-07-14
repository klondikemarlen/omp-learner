# OMP Learner

OMP Learner is an independent, non-blocking watchdog for explicit durable feedback and project-domain knowledge. It turns high-confidence findings into deduplicated GitHub issues in its fixed learner repository or one configured knowledge-base repository for human review.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

## v1 support boundary

v1 is an independent watchdog with an issue-first, human-review workflow; it is not a second advisor or an interactive candidate-review UI. Its stable lifecycle commands are `/learner setup`, `/learner off`, and `/learner status`.

After each completed watchdog run, OMP displays a redacted, bounded `Learner audit` card in the primary transcript. It records either the single inferred learning or that no durable learning was inferred; it is audit output, not a second advisor turn.

The watchdog files learner-local guidance against `klondikemarlen/omp-learner` and eligible shared guidance against the configured knowledge-base repository. Closed targets and evidence scopes prevent arbitrary repositories and keep learner-local evidence self-scoped.

Linux x64 is the supported abrupt-parent-death guarantee: GitHub CLI subprocesses use the packaged parent-death launcher. Other platforms execute `gh` directly and retain handled-shutdown cleanup only.

## Setup

```text
/learner setup
```

Optionally configure the one repository that may receive shared guidance:

```bash
omp plugin config omp-learner --set=knowledgeBaseUrl=https://github.com/owner/shared-guidance
```

`knowledgeBaseUrl` must be an HTTPS GitHub repository URL. Without it, Learner files only against `klondikemarlen/omp-learner`. The setting is the sole external-target authorization; `/learner setup` only enables the watchdog and persists that enabled state in:

```text
~/.omp/agent/learner/config.json
```

Existing `/learner setup <url>` targets are not migrated; set `knowledgeBaseUrl` explicitly after upgrading.

It does not modify OMP's advisor roster or global configuration. It takes effect for the next completed primary-agent turn; no restart or `modelRoles.advisor` configuration is required.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts`, then reload the plugin if OMP supports it or restart OMP. In the fresh session, run:

```text
/learner status
```

Do not claim a release is installed until that command is available from the reinstalled plugin.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when it clarifies the pin; never replace the SHA with a mutable tag.

## Runtime and security boundary

After a completed primary-agent turn, the plugin starts an isolated OMP `AgentSession` using the current model. The session receives a bounded, redacted transcript and can activate only:

```text
read
grep
glob
learner_search_issues
learner_file_issue
```

`learner_search_issues` retrieves up to 1,000 open issues from the fixed, host-validated target repository, ranks them against the candidate, and returns a redacted 16,000-character review snapshot. The response states when summaries or GitHub results are truncated; semantic reuse is therefore best-effort over that bounded snapshot. The learner must review it before filing. It reuses a selected materially equivalent issue when one exists; unrelated results do not suppress a distinct proposal. `learner_file_issue` can create at most one issue per learner run and keeps a final fingerprint lookup as an exact-match/race-safe backstop. Created issues identify the proposed guidance, category, scope, high confidence, visible provenance, and redacted evidence. The learner cannot use `bash`, edit files, commit, push, open pull requests, change memory, or block the primary agent.

GitHub authentication is delegated to the existing `gh` CLI login. OMP Learner never persists a GitHub token, transcript, candidate history, or external target; it retains only its enabled flag.

### Issue targets

Before searching, the watchdog classifies evidence as `learner_local`, `cross_project`, `organization_policy`, or `maintainer_instruction`. Evidence exclusively from OMP Learner’s repository, runtime, commits, workflows, tests, or docs is `learner_local` and must use the fixed `klondikemarlen/omp-learner` repository; reusable-sounding prose does not change that. The configured knowledge-base repository is available only with cited cross-project evidence, an explicit organization policy source, or maintainer instruction. The target and evidence scope are closed tool parameters; callers cannot provide arbitrary repositories, and the reviewed search ID binds the repository reused for duplicate lookup and issue creation.

### Shutdown behavior

On OMP's handled session shutdown (`/exit`, `/quit`, SIGINT, SIGTERM, SIGHUP, or an uncaught exception), the learner shutdown hook returns immediately so it does not block session closure; cleanup then stops queued work, disposes its active watchdog session, and cancels an in-flight `gh` call. On Linux x64, the packaged static launcher also sets `PR_SET_PDEATHSIG` to `SIGKILL` and rechecks its parent before it executes `gh`, so the child dies if the OMP parent is abruptly killed. Other platforms use `gh` directly and retain only the handled-shutdown guarantee.

The checked-in Linux x64 launcher is built from `omp-plugin/learner/bin/omp-learner-pdeath.c` with:

```bash
npm run build:linux-parent-death-helper
```

It requires Docker on Linux x64; normal plugin installation and `npm test` do not compile it. The build command uses a digest-pinned GCC image so release maintainers and CI produce the same artifact.

Launcher target selection is centralized in the runtime registry. It currently contains only `linux-x64`; add an artifact and one registry entry when a new platform is explicitly supported.

## Knowledge-base builder

In addition to code-style, test, commit, and workflow guidance, the learner captures explicit, stable project-domain facts as `project_knowledge` proposals. The configured knowledge-base issue tracker is therefore a reviewable backlog: maintainers can turn accepted issues into the repository's documentation, rules, skills, or other durable project guidance.

The learner does not treat all conversation as knowledge and does not write knowledge files automatically. It ignores routine requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording changes, and uncertain claims.

### Librarian integration

The native bundled `librarian` task agent does **not** yet consume configured knowledge-base issues automatically. OMP exposes bundled task-agent profiles to the primary `task` tool, but it does not expose an extension API that can launch or augment a specific profile from an automatic watcher. This plugin therefore does not overwrite the user's `librarian` profile or inject knowledge-base context into unrelated agents.

When OMP exposes extension-owned task spawning and profile-aware prompt/tool augmentation, the learner can become a native, Hub-visible knowledge-aware subagent. Until then, use accepted knowledge-base issues as the canonical review boundary.

## Disable and verify

```text
/learner off
```

```bash
npm test
```
