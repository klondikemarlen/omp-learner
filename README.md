# OMP Learner

OMP Learner is a small advisor plugin that stores high-confidence, reusable feedback through OMP's native `learn` tool and routes approved improvement tickets. OMP owns durable-memory storage and managed skills; this plugin owns only the marked `learner` advisor entry and one ticket tool.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then calls the core `learn` tool once for explicit, high-confidence feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Code-style standards are retained through OMP so later generated code can follow the user's established patterns.

When a user explicitly asks Learner to retain a high-confidence, non-project-specific code-style convention, it routes the convention to the configured generic knowledge-base ticket workflow so shared skills and rules can adopt it instead of leaving it only as project-local memory.
For a high-confidence improvement requiring tracked work, Learner can use the approved `learner_file_ticket` tool. It prefers the generic knowledge base (`klondikemarlen/omp-config` by default), routes project-specific work to the active checkout's GitHub `origin`, and routes Learner capability gaps to `klondikemarlen/omp-learner`. Tickets are deduplicated by a stable marker and redact common secrets.
When a user explicitly requests verification support for an accepted shared or project rule, Learner can file a reviewable verifier-check proposal—not an executable check—with source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Reusable checks route to `klondikemarlen/marlens-skills-rules-and-tools`, project-only checks to the active project, and verifier runtime or discovery gaps to `klondikemarlen/omp-verifier`.

Ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. For implementation reviews, Learner can report concrete findings from the requested checks, including recovery steps after failed Python eval cells; it does not edit files, run commands, file pull requests, or start a second agent session.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

### Guidance lifecycle

Learner uses the same agent-owned guidance model as the installed `omp-verifier`: the marked roster imports `learner/WATCHDOG.md` from the active agent directory, not a package path. This keeps guidance tied to its configuration and lets both advisors preserve each other's marked roster blocks.

Setup and the next session after a reinstall refresh the generated guidance. `/learner off` removes Learner's marked roster entry and recognizable guidance file, keeps the disabled agent-owned configuration for status and re-enablement, and preserves unrelated agent configuration.

## Commands

```text
/learner setup [owner/repository]
/learner off
/learner status
```

`/learner setup` enables the advisor and keeps the preferred generic knowledge base. Pass an `owner/repository` or HTTPS GitHub repository URL to replace that target. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts`, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor configure` at user scope.

Run ticket-route checks locally with `npm test`; it exercises every target without creating GitHub issues. Use `learner_file_ticket` only for a real, high-confidence improvement that needs tracked work—never as release-verification evidence.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
