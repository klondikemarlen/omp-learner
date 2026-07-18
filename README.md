# OMP Learner

OMP Learner is a small advisor plugin that stores high-confidence, reusable feedback through OMP's native `learn` tool and routes approved improvement tickets. OMP owns durable-memory storage and managed skills; this plugin owns only the marked `learner` advisor entry and one ticket tool.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then calls the core `learn` tool once for explicit, high-confidence feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Code-style standards are retained through OMP so later generated code can follow the user's established patterns.

For a high-confidence improvement requiring tracked work, Learner can use the approved `learner_file_ticket` tool. It prefers the generic knowledge base (`klondikemarlen/omp-config` by default), routes project-specific work to the active checkout's GitHub `origin`, and routes Learner capability gaps to `klondikemarlen/omp-learner`. Tickets are deduplicated by a stable marker and redact common secrets.

Ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. Learner does not start a second agent session, write project files, or open pull requests.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

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

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
