# OMP Learner

OMP Learner captures the user's durable personal preferences as shared, reviewable guidance proposals so other projects can benefit without repeating the same corrections. Reusable preferences become GitHub issues in the configured shared skills/rules repository; genuinely project-specific corrections stay with their project. OMP's native `learn` memory is supplementary, not proof of global availability. This plugin owns the marked `learner` advisor entry, one bounded ticket action tool, and a pure operation-report formatter.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

Optional support: [Ko-fi](https://ko-fi.com/klondikemarlen).

## Advisor and core learning

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It can inspect with `read`, `grep`, and `glob`, then files one deduplicated, evidence-backed issue for high-confidence durable feedback that is not already covered. Personal code-style, testing, workflow, communication, and interaction preferences are actionable shared-guidance proposals even when no product source-code change is requested. No separate request to track the preference is required; native tool approval still applies.

A preference first expressed while working in one named repository is not automatically project-specific. Reusable preferences route to the shared knowledge base; only explicitly project-limited or domain/schema/implementation-dependent requirements route to the active project. One-off wording and already-covered guidance do not justify new issues.

Before proposing shared guidance, Learner compares the current signal with the target owner's current guidance and relevant completed work through a [bounded coverage review](docs/architecture/ownership-and-signals.md#current-shared-guidance-coverage). Equivalent released guidance yields a cited `covered guidance_coverage` result without another ticket. A genuinely different missing preference remains eligible; unavailable required sources yield `incomplete`, not an invented coverage claim. Archived conversations lacking ticket acknowledgments do not establish a present gap.

For a genuinely missing preference, ticket filing comes before optional supplementary memory. An earlier `Lesson stored.` acknowledgment does not complete that shared-ticket action: OMP memory may be project- or worktree-scoped. A returned existing ticket completes the capture without another issue. Denied, unavailable, or failed ticket filing remains blocked/failed rather than being replaced by memory-only success.

**Recorded is not active:** a shared issue makes the preference reviewable in the shared repository; it does not itself install a global rule. Cross-project behavior depends on the guidance being reviewed, implemented, released, and installed through the shared package's normal workflow. Learner does not automatically implement proposals or change OMP's memory backend.

Project-only proposals route to the active checkout's GitHub `origin`. Shared guidance defaults to [`klondikemarlen/marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). The previous generic `klondikemarlen/omp-config` default migrates to this shared target; other explicit configured targets are preserved, subject to the destination restriction.

Related proposals require source evidence identifying the owner and use `target: 'related'` with `repository: 'klondikemarlen/owner-project'`, such as `klondikemarlen/omp-soft-boundary-guard`. The ticket tool accepts only the active GitHub origin or `klondikemarlen/*` repositories; related targets must use that namespace. External configured destinations and external related targets are rejected before GitHub issue lookup or creation, without fallback. Never file upstream OMP issues or redirect an external proposal into an unrelated user project.

When tool ownership is unclear, inspect installed/plugin source metadata and the user's own repositories first. Ownership uncertainty is not permission to file elsewhere. [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard) provides advisory warnings, not enforcement of this restriction; Learner enforces its own ticket destinations without changing the guard's policy.

When a user explicitly requests verification support for an accepted shared or project rule, Learner can file a reviewable verifier-check proposal—not an executable check—with source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Reusable checks route to `klondikemarlen/marlens-skills-rules-and-tools`, project-only checks to the active project, and verifier runtime or discovery gaps to `klondikemarlen/omp-verifier`.

Ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. Read-only/remote-only activity, unrelated filter/UI review, and Python eval failures alone do not justify learning, tickets, or advice. Learner does not edit files, run commands, file pull requests, or start a second agent session.
Observed coverage decisions and learning/ticket actions produce one concise, evidence-backed readable report; no eligible signal means no delivered Learner message. Coverage is reported separately from actions, with its examined-source citation and `covered`, `not_covered`, or `incomplete` outcome. Each action keeps its own outcome and observed acknowledgment, exact returned URL, or bounded error. Failed eligible actions remain non-blocking. Structured records remain available for programmatic use. See [Operation Results and Silence](docs/architecture/ownership-and-signals.md#operation-results-and-silence) for the result shape and enforcement boundary.

Repeated failed or unchanged edit calls are blocked with a recovery prompt so the agent can re-read the current state and retry with a fresh anchor.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

### Ticket Content Limits

Ticket filing preserves Markdown headings, paragraphs, lists, and code fences in proposals, evidence, and verifier-detail fields while redacting secrets. Each multiline field accepts up to 6,000 characters; titles accept 120, and candidate owners and related-repository inputs accept 200. The tool schema and description expose the remaining field limits and supported values (`confidence: 'high'`, optional `proposalType: 'verifier_check'`).

An oversized field or generated issue body (maximum 65,536 characters) is rejected explicitly before repository resolution or GitHub issue lookup/create. Nothing is silently truncated. Deduplication includes the complete accepted, redacted proposal, so proposals that differ after the former 2,000-character cutoff remain distinct.

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

Run local checks with `npm test`; they cover configuration migration, readable/JSON report parity, acknowledgment, exact created/reused URLs, multiline evidence, mixed outcomes, every ticket target, and destination rejection before issue actions without creating GitHub issues. For native QA, use isolated ticket routing and compare completed named Learner transcripts, actual tool/reporter evidence, and delivered primary notes. In distinct project contexts, verify reusable coding and communication preferences select the shared target without a separate tracking request, including after a prior memory acknowledgment. Contrast an explicitly project-only requirement, denied ticket action, excluded external ownership, and silent ordinary work. Reports must not claim a created issue is active global guidance. Use real GitHub only for genuine authorized improvements—never release-verification fixtures.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
