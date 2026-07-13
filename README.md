# OMP Learner

OMP Learner configures an independent OMP advisor that watches future sessions for explicit, durable user feedback about shared code style, tests, commits, and workflows.

## Setup

Run this once after the OMP advisor model role is configured:

```text
/learner setup https://github.com/owner/shared-guidance
```

Setup validates that the upstream repository is accessible and has GitHub Issues enabled, then persists:

- the enabled state and normalized upstream repository in `~/.omp/agent/learner/config.json`;
- a learner advisor entry in `~/.omp/agent/WATCHDOG.yml`, preserving existing advisors such as `omp-verifier`;
- `advisor.enabled: true` in the OMP global configuration.

Restart OMP after setup. The read-only learner watchdog is active in future sessions until `/learner off` removes only its managed advisor entry.

## GitHub issue boundary

The upstream repository is stored now for the future ticket workflow. Current OMP advisors can use only built-in tools; they cannot invoke extension tools. OMP Learner therefore **does not file GitHub issues yet**. Granting the advisor `bash` to run `gh issue create` would give it unrestricted, unapproved shell access, so this package deliberately refuses that unsafe workaround.

The watchdog instead surfaces a high-confidence proposal through OMP's advisor channel for human review. It never opens pull requests, edits files, commits, pushes, changes memory, or blocks the primary agent.

GitHub authentication is delegated to the existing `gh` CLI login during setup. OMP Learner never stores a GitHub token.

## Verification

```bash
npm test
```
