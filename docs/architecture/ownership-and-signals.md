# Learner Ownership and Signal Model

## Purpose and Boundary

OMP Learner identifies and classifies durable learning for integration into maintained shared skills, rules, and workflows, with potential verification through supplied checks compatible with `omp-verifier`. It files one reviewable GitHub issue through the approval-gated `learner_file_ticket` tool before optional supplementary memory; genuinely project-specific corrections stay with their owner. Shared guidance and reusable verifier-integration proposals belong in the user's configured shared knowledge base, defaulting to [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools), not a mandatory hard-coded repository. OMP's core owns durable-memory storage and managed skills. Learner is not a general project-knowledge store, verifier provider, or verifier executor; it does not implement a parallel memory store, automatically implement proposed guidance, execute proposed checks, or create pull requests.

The active agent directory owns Learner's generated configuration and marked advisor guidance. Setup and session reconciliation update Learner's marked advisor block while preserving other roster entries; disabling removes Learner's marked block and recognizable generated guidance while retaining disabled configuration and user-owned notes. See [`config.mjs`](../../omp-plugin/learner/config.mjs) and the focused preservation checks in [`verify-learner.mjs`](../../scripts/verify-learner.mjs).

## Signal Eligibility and Outcomes

The advisor reviews user-authored source in the current conversation: corrections or materially new relevant evidence not already assessed since the prior review. It uses native session update role labels to distinguish user input from agent summaries or synthetic continuation/final-yield reminders; only user-authored input can introduce a new correction. The source window is not an arbitrary number of turns: earlier unhandled user-authored source may remain eligible, while already assessed source and generated summaries do not become new signals. Once a source correction has received a completed Learner operation, subsequent final-yield reviews must treat that originating correction as handled regardless of a paraphrased subject, ordinary question, or checkout/worktree request. Match the source correction and practical behavior/scope rather than subject wording. A genuinely new user-authored correction or materially new current source/coverage evidence remains eligible. The advisor classifies learned behavior, current source evidence, scope, actual owner, and existing coverage before capture. Shared candidates identify the relevant rule, skill, or workflow in the existing proposal/evidence fields; no separate knowledge inventory or classifier runtime is introduced. A reusable preference remains actionable without a product code-change request, and first appearing in one project does not make it project-local. General facts, service addresses, schema descriptions, terminology, and operational notes are context rather than automatic ticket or memory actions; preserve them in their owning project, not in Learner. Ordinary requests, verifier results, one-off wording, uncertainty, and already-covered guidance do not justify new tickets.

## Current Shared-Guidance Coverage

Only a high-confidence user-authored source not already assessed can justify a proposal; archived conversation, memory acknowledgment, agent summaries, synthetic continuation reminders, or historical missing-ticket evidence do not establish a current gap. Completed Learner operations mark their originating source correction handled for subsequent reviews in the same conversation, regardless of changed report-subject phrasing. Do not repeat an operation for handled source, but do not collapse a genuinely new correction or materially new current source/coverage evidence into that earlier signal. After confirming a new signal and target, inspect its owner's guidance. The bounded review allows one `glob`, two focused `grep` queries, and five `read` calls total across guidance, relevant completed work, and open proposals: no more than three current guidance files/sections and two candidate issue/PR records. Reserve reads for the open listing and likely candidate when filing remains eligible; do not exhaust the budget scanning completed history. Use only existing read/grep/glob, not shell, direct network access, or eval.

Suppress another guidance proposal when the same practical behavior at the same scope is already present in released current guidance, even when its wording differs. Cite the exact guidance heading or corroborating merged/released PR. A prior proposal, ticket acknowledgment, or closed issue alone does not prove released coverage. A related topic with a genuinely distinct or missing behavior remains eligible. If current guidance or surfaced relevant release evidence cannot be inspected, do not claim coverage or absence and do not file until the review can be completed. Covered guidance proves neither code adherence nor verification coverage; it does not end a separately requested verification-gap review.

Keep these outcomes separate:

