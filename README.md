# OMP Learner

OMP Learner is a small advisor plugin that stores high-confidence, reusable feedback through OMP's native `learn` tool and routes approved improvement tickets. OMP owns durable-memory storage and managed skills; this plugin owns only the marked `learner` advisor entry, one ticket action tool, and a pure operation-report formatter.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

Optional support: [Ko-fi](https://ko-fi.com/klondikemarlen).

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then calls the core `learn` tool once for explicit, high-confidence feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Code-style standards are retained through OMP so later generated code can follow the user's established patterns.

When a user explicitly asks Learner to retain a high-confidence, non-project-specific code-style convention, it routes the convention to the configured generic knowledge-base ticket workflow so shared skills and rules can adopt it instead of leaving it only as project-local memory.
For a high-confidence improvement explicitly authorized for tracked work, Learner uses stock OMP's `eval` JavaScript bridge to call the approved, registered `learner_file_ticket` tool. It prefers the generic knowledge base (`klondikemarlen/omp-config` by default), routes project-specific work to the active checkout's GitHub `origin`, and routes Learner capability gaps to `klondikemarlen/omp-learner`. Tickets are deduplicated by a stable marker and redact common secrets.
When tool ownership is unclear, inspect the user's own plugin repositories and installed/plugin source metadata before filing an OMP runtime issue; for this user, check `klondikemarlen/marlens-skills-rules-and-tools`, then enumerate or search the user's other GitHub repositories before assigning ownership elsewhere.
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

`/learner setup` enables the advisor and keeps the preferred generic knowledge base. Pass an `owner/repository` or HTTPS GitHub repository URL to replace that target. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin uninstall omp-learner
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts` and the released package version, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor status` for a resolved Learner model; exercise command autocomplete and readable reporting.

Run local checks with `npm test`; they cover readable/JSON report parity, acknowledgment, exact created/reused URLs, multiline evidence, mixed outcomes, and every ticket target without creating GitHub issues. For native reporter QA, use isolated ticket routing and compare the completed named Learner transcript, actual tool/reporter evidence, and delivered primary notes. Cover eligible acknowledgment, creation/reuse, denial/error, and silent excluded/no-action paths. Use `learner_file_ticket` against real GitHub only for a genuine authorized improvement—never to create release-verification fixtures.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
