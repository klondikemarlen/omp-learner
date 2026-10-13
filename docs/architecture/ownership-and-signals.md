# Learner Ownership and Signal Model

## Purpose and Boundary

OMP Learner is an advisor plugin for two distinct outcomes: retain explicit, high-confidence durable feedback with OMP's native `learn` tool, or—only when tracked work is explicitly warranted—create one reviewable GitHub issue through the approval-gated `learner_file_ticket` tool. OMP's core owns durable-memory storage and managed skills. Learner does not implement a parallel memory store, replace the native learning workflow, edit proposed changes, execute proposed checks, or create pull requests.

The active agent directory owns Learner's generated configuration and marked advisor guidance. Setup and session reconciliation update Learner's marked advisor block while preserving other roster entries; disabling removes Learner's marked block and recognizable generated guidance while retaining disabled configuration and user-owned notes. See [`config.mjs`](../../omp-plugin/learner/config.mjs) and the focused preservation checks in [`verify-learner.mjs`](../../scripts/verify-learner.mjs).

## Signal Eligibility and Outcomes

The advisor reviews completed turns for explicit, durable feedback about style, tests, commits, workflow, tooling, or stable project knowledge. Ordinary task requests, verifier PASS/FAIL/BLOCKED evidence, one-off wording, and uncertainty are not learning or ticket signals. High confidence and reusability are required; historic evidence alone is not proof that an implementation still fails.

Keep these outcomes separate:

1. **Acknowledged lesson:** For high-confidence reusable feedback, Learner calls OMP's core `learn` tool once with a concise lesson and source context. Report the actual acknowledgment, not stronger backend persistence than the tool proves. This does not itself justify a GitHub issue or repeating an action already completed by the primary agent.
2. **Reviewable tracked proposal:** When explicit user intent and current source evidence establish work needing owner review, Learner may file one high-confidence issue. Ticket filing is a write-approval tool, deduplicates by a stable fingerprint, and redacts some common secret forms. It does not implement the proposal.

For a verifier-check proposal, the request must explicitly seek verification support for an accepted shared or project rule. Include the accepted rule, source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. It is a proposal only: Learner must not generate executable checks, commands, or run them. Ordinary verifier results are not feedback to be learned or ticketed.

## Stock OMP Ticket Transport

Stock OMP's named-advisor tool pool contains built-ins, not registered extension tools. Learner grants the native `eval` tool and uses its JavaScript session-tool bridge:

```js
display(await tool.learner_file_ticket({ target, title, proposal, evidence, confidence: 'high' }));
```

The ticket tool is enabled by default rather than hidden/inactive, so stock dispatch can resolve it. The bridge invokes the same registered tool and native approval wrapper; it does not import the implementation or duplicate the action pipeline. The advisor still selects the eligible action and executes it. The returned `text`, `details.created`, `details.url`, and `hasError` when present are observed operation evidence; a thrown error or error result is not success.

The generated roster uses `tools: [read, grep, glob, learn, eval]`. User-owned tool/model/cadence overrides remain authoritative and are not rewritten by the plugin. An override without `eval`, an unavailable JavaScript runtime, or a disabled session ticket tool blocks an eligible ticket operation. Existing user approval/denial policies remain authoritative.

**Capability boundary:** Native `eval` is execution-capable and can dispatch enabled primary-session tools; the Learner-specific ticket-only restriction is prompt policy, not a hard sandbox. The guidance forbids implementation imports, helper definitions, dependency installation, direct file/network access, commands, verifier execution, and other eval-bridged tools. No model/provider change, unconditional runner, or custom agent runtime is introduced.

## Operation Results and Silence

The generated advisor prompt keeps the model as the eligible-signal selector and executor. It uses only the existing core `learn` and approval-gated `learner_file_ticket` action paths. After an eligible action, it may deliver one non-blocking `advise` note (`severity: nit`) containing a JSON array of results, with no accompanying review, recommendations, recovery instructions, strategy, progress, or no-action notices.

Each result contains:

| Field | Contract |
| --- | --- |
| `operation` | `learn` or `learner_file_ticket`. |
| `outcome` | `acknowledged` for core learning; `created` or `reused` for ticket results; `blocked` for an observed missing prerequisite or denied approval; `failed` for an attempted tool error. |
| `subject` | Concise lesson or proposal identity. |
| `evidence` | Actual core acknowledgment, exact returned ticket URL, or bounded observed error. |