1. **Reviewable tracked proposal:** Capture reusable personal preferences in the configured shared skills/rules repository without another tracking request, but only after the bounded coverage review finds no equivalent released guidance. Capture genuinely project-specific corrections in the active project. File before optional supplementary memory. Ticket filing retains native write approval, deduplication, and redaction. A created/reused issue records the proposal, not implementation or global activation.
2. **Supplementary memory acknowledgment:** A core `learn` acknowledgment is evidence only of that observed operation. Its memory bank may be project- or worktree-scoped; never treat it as proof that another project can use the preference. For a genuinely missing shared preference, a prior acknowledgment does not suppress the ticket. Denied/failed ticket capture stays blocked/failed, not memory-only success. Do not repeat completed operations.

Filing a verifier-integration proposal requires explicit verification intent for an accepted shared or project rule. A standing user goal to reduce manual code corrections through supplied verification qualifies; the user need not repeat it for every current correction. A correction can establish an adherence gap even when guidance is covered. Inspect relevant package.json `omp.verifications` metadata when available: check ID, package-relative entry, and declared scope or `pathTriggers`. Prefer integration with an applicable supplied check over a duplicate implementation, and describe the genuinely missing integration. If no relevant check is supplied for the accepted rule, propose the missing verification contract instead of copying the existing guidance. Include the accepted rule, source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Qualitative standards need contextual agentic criteria, not arbitrary file-count, line-count, or complexity thresholds.

Providers and projects own check implementations; `omp-verifier` discovers and executes the declared checks. Only evidence of a discovery/execution/runtime gap warrants that runtime destination; a manual correction alone does not prove an installed check failed or was skipped. Learner must not generate executable checks or commands, install or activate checks, or run them. Neither classification, guidance coverage, nor a proposal establishes that code is compliant or a verifier is installed, applicable, active, or passing. Ordinary verifier results are not feedback to be learned or ticketed.

## Stock OMP Tool Transport

Stock OMP's named-advisor tool pool contains built-ins, not registered extension tools. Learner grants the native `eval` tool and uses its JavaScript session-tool bridge:

```js
print(await tool.learner_file_ticket({ target, title, proposal, evidence, confidence: 'high' }));
```

The eval runtime documents `print` for exposing results; Learner does not assume a `display` global. Generated executable examples are exercised with the supported output contract, and fresh native QA must observe actual ticket/reporter acknowledgments.

The ticket tool is enabled by default rather than hidden/inactive, so stock dispatch can resolve it. The bridge invokes the same registered tool and native approval wrapper; it does not import the implementation or duplicate the action pipeline. The advisor still selects the eligible action and executes it. The returned `text`, `details.created`, `details.url`, and `hasError` when present are observed operation evidence; a thrown error or error result is not success. The read-only `learner_report_operations` tool uses the same supported bridge for formatting only.

The generated roster uses `tools: [read, grep, glob, learn, eval]`. User-owned tool/model/cadence overrides remain authoritative and are not rewritten by the plugin. An override that prevents inspection of required sources leaves an eligible shared-guidance coverage review incomplete; do not file that proposal without the review. An override without `eval`, an unavailable JavaScript runtime, or a disabled session ticket tool blocks an eligible ticket operation. Existing user approval/denial policies remain authoritative. If the reporting bridge is unavailable or denied, generated guidance permits only the same plain-text layout with observed coverage/eligible-operation evidence, without pretending the formatter ran or bypassing the override.

**Capability boundary:** Native `eval` is execution-capable and can dispatch enabled primary-session tools; restricting Learner to bounded read/grep/glob coverage lookup, ticket dispatch, and read-only reporting is prompt policy, not a hard sandbox. The guidance forbids implementation imports, helper definitions, dependency installation, direct file/network access, commands, verifier execution, and unrelated eval-bridged tools. No model/provider change, unconditional runner, or custom agent runtime is introduced.

## Operation Results and Silence

The generated advisor prompt keeps the model as the eligible-signal selector and executor. Before proposing reusable shared guidance, it uses only the existing `read`, `grep`, and `glob` tools for the bounded coverage review; eligible actions use the existing core `learn` and approval-gated `learner_file_ticket` paths. It collects the coverage decision and observed action results, then calls the pure Learner-owned reporter once. One non-blocking `advise` note (`severity: nit`) relays the returned readable text verbatim—not a JSON array, returned wrapper, code fence, model paraphrase, or added review, recommendations, recovery instructions, strategy, progress, or no-action notices.

Each result contains:

