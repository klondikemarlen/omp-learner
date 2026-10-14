# Learner Ownership and Signal Model

## Purpose and Boundary

OMP Learner captures the user's durable reusable preferences as shared guidance proposals so other projects can benefit without repeated corrections. It files one reviewable GitHub issue through the approval-gated `learner_file_ticket` tool before optional supplementary memory; genuinely project-specific corrections stay with their owner. OMP's core owns durable-memory storage and managed skills. Learner does not implement a parallel memory store, automatically implement proposed guidance, execute proposed checks, or create pull requests.

The active agent directory owns Learner's generated configuration and marked advisor guidance. Setup and session reconciliation update Learner's marked advisor block while preserving other roster entries; disabling removes Learner's marked block and recognizable generated guidance while retaining disabled configuration and user-owned notes. See [`config.mjs`](../../omp-plugin/learner/config.mjs) and the focused preservation checks in [`verify-learner.mjs`](../../scripts/verify-learner.mjs).

## Signal Eligibility and Outcomes

The advisor reviews completed turns for explicit, durable feedback about personal style, tests, commits, workflow, tooling, communication, interaction, or stable project knowledge. A reusable personal preference is an actionable shared-guidance proposal even without a product code-change request. Its first appearance in one project does not make it project-local; only explicitly project-limited or domain/schema/implementation-dependent requirements stay local. Ordinary task requests, verifier results, one-off wording, uncertainty, and already-covered guidance do not justify new tickets. Current high-confidence evidence remains required.

Keep these outcomes separate:

1. **Reviewable tracked proposal:** Capture reusable personal preferences in the configured shared skills/rules repository without another tracking request. Capture genuinely project-specific corrections in the active project. File before optional supplementary memory. Ticket filing retains native write approval, deduplication, and redaction. A created/reused issue records the proposal, not implementation or global activation.
2. **Supplementary memory acknowledgment:** A core `learn` acknowledgment is evidence only of that observed operation. Its memory bank may be project- or worktree-scoped; never treat it as proof that another project can use the preference. A prior acknowledgment does not suppress a missing shared ticket. Denied/failed ticket capture stays blocked/failed, not memory-only success. Do not repeat completed operations.

For a verifier-check proposal, the request must explicitly seek verification support for an accepted shared or project rule. Include the accepted rule, source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. It is a proposal only: Learner must not generate executable checks, commands, or run them. Ordinary verifier results are not feedback to be learned or ticketed.

## Stock OMP Tool Transport

Stock OMP's named-advisor tool pool contains built-ins, not registered extension tools. Learner grants the native `eval` tool and uses its JavaScript session-tool bridge:

```js
display(await tool.learner_file_ticket({ target, title, proposal, evidence, confidence: 'high' }));
```

The ticket tool is enabled by default rather than hidden/inactive, so stock dispatch can resolve it. The bridge invokes the same registered tool and native approval wrapper; it does not import the implementation or duplicate the action pipeline. The advisor still selects the eligible action and executes it. The returned `text`, `details.created`, `details.url`, and `hasError` when present are observed operation evidence; a thrown error or error result is not success. The read-only `learner_report_operations` tool uses the same supported bridge for formatting only.

The generated roster uses `tools: [read, grep, glob, learn, eval]`. User-owned tool/model/cadence overrides remain authoritative and are not rewritten by the plugin. An override without `eval`, an unavailable JavaScript runtime, or a disabled session ticket tool blocks an eligible ticket operation. Existing user approval/denial policies remain authoritative. If the reporting bridge is unavailable or denied, generated guidance permits only the same plain-text layout with observed eligible-operation evidence, without pretending the formatter ran or bypassing the override.

**Capability boundary:** Native `eval` is execution-capable and can dispatch enabled primary-session tools; restricting Learner to ticket dispatch and read-only reporting is prompt policy, not a hard sandbox. The guidance forbids implementation imports, helper definitions, dependency installation, direct file/network access, commands, verifier execution, and unrelated eval-bridged tools. No model/provider change, unconditional runner, or custom agent runtime is introduced.

## Operation Results and Silence

The generated advisor prompt keeps the model as the eligible-signal selector and executor. It uses only the existing core `learn` and approval-gated `learner_file_ticket` action paths. After eligible actions, it collects their structured records and calls the pure Learner-owned reporter once. One non-blocking `advise` note (`severity: nit`) relays the returned readable text verbatim—not a JSON array, returned wrapper, code fence, model paraphrase, or added review, recommendations, recovery instructions, strategy, progress, or no-action notices.

Each result contains:

| Field | Contract |
| --- | --- |
| `operation` | `learn` or `learner_file_ticket`. |
| `outcome` | `acknowledged` for core learning; `created` or `reused` for ticket results; `blocked` for an observed missing prerequisite or denied approval; `failed` for an attempted tool error. |
| `subject` | Concise lesson or proposal identity. |
| `evidence` | Actual core acknowledgment, exact returned ticket URL, or bounded observed error. |

[`report.mjs`](../../omp-plugin/learner/report.mjs) supplies the read-only `learner_report_operations` tool:

```js
display(await tool.learner_report_operations({ records, format: 'text' }));
```

Both `text` and `json` represent the same four fields; the returned `details.records` retains the structured array for machine consumers. Text renders `outcome operation: subject`, followed by indented evidence lines, with a blank line between operations. JSON serializes the records without changing their evidence. Multiline acknowledgments/errors remain multiline; exact URLs are preserved. Empty records render empty text (or `[]` for JSON), but the advisor must not call the reporter or deliver a note without an eligible action.

