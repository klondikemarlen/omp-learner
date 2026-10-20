# OMP Learner

OMP Learner identifies and classifies durable learning for integration into a configurable shared knowledge-base repository, where skills, rules, and workflows are maintained. The default is [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools); other users can select their own GitHub repository. Learner considers potential verification through supplied checks compatible with [`omp-verifier`](https://github.com/klondikemarlen/omp-verifier). It submits reviewable proposals; it is not a general project-knowledge store or a verifier executor. Project-specific corrections and knowledge stay with their owning project. OMP's native `learn` memory is supplementary, not proof of global availability. This plugin owns the marked `learner` advisor entry, a read-only current-source view, one bounded ticket action tool, and a pure operation-report formatter.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

Optional support: [Ko-fi](https://ko-fi.com/klondikemarlen).

## Learning Classification and Integration

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It identifies human corrections and recurring workflow opportunities, checks whether their practical behavior and scope are already tracked in current guidance, and proposes genuinely missing learning to its owner. It classifies the learned behavior, scope, owner, and relevant rule/skill/workflow rather than evaluating adherence or executing workflows. Personal code-style, testing, workflow, communication, and interaction preferences are actionable shared-guidance proposals even when no product source-code change is requested. No separate request to track the preference is required; native tool approval still applies.

A preference first expressed while working in one named repository is not automatically project-specific. Reusable learning routes to the shared guidance owner; only expressly project-limited or domain/schema/implementation-dependent corrections route to the active project. Routine facts such as service addresses, schema descriptions, terminology, and operational notes are context, not automatic ticket or memory actions. They belong in the owning project's documentation or memory, never in Learner as a collection of unrelated project knowledge. Learner's own [maintainer docs](docs/README.md) describe only this plugin and its integration boundaries.

Before eligibility review, `learner_current_source` reads the latest real user message and last delivered Learner report from the native primary-session branch, plus bounded recent prompts and Learner reports for recurring-intent evidence and handled-pattern suppression. This avoids mistaking historical user blocks replayed during advisor startup/resume for current feedback. Source-only inspection is not a learning report. The advisor compares current intent with the reports; a delayed report alone must not suppress genuinely new learning or materially new coverage evidence. One-off questions and requests, repeated final-yield reviews, another instance of a handled workflow, and changed report wording do not reopen handled learning. Standing verification intent remains context for fresh corrections. Unavailable required sources yield `incomplete`, not an invented coverage claim.

For an ordinary correction, equivalent released guidance yields a cited `covered guidance_coverage` result and completes Learner's coverage responsibility: no duplicate guidance proposal and no code-adherence verdict are needed. Generated code may still violate that rule; a repeated violation alone does not show that Learner missed the learning. [`omp-verifier` separately evaluates code adherence and reports current verification evidence](https://github.com/klondikemarlen/omp-verifier/blob/main/docs/references/verifier-concepts-reference.md#ownership-boundaries). Coverage does not prove code compliance or verification coverage, and it does not end a separately authorized verification-integration proposal review. See the [needless-helper example and distinct outcomes](docs/architecture/ownership-and-signals.md#current-shared-guidance-coverage).

For a genuinely missing preference, ticket filing comes before optional supplementary memory. Before filing, Learner reviews a bounded current open-issue listing and likely candidate bodies through the existing read tools. Equivalent open proposals are reused by passing their positive `existingIssueNumber`; the tool rechecks OPEN state and canonical repository/issue URL and returns the actual reused receipt. Wording, fingerprints, and compatible detail do not establish a distinct requirement; materially different preferences remain eligible. A pending proposal is not released guidance. Lookup stays within the existing read budget and is not an exhaustive semantic guarantee; unavailable required sources block filing rather than justify another issue. An earlier `Lesson stored.` acknowledgment does not complete shared-ticket capture: OMP memory may be project- or worktree-scoped. Denied, unavailable, or failed ticket filing remains blocked/failed, not memory-only success.

**Recorded is not active:** a shared issue makes the preference reviewable in the shared repository; it does not itself install a global rule. Cross-project behavior depends on the guidance being reviewed, implemented, released, and installed through the shared package's normal workflow. Learner does not automatically implement proposals or change OMP's memory backend.

Project-only proposals route to the active checkout's GitHub `origin`. Shared guidance and reusable verifier-integration proposals use the configured knowledge-base repository, defaulting to [`klondikemarlen/marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). That default is not mandatory: any valid GitHub owner/repository may be configured, independently of the active checkout or repository namespace, and native write approval still applies. The previous generic `klondikemarlen/omp-config` default migrates to the new default; other explicit configured targets are preserved.

Related proposals require source evidence identifying the owner and use `target: 'related'` with `repository: 'klondikemarlen/owner-project'`, such as `klondikemarlen/omp-soft-boundary-guard`. Their existing `klondikemarlen/*` restriction is separate from the configurable shared destination. Malformed configured repositories and external related targets are rejected before GitHub issue lookup/create, without fallback. Selecting a shared knowledge base does not authorize unrelated upstream issues or redirect another owner's work there.

When tool ownership is unclear, inspect installed/plugin source metadata and the user's own repositories first. Ownership uncertainty is not permission to file elsewhere. [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard) provides advisory warnings, not enforcement of this restriction; Learner enforces its own ticket destinations without changing the guard's policy.

Learner can classify potential verification without executing or activating anything. An explicit verification-support request for an accepted rule, including a standing goal to reduce manual code corrections through supplied verification, permits a reviewable verifier-integration proposal without repeating the request per correction. Relevant package.json `omp.verifications` metadata identifies existing check IDs, entries, and triggers; reuse an applicable supplied verifier or propose the genuinely missing integration/verification contract, not another copy of covered guidance. Proposals include source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Qualitative standards need contextual criteria, not arbitrary size/complexity quotas. The shared package or owning project supplies checks; [`omp-verifier` discovers and executes declared checks](https://github.com/klondikemarlen/omp-verifier#verification-manifests). Reusable provider/check changes route to the configured shared repository, project-only integration to the active project, and evidenced verifier runtime/discovery gaps to `omp-verifier`. A classification or issue does not prove code compliance or that a verifier is installed, active, applicable, or passing.

One-off ordinary requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty are ignored. Read-only/remote-only activity, unrelated filter/UI review, and Python eval failures alone do not justify learning, tickets, or advice. Learner does not edit files, run commands or workflows, file pull requests, or start a second agent session.
Eligible correction coverage and recurring guidance-gap reviews, together with observed learning/ticket actions, produce one concise, evidence-backed readable report. An ordinary recurring task fully covered by an existing workflow stays silent; it does not produce a match report. Reported coverage stays separate from actions, with its examined-source citation and `covered`, `not_covered`, or `incomplete` outcome. Each action keeps its own outcome and observed acknowledgment, exact returned URL, or bounded error. Failed eligible actions remain non-blocking. Structured records remain available for programmatic use. See [Operation Results and Silence](docs/architecture/ownership-and-signals.md#operation-results-and-silence) for the result shape and enforcement boundary.

Repeated failed or unchanged edit calls are blocked with a recovery prompt so the agent can re-read the current state and retry with a fresh anchor.

Learner and `omp-verifier` preserve each other's marked roster entries on fresh sessions. The advisor requires OMP's normal `advisor.enabled` setting and an `advisor` model role. Core learning additionally requires `autolearn.enabled` and a supported memory backend.

### Recurring Requests and Existing Workflows

Learner can recognize a reusable multi-step task when you explicitly report recurring effort—such as “I keep retyping this release request”—or when at least three distinct real prompts in the active branch express the same task intent, including your current request. Different wording or input values do not require different skills. One-off tasks, retries of a failed attempt, and synthetic continuations do not count as recurring workflow opportunities.

Existing skills come first. For an ordinary recurring task fully covered by an existing workflow, the read-only match suppresses an unnecessary proposal: no Learner report, shortcut recommendation, ticket, or memory action follows. Explicit human corrections retain their cited `covered guidance_coverage` reports. The primary agent and default advisor own selecting and executing applicable workflows from ordinary intent; command omission or an agent's failure to select a workflow is not itself a maintained-guidance gap.

A missing workflow or concrete discoverability, parameterization, or composition gap produces one reviewable proposal to the configured shared owner, with source evidence, intended inputs/outcome, completion and approval boundaries, and existing skills to reuse. Expressly project-only workflows stay with their project. Learner does not create or install the skill itself, add another advisor, or implement a `/one -> /two` chaining language. Verifier continues to evaluate supplied requirements, not police command use.

Post-completion user coaching—“you could have done this with less work by ...”—belongs to the separate [`omp-trainer`](https://github.com/klondikemarlen/omp-trainer) project. Coaching-only requests are not Learner signals, even when they mention recurring effort. Learner does not provide efficiency tips, add a completion callback, enable Trainer, or depend on its runtime. The [initial Trainer implementation ticket](https://github.com/klondikemarlen/omp-trainer/issues/1) owns that independent delivery; this separation does not establish that Trainer is implemented or installed.

History is intentionally bounded: the latest 12 real prompts and 8 Learner reports in the active branch, newest first, with each history text capped at 2,000 characters and explicit truncation flags. The latest source and last report remain available in full. There is no separate prompt archive or automatic cross-session discovery; a current user report of cross-session recurrence is labeled user-reported evidence. See the [recurring-workflow contract](docs/architecture/ownership-and-signals.md#recurring-workflow-opportunities) for source fields and proposal boundaries.

### Ticket Content Limits

Ticket filing preserves Markdown headings, paragraphs, lists, and code fences in proposals, evidence, and verifier-detail fields while redacting secrets. Each multiline field accepts up to 6,000 characters; titles accept 120, and candidate owners and related-repository inputs accept 200. The tool schema and description expose the remaining field limits and supported values (`confidence: 'high'`, optional `proposalType: 'verifier_check'`).

An oversized field or generated issue body (maximum 65,536 characters) is rejected explicitly before repository resolution or GitHub issue lookup/create. Nothing is silently truncated. Deduplication includes the complete accepted, redacted proposal, so proposals that differ after the former 2,000-character cutoff remain distinct.

### Stock OMP Tool Grants

The generated Learner roster grants `read`, `grep`, `glob`, `learn`, and `eval`. Stock OMP does not directly expose extension tools to named advisors; Learner first uses `print(await tool.learner_current_source({}))` through the built-in JavaScript runtime, then `print(await tool.learner_file_ticket(ticket))` for an eligible authorized action. The source view reads existing native session data; it creates no store or capture operation. `print` is the documented eval output helper; no `display` global is assumed. The ticket tool retains native write approval, validation, routing, deduplication, and redaction. After eligible actions, the same bridge calls `print(await tool.learner_report_operations({ records, format: 'text' }))`; native notes relay only the formatter's rendered text. Machine consumers can request `format: 'json'`; both report formats retain the same records in `details.records`. No OMP patch, new action pipeline, or replacement agent runtime is required.

Explicit user advisor overrides are preserved. An override must include `eval` to support ticket dispatch; disabled/unavailable JavaScript or a disabled ticket tool is an honest blocker for an otherwise eligible proposal. Do not bypass denial or silently change approval policies.

`eval` is execution-capable and can reach enabled primary-session tools. Restricting Learner to source inspection, ticket dispatch, and pure reporting is prompt policy, not a hard sandbox. The generated guidance forbids direct implementation imports, helper definitions, package installation, file/network access, shell commands, verifier checks, and unrelated tool calls through eval. The source view is stateless and read-only; the formatter only renders supplied evidence and neither executes/retries actions nor independently proves outcomes. Native transport may still label the resulting note **Advisor**.

### Guidance lifecycle

Learner uses the same agent-owned guidance model as the installed `omp-verifier`: the marked roster imports `learner/WATCHDOG.md` from the active agent directory, not a package path. This keeps guidance tied to its configuration and lets both advisors preserve each other's marked roster blocks.

Setup and the next session after a reinstall refresh the generated guidance. `/learner off` removes Learner's marked roster entry and recognizable guidance file, keeps the disabled agent-owned configuration for status and re-enablement, and preserves unrelated agent configuration.

## Commands

```text
/learner setup [owner/repository]
/learner off
/learner status
```

`/learner setup` enables the ticket-first advisor and keeps the current shared destination. Use `/learner setup your-account/knowledge-base` or an HTTPS GitHub repository URL to select your own knowledge base; both shared-guidance and reusable-verifier proposals use it. The default remains `klondikemarlen/marlens-skills-rules-and-tools`. Configuration selects the destination but does not bypass native write approval. `/learner status` shows that destination and the integration/ownership boundaries. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin uninstall omp-learner
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts` and the released package version, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor status` for a resolved Learner model; exercise command autocomplete and readable reporting.

Run local checks with `npm test`; they cover configuration migration, default/custom shared-guidance and reusable-verifier destinations, readable/JSON report parity, acknowledgment, exact created/reused URLs, multiline evidence, mixed outcomes, and invalid/related-destination rejection before GitHub actions without creating issues. For native QA, use isolated ticket responses and compare completed named Learner transcripts, actual tool/reporter evidence, and delivered primary notes. Verify the default and a different user's configured repository for both shared proposal types, owner-local corrective rules, and Learner-owned implementation improvements. Contrast context-only project facts in an ordinary project and a Learner checkout: neither should trigger automatic knowledge capture. Contrast a covered rule with and without a standing verification goal: only the requested verification-gap review should produce a missing-verification proposal, while preserving the separate covered-guidance result. Supplied-verifier proposals must reuse relevant metadata without installing or executing checks, and reports must not claim a proposal activates guidance or proves verification. Keep existing denied-action, ordinary-work silence, and supplementary-memory boundaries covered when affected. Use real GitHub only for genuine authorized improvements—never release-verification fixtures.

The opt-in multi-turn native replay regression is:

```bash
node scripts/verify-native-replay.mjs
```

It requires OMP installed and authenticated with the normal configured provider/model defaults; it makes multiple live-model calls and is intentionally not part of `npm test`. It creates temporary project/session/config data, uses synthetic owner guidance, and wraps the registered ticket action with isolated GitHub responses so no public issue is created. On failure, its event transcript and observed tool operations remain at the printed `/tmp/omp-learner-native-replay-<pid>.log` path. To exercise an installed package instead of this checkout, set `QA_PACKAGE_DIR` to its installed package root before running the same command.

The opt-in recurring-workflow regression uses the same native OMP/authentication prerequisites and isolated GitHub receipts:

```bash
node scripts/verify-native-workflows.mjs
```

It exercises silence for ordinary recurring tasks covered by existing skills and for post-completion coaching-only requests, three semantically equivalent task prompts producing one missing-workflow proposal, handled replay silence, and unrelated-current-prompt silence. `QA_PACKAGE_DIR` selects an installed package. Failure evidence retains named Learner transcripts and actual operation receipts at the printed temporary log path. Synthetic owner guidance and isolated receipts prove classification and transport in the exercised cases, not acceptance or installation of a real shared skill.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