| Field | Contract |
| --- | --- |
| `operation` | `guidance_coverage` for the read-only coverage decision, `learn`, or `learner_file_ticket`. |
| `outcome` | `covered`, `not_covered`, or `incomplete` for coverage; `acknowledged` for core learning; `created` or `reused` for ticket results; `blocked` for an observed missing prerequisite or denied approval; `failed` for an attempted tool error. |
| `subject` | Concise lesson, proposal, or coverage candidate identity. |
| `evidence` | Exact current guidance/released-work citation for covered guidance; examined sources and bounded lookup result for not-covered guidance; unavailable source for an incomplete lookup; actual core acknowledgment, exact returned ticket URL, or bounded observed error for actions. |

[`report.mjs`](../../omp-plugin/learner/report.mjs) supplies the read-only `learner_report_operations` tool:

```js
print(await tool.learner_report_operations({ records, format: 'text' }));
```

Both `text` and `json` represent the same four fields; the returned `details.records` retains the structured array for machine consumers. Text renders `outcome operation: subject`, followed by indented evidence lines, with a blank line between operations. JSON serializes the records without changing their evidence. Multiline acknowledgments/errors remain multiline; exact URLs are preserved. Empty records render empty text (or `[]` for JSON), but the advisor must not call the reporter or deliver a note without a current eligible signal and an observed coverage/action record.

The formatter has no action, retry, routing, memory, network, or filesystem responsibilities. It does not independently verify model-supplied coverage records or upgrade acknowledgments into proof of persistence. Focused checks in [`verify-learning-reports.mjs`](../../scripts/verify-learning-reports.mjs) exercise observable representations and immutable inputs; native QA must compare completed Learner transcripts and delivered notes against actual coverage/tool/reporter results.

The ticket tool's existing `details: { created, url }` is authoritative: `created: true` means created, `false` means reused. The corresponding explicit tool-result text carries the same outcome/URL if structured details are not visible to the advisor. No invented issue number, implementation claim, or automatic policy activation follows from filing a proposal.

Learning acknowledgment is not confirmation of backend consolidation, global availability, or completion of the shared-ticket action. A shared issue is a central, reviewable record; the preference becomes active cross-project guidance only after the owning shared package has implemented, reviewed, released, and installed it. Learner does not perform those steps or claim they occurred without evidence. Report coverage, ticket, and optional memory outcomes independently.

No eligible signal means no coverage lookup, learning/ticket action, or `advise` call. Ordinary requests, uncertainty, read-only/remote-only activity alone, unrelated UI/filter review, Python eval failures, and verifier PASS/FAIL/BLOCKED results remain silent. An unrelated failure or ineligible signal must not become a Learner blocker. Eligible failures use non-blocking `nit` severity, do not stop primary work, and do not bypass denied approval.

**Enforcement boundary:** Learning classification, scope/owner selection, ticket-first selection, evidence eligibility, bounded coverage review, result-only delivery, once-only reporting, and silence are generated prompt policy—not a programmatic semantic admission filter or guarantee about every future model decision. The ticket tool separately enforces allowed repository destinations before issue lookup/create. OMP owns native advisor scheduling, tool availability, approval, delivery, and memory; its UI may still label these messages **Advisor**. Model/provider routes, user advisor overrides, independent advisors, deduplication, and redaction remain unchanged.

## Ownership and Routing

The selected target must match the actual behavior owner, not the repository where a symptom appeared:

