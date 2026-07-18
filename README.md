# OMP Learner

OMP Learner is a small advisor plugin that sends high-confidence, reusable feedback to OMP's native `learn` tool. OMP owns durable-memory storage and managed skills; this plugin owns only the marked `learner` advisor entry.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then calls the core `learn` tool once for explicit, high-confidence feedback about code style, tests, commits, workflow, tooling, or stable project knowledge.

Ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. Learner does not create GitHub issues, start a second agent session, or write project files.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

## Commands

```text
/learner setup
/learner off
/learner status
```

`/learner setup` enables the advisor. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts`, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor configure` at user scope.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
