# OMP Learner

OMP Learner is a small advisor plugin that turns high-confidence, actionable feedback into reviewable GitHub issues. Memory through OMP's native `learn` tool is supplementary; personal preferences without a repository change may remain memory-only. OMP owns durable-memory storage and managed skills; this plugin owns the marked `learner` advisor entry, one bounded ticket action tool, and a pure operation-report formatter.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

Optional support: [Ko-fi](https://ko-fi.com/klondikemarlen).

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then files one deduplicated, evidence-backed issue for an actionable correction to code style, tests, commits, workflow, tooling, or maintained project guidance. No separate request to track the correction is required; native tool approval still applies.

Ticket filing comes before optional supplementary memory. An earlier `Lesson stored.` acknowledgment does not complete a missing ticket action. A returned existing ticket completes the action without creating another issue. Personal preferences with no actionable repository change can use core `learn` alone.

Project-only proposals route to the active checkout's GitHub `origin`. Shared guidance defaults to [`klondikemarlen/marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). The previous generic `klondikemarlen/omp-config` default migrates to this shared target; other explicit configured targets are preserved, subject to the destination restriction.

Related proposals require source evidence identifying the owner and use `target: 'related'` with `repository: 'klondikemarlen/owner-project'`, such as `klondikemarlen/omp-soft-boundary-guard`. The ticket tool accepts only the active GitHub origin or `klondikemarlen/*` repositories; related targets must use that namespace. External configured destinations and external related targets are rejected before GitHub issue lookup or creation, without fallback. Never file upstream OMP issues or redirect an external proposal into an unrelated user project.

When tool ownership is unclear, inspect installed/plugin source metadata and the user's own repositories first. Ownership uncertainty is not permission to file elsewhere. [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard) provides advisory warnings, not enforcement of this restriction; Learner enforces its own ticket destinations without changing the guard's policy.

When a user explicitly requests verification support for an accepted shared or project rule, Learner can file a reviewable verifier-check proposal—not an executable check—with source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Reusable checks route to `klondikemarlen/marlens-skills-rules-and-tools`, project-only checks to the active project, and verifier runtime or discovery gaps to `klondikemarlen/omp-verifier`.

Ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. Read-only/remote-only activity, unrelated filter/UI review, and Python eval failures alone do not justify learning, tickets, or advice. Learner does not edit files, run commands, file pull requests, or start a second agent session.
Successful learning/ticket actions produce one concise, evidence-backed readable operation report; no eligible action means no delivered Learner message. Each operation keeps its own outcome and observed acknowledgment, exact returned URL, or bounded error. Failed eligible actions remain non-blocking. Structured records remain available for programmatic use. See [Operation Results and Silence](docs/architecture/ownership-and-signals.md#operation-results-and-silence) for the result shape and enforcement boundary.

Repeated failed or unchanged edit calls are blocked with a recovery prompt so the agent can re-read the current state and retry with a fresh anchor.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

### Stock OMP Tool Grants

The generated Learner roster grants `read`, `grep`, `glob`, `learn`, and `eval`. Stock OMP does not directly expose extension tools to named advisors; Learner uses `display(await tool.learner_file_ticket({...}))` through the built-in JavaScript runtime for authorized ticket actions. The existing ticket tool is enabled by default in the session and retains its native write-approval gate, validation, routing, deduplication, and redaction. After eligible actions, the same bridge calls the read-only `learner_report_operations` formatter with `{ records, format: 'text' }`; native notes relay only its rendered text. Machine consumers can request `format: 'json'`; both formats retain the same records in `details.records`. No OMP patch, new action pipeline, or replacement agent runtime is required.

Explicit user advisor overrides are preserved. An override must include `eval` to support ticket dispatch; disabled/unavailable JavaScript or a disabled ticket tool is an honest blocker for an otherwise eligible proposal. Do not bypass denial or silently change approval policies.

`eval` is execution-capable and can reach enabled primary-session tools. Restricting Learner to ticket dispatch and pure reporting is prompt policy, not a hard sandbox. The generated guidance forbids direct implementation imports, helper definitions, package installation, file/network access, shell commands, verifier checks, and unrelated tool calls through eval. The formatter only renders supplied evidence; it neither executes/retries actions nor independently proves their outcomes. Native transport may still label the resulting note **Advisor**.

### Guidance lifecycle

Learner uses the same agent-owned guidance model as the installed `omp-verifier`: the marked roster imports `learner/WATCHDOG.md` from the active agent directory, not a package path. This keeps guidance tied to its configuration and lets both advisors preserve each other's marked roster blocks.

Setup and the next session after a reinstall refresh the generated guidance. `/learner off` removes Learner's marked roster entry and recognizable guidance file, keeps the disabled agent-owned configuration for status and re-enablement, and preserves unrelated agent configuration.

## Commands

```text
/learner setup [owner/repository]
/learner off
/learner status
```

`/learner setup` enables the ticket-first advisor and keeps the configured shared-guidance target. Pass an `owner/repository` or HTTPS GitHub repository URL to replace that target; configuration alone does not authorize an external destination. `/learner status` shows the ticket-first policy and destination boundary. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin uninstall omp-learner
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts` and the released package version, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor status` for a resolved Learner model; exercise command autocomplete and readable reporting.

Run local checks with `npm test`; they cover configuration migration, readable/JSON report parity, acknowledgment, exact created/reused URLs, multiline evidence, mixed outcomes, every ticket target, and destination rejection before issue actions without creating GitHub issues. For native QA, use isolated ticket routing and compare the completed named Learner transcript, actual tool/reporter evidence, and delivered primary notes. Cover automatic project/shared tickets without a separate tracking request, a prior memory acknowledgment with no ticket, existing-ticket reuse, related user-owned routing, excluded external ownership, and silent ordinary work. Use `learner_file_ticket` against real GitHub only for a genuine authorized improvement—never to create release-verification fixtures.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