| Concern | Learner target | Destination and boundary |
| --- | --- | --- |
| Reusable personal preference, guidance, or style convention | `knowledge_base` | Configured shared-guidance repository; defaults to [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). Project context alone does not localize a personal preference. Ticket first, optional core memory afterward. |
| Explicitly project-specific or domain-dependent correction | `local` | The active checkout's GitHub `origin`; context-only facts are not automatic proposals, and product-specific knowledge is not a shared or Learner-owned collection. |
| Learner's identification, classification, capture/routing, reporting, command, or guidance lifecycle | `learner` | [`omp-learner`](https://github.com/klondikemarlen/omp-learner) owns only this plugin's implementation and maintainer docs, never unrelated general project knowledge. Do not route generic OMP, built-in tool, browser, GraphQL, repository-boundary, or other-plugin behavior here. |
| Reusable verifier integration for an accepted shared rule | `reusable_check` | The configured shared knowledge base, defaulting to [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools), receives the proposal. The actual provider owns supplied check implementations/manifests. Prefer an applicable supplied check; Learner does not implement or execute it. |
| Project-only integration or verification of an accepted project rule | `project_check` | The active project's `origin`; the project owns the accepted rule and integration/check proposal, even when it uses a supplied package's check. |
| Verifier discovery, execution, trigger/suppression/evidence, or advisor correction runtime | `verifier` | [`omp-verifier`](https://github.com/klondikemarlen/omp-verifier) owns this runtime. Do not send these concerns to Learner or invent a generic check policy. |
| Evidenced related user-owned project | `related` + `repository` | A normalized `klondikemarlen/repository`, such as [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard). No external owner or fallback destination. |

When ownership is unclear, inspect available source and installed/plugin metadata before routing; do not guess from the surface where a problem appeared. A ticket target is not proof that the destination owns the concern. Do not file upstream OMP issues or redirect outside-owner concerns into unrelated user projects.

The runtime boundary permits an explicitly configured, normalized GitHub knowledge-base repository for `knowledge_base` and `reusable_check`, regardless of its owner or the active origin. Both shared proposal types use the same configuration; neither silently falls back to the default or active project. `/learner setup owner/repository` or an HTTPS GitHub repository URL selects this destination, which is embedded in generated guidance so coverage lookup uses the correct owner. Project targets still require the active checkout's GitHub `origin`; `related` still requires `klondikemarlen/*`; Learner and Verifier implementation targets retain their fixed actual owners. Invalid destinations fail before any GitHub issue lookup/create. Configuration does not bypass native write approval.

The default shared target changes from `klondikemarlen/omp-config` to `klondikemarlen/marlens-skills-rules-and-tools`. Reads expose the migrated configuration without writing; setup/session reconciliation persists it through the existing configuration writer. Other explicit destinations and disabled state remain intact. Actual local/related tickets for `omp-config` retain that repository rather than undergoing shared-default migration.

Soft-boundary-guard's installed extension is advisory and fail-open, so its warnings do not enforce Learner's restriction. Learner owns this narrow ticket-destination policy; no guard runtime, reviewed policy, credentials, or global model settings are changed.

## Proposal Hygiene and Authority

Ticket fields are normalized and length-limited before filing. Current source evidence belongs in the proposal; redact sensitive data and avoid unnecessary private or unrelated context. The implementation redacts common GitHub/AWS token patterns and common labeled bearer/token/password/secret values; this is not a guarantee that every secret format is recognized, so review content before filing.

Before filing an eligible proposal, the advisor reads a bounded open listing such as `issue://OWNER/REPO?state=open&limit=5` for the normally resolved destination, then inspects likely candidate bodies within the same lookup budget. It compares requested outcome and durable rule, not only keywords, subject wording, fingerprints, or compatible framework/theme-preservation detail. An equivalent open proposal can be selected with the optional positive integer `existingIssueNumber`. The action rechecks its OPEN state, issue number, and canonical GitHub URL in that repository; success returns the actual URL with `details.created: false`. Closed, stale, invalid, or wrong-repository selections fail without creating a replacement. Without a selection, the existing full-content fingerprint lookup and ordinary creation remain unchanged.

Pending proposals are not released-guidance coverage. Unavailable required lookup sources block filing; bounded negative results are not an exhaustive semantic guarantee. Semantic comparison remains advisor policy, while selected issue state/repository validation is enforced by the action. No second model call, fuzzy text heuristic, new tool, or stateful formatter is introduced.

Destination maintainers decide whether to accept, refine, implement, or close a proposal. Learner does not change the accepted rule or claim that a check has been installed. Ordinary failures without an eligible durable correction do not justify a ticket.

## Evidence and Source Conflicts

The current code is the authority for implemented behavior; tests show only the cases they execute. [`README.md`](../../README.md) summarizes the current core-learning and ticket workflow, while this document explains its ownership boundaries. Older descriptions of Learner as a standalone replacement watchdog are stale: generated guidance is agent-owned, while the runtime uses OMP's native `learn` tool. Re-check the linked implementation and tests before changing this model.
