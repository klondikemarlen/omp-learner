# Learner Ownership and Signal Model

## Purpose and Boundary

OMP Learner is an advisor plugin for two distinct outcomes: retain explicit, high-confidence durable feedback with OMP's native `learn` tool, or—only when tracked work is explicitly warranted—create one reviewable GitHub issue through the approval-gated `learner_file_ticket` tool. OMP's core owns durable-memory storage and managed skills. Learner does not implement a parallel memory store, replace the native learning workflow, edit proposed changes, execute proposed checks, or create pull requests.

The active agent directory owns Learner's generated configuration and marked advisor guidance. Setup and session reconciliation update Learner's marked advisor block while preserving other roster entries; disabling removes Learner's marked block and recognizable generated guidance while retaining disabled configuration and user-owned notes. See [`config.mjs`](../../omp-plugin/learner/config.mjs) and the focused preservation checks in [`verify-learner.mjs`](../../scripts/verify-learner.mjs).

## Signal Eligibility and Outcomes

The advisor reviews completed turns for explicit, durable feedback about style, tests, commits, workflow, tooling, or stable project knowledge. Ordinary task requests, verifier PASS/FAIL/BLOCKED evidence, one-off wording, and uncertainty are not learning or ticket signals. High confidence and reusability are required; historic evidence alone is not proof that an implementation still fails.

Keep these outcomes separate:

1. **Remembered lesson:** For high-confidence reusable feedback, Learner calls OMP's core `learn` tool once with a concise lesson and source context. This stores knowledge through OMP; it does not itself justify a GitHub issue.
2. **Reviewable tracked proposal:** When explicit user intent and current source evidence establish work needing owner review, Learner may file one high-confidence issue. Ticket filing is a write-approval tool, deduplicates by a stable fingerprint, and redacts some common secret forms. It does not implement the proposal.

For a verifier-check proposal, the request must explicitly seek verification support for an accepted shared or project rule. Include the accepted rule, source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. It is a proposal only: Learner must not generate executable checks, commands, or run them. Ordinary verifier results are not feedback to be learned or ticketed.

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