The formatter has no action, retry, routing, memory, network, or filesystem responsibilities. It does not verify model-supplied records independently or upgrade acknowledgments into proof of persistence. Focused checks in [`verify-learning-reports.mjs`](../../scripts/verify-learning-reports.mjs) exercise observable representations and immutable inputs; native QA must compare completed Learner transcripts and delivered notes against actual tool/reporter results.

The ticket tool's existing `details: { created, url }` is authoritative: `created: true` means created, `false` means reused. The corresponding explicit tool-result text carries the same outcome/URL if structured details are not visible to the advisor. No invented issue number, implementation claim, or automatic policy activation follows from filing a proposal.

Learning acknowledgment is not confirmation of backend consolidation, global availability, or completion of the shared-ticket action. A shared issue is a central, reviewable record; the preference becomes active cross-project guidance only after the owning shared package has implemented, reviewed, released, and installed it. Learner does not perform those steps or claim they occurred without evidence. Report ticket and optional memory outcomes independently.

No eligible signal means no learning/ticket action and no `advise` call. Ordinary requests, uncertainty, read-only/remote-only activity alone, unrelated UI/filter review, Python eval failures, and verifier PASS/FAIL/BLOCKED results remain silent. An unrelated failure or ineligible signal must not become a Learner blocker. Eligible failures use non-blocking `nit` severity, do not stop primary work, and do not bypass denied approval.

**Enforcement boundary:** Ticket-first selection, evidence eligibility, result-only delivery, once-only reporting, ownership reasoning, and silence are generated prompt policy—not a programmatic admission filter or guarantee about every future model decision. The ticket tool separately enforces allowed repository destinations before issue lookup/create. OMP owns native advisor scheduling, tool availability, approval, delivery, and memory; its UI may still label these messages **Advisor**. Model/provider routes, user advisor overrides, independent advisors, deduplication, and redaction remain unchanged.

## Ownership and Routing

The selected target must match the actual behavior owner, not the repository where a symptom appeared:

| Concern | Learner target | Destination and boundary |
| --- | --- | --- |
| Reusable personal preference, guidance, or style convention | `knowledge_base` | Configured shared-guidance repository; defaults to [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). Project context alone does not localize a personal preference. Ticket first, optional core memory afterward. |
| Explicitly project-specific or domain-dependent correction/verification rule | `local` or `project_check` | The active checkout's GitHub `origin`; do not promote product-specific facts into shared personal guidance. |
| Learner's own command, advisor, ticket tool, configuration, or guidance lifecycle | `learner` | [`omp-learner`](https://github.com/klondikemarlen/omp-learner). Do not route generic OMP, built-in tool, browser, GraphQL, repository-boundary, or other-plugin behavior here. |
| Reusable verification of an accepted shared rule | `reusable_check` | [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools) owns reusable guidance, package-owned quality policies, and check implementations. Learner submits a reviewable proposal, not a check implementation. |
| Project-only verification of an accepted project rule | `project_check` | The active project's `origin`; the project owns the rule and its check proposal. |
| Verifier discovery, execution, trigger/suppression/evidence, or advisor correction runtime | `verifier` | [`omp-verifier`](https://github.com/klondikemarlen/omp-verifier) owns this runtime. Do not send these concerns to Learner or invent a generic check policy. |
| Evidenced related user-owned project | `related` + `repository` | A normalized `klondikemarlen/repository`, such as [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard). No external owner or fallback destination. |

When ownership is unclear, inspect available source and installed/plugin metadata before routing; do not guess from the surface where a problem appeared. A ticket target is not proof that the destination owns the concern. Do not file upstream OMP issues or redirect outside-owner concerns into unrelated user projects.

The runtime boundary permits the active checkout's normalized GitHub `origin` or `klondikemarlen/*`. Related targets require the latter; a configured knowledge base outside that namespace must match the active origin case-insensitively. Missing/non-GitHub origin does not prevent a user-owned shared or related destination, but cannot authorize a project or other external destination. Rejection occurs before any GitHub issue lookup/create, without fallback. Native approval remains required.

The default shared target changes from `klondikemarlen/omp-config` to `klondikemarlen/marlens-skills-rules-and-tools`. Reads expose the migrated configuration without writing; setup/session reconciliation persists it through the existing configuration writer. Other explicit destinations and disabled state remain intact. Actual local/related tickets for `omp-config` retain that repository rather than undergoing shared-default migration.

Soft-boundary-guard's installed extension is advisory and fail-open, so its warnings do not enforce Learner's restriction. Learner owns this narrow ticket-destination policy; no guard runtime, reviewed policy, credentials, or global model settings are changed.

## Proposal Hygiene and Authority

Ticket fields are normalized and length-limited before filing. Current source evidence belongs in the proposal; redact sensitive data and avoid unnecessary private or unrelated context. The implementation redacts common GitHub/AWS token patterns and common labeled bearer/token/password/secret values; this is not a guarantee that every secret format is recognized, so review content before filing.

An open issue matching the generated fingerprint for repository, title, proposal, proposal type, and candidate owner is returned instead of filing another. This is best-effort duplicate suppression, not a replacement for owner triage or a guarantee that semantically similar issues are merged.

Destination maintainers decide whether to accept, refine, implement, or close a proposal. Learner does not change the accepted rule or claim that a check has been installed. Ordinary failures without an eligible durable correction do not justify a ticket.

## Evidence and Source Conflicts

The current code is the authority for implemented behavior; tests show only the cases they execute. [`README.md`](../../README.md) summarizes the current core-learning and ticket workflow, while this document explains its ownership boundaries. Older descriptions of Learner as a standalone replacement watchdog are stale: generated guidance is agent-owned, while the runtime uses OMP's native `learn` tool. Re-check the linked implementation and tests before changing this model.