The ticket tool's existing `details: { created, url }` is authoritative: `created: true` means created, `false` means reused. The corresponding explicit tool-result text carries the same outcome/URL if structured details are not visible to the advisor. No invented issue number, implementation claim, or automatic policy activation follows from filing a proposal.

Learning acknowledgment is not an independent confirmation that backend consolidation or durable storage completed. Do not upgrade it to a stronger persistence claim. If a lesson and an authorized ticket are both attempted, report their observed outcomes separately; success or failure of one does not establish the other's outcome.

No eligible signal means no learning/ticket action and no `advise` call. Ordinary requests, uncertainty, read-only/remote-only activity alone, unrelated UI/filter review, Python eval failures, and verifier PASS/FAIL/BLOCKED results remain silent. An unrelated failure or ineligible signal must not become a Learner blocker. Eligible failures use non-blocking `nit` severity, do not stop primary work, and do not bypass denied approval.

**Enforcement boundary:** Result-only delivery, signal selection, once-only action/reporting, and silence are generated prompt policy—not a new programmatic admission filter or a guarantee about every future model decision. OMP owns native advisor scheduling, tool availability, approval, and delivery; its UI may still label these messages **Advisor**. The plugin does not change model/provider routes, user advisor overrides, independent advisors, native memory ownership, or the existing ticket routing, deduplication, and redaction behavior.

## Ownership and Routing

The selected target must match the actual behavior owner, not the repository where a symptom appeared:

| Concern | Learner target | Destination and boundary |
| --- | --- | --- |
| Reusable guidance or a requested shared style convention | `knowledge_base` | Configured generic knowledge base; defaults to [`omp-config`](https://github.com/klondikemarlen/omp-config). Shared lesson requests use core `learn` first and then a reviewable ticket when explicitly requested. |
| Active-project implementation or project-only verification rule | `local` or `project_check` | The active checkout's GitHub `origin`; local tickets are not the same as project-check proposals. |
| Learner's own command, advisor, ticket tool, configuration, or guidance lifecycle | `learner` | [`omp-learner`](https://github.com/klondikemarlen/omp-learner). Do not route generic OMP, built-in tool, browser, GraphQL, repository-boundary, or other-plugin behavior here. |
| Reusable verification of an accepted shared rule | `reusable_check` | [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools) owns reusable guidance, package-owned quality policies, and check implementations. Learner submits a reviewable proposal, not a check implementation. |
| Project-only verification of an accepted project rule | `project_check` | The active project's `origin`; the project owns the rule and its check proposal. |
| Verifier discovery, execution, trigger/suppression/evidence, or advisor correction runtime | `verifier` | [`omp-verifier`](https://github.com/klondikemarlen/omp-verifier) owns this runtime. Do not send these concerns to Learner or invent a generic check policy. |

When ownership is unclear, inspect available source and plugin metadata before routing; do not guess from the surface where a problem appeared. A ticket target is not proof that the destination owns the concern.

## Proposal Hygiene and Authority

Ticket fields are normalized and length-limited before filing. Current source evidence belongs in the proposal; redact sensitive data and avoid unnecessary private or unrelated context. The implementation redacts common GitHub/AWS token patterns and common labeled bearer/token/password/secret values; this is not a guarantee that every secret format is recognized, so review content before filing.

An open issue matching the generated fingerprint for repository, title, proposal, proposal type, and candidate owner is returned instead of filing another. This is best-effort duplicate suppression, not a replacement for owner triage or a guarantee that semantically similar issues are merged.

Learner may retain a lesson or submit a proposal, but ownership remains with the destination maintainers: they decide whether to accept, refine, implement, or close it. Learner does not change the accepted rule, claim a check has been installed, or infer permission to file from a failure report alone.

## Evidence and Source Conflicts

The current code is the authority for implemented behavior; tests show only the cases they execute. [`README.md`](../../README.md) summarizes the current core-learning and ticket workflow, while this document explains its ownership boundaries. Older descriptions of Learner as a standalone replacement watchdog are stale: generated guidance is agent-owned, while the runtime uses OMP's native `learn` tool. Re-check the linked implementation and tests before changing this model.
