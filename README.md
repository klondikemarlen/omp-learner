# OMP Learner

OMP Learner identifies and classifies durable learning for integration into a configurable shared knowledge-base repository, where skills, rules, and workflows are maintained. The default is [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools); other users can select their own GitHub repository. Learner considers potential verification through supplied checks compatible with [`omp-verifier`](https://github.com/klondikemarlen/omp-verifier). It submits reviewable proposals; it is not a general project-knowledge store or a verifier executor. Project-specific corrections and knowledge stay with their owning project. OMP's native `learn` memory is supplementary, not proof of global availability. This plugin owns the marked `learner` advisor entry, one bounded ticket action tool, and a pure operation-report formatter.

## Install

```bash
omp plugin install github:klondikemarlen/omp-learner
```

Restart OMP after installing or reinstalling so a fresh session discovers the extension.

Optional support: [Ko-fi](https://ko-fi.com/klondikemarlen).

## Learning Classification and Integration

When enabled, Learner installs a marked `learner` advisor beside OMP's `default` advisor. It identifies current durable corrections, classifies their learned behavior, scope, owner, and relevant rule/skill/workflow, then reviews existing coverage before proposing a missing integration. Personal code-style, testing, workflow, communication, and interaction preferences are actionable shared-guidance proposals even when no product source-code change is requested. No separate request to track the preference is required; native tool approval still applies.

A preference first expressed while working in one named repository is not automatically project-specific. Reusable learning routes to the shared guidance owner; only expressly project-limited or domain/schema/implementation-dependent corrections route to the active project. Routine facts such as service addresses, schema descriptions, terminology, and operational notes are context, not automatic ticket or memory actions. They belong in the owning project's documentation or memory, never in Learner as a collection of unrelated project knowledge. Learner's own [maintainer docs](docs/README.md) describe only this plugin and its integration boundaries.

Before proposing shared guidance, Learner compares the current signal with the target owner's current guidance and relevant completed work through a [bounded coverage review](docs/architecture/ownership-and-signals.md#current-shared-guidance-coverage). Equivalent released guidance yields a cited `covered guidance_coverage` result without another ticket. A genuinely different missing preference remains eligible; unavailable required sources yield `incomplete`, not an invented coverage claim. Archived conversations lacking ticket acknowledgments do not establish a present gap.

For a genuinely missing preference, ticket filing comes before optional supplementary memory. An earlier `Lesson stored.` acknowledgment does not complete that shared-ticket action: OMP memory may be project- or worktree-scoped. A returned existing ticket completes the capture without another issue. Denied, unavailable, or failed ticket filing remains blocked/failed rather than being replaced by memory-only success.

**Recorded is not active:** a shared issue makes the preference reviewable in the shared repository; it does not itself install a global rule. Cross-project behavior depends on the guidance being reviewed, implemented, released, and installed through the shared package's normal workflow. Learner does not automatically implement proposals or change OMP's memory backend.

Project-only proposals route to the active checkout's GitHub `origin`. Shared guidance and reusable verifier-integration proposals use the configured knowledge-base repository, defaulting to [`klondikemarlen/marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools). That default is not mandatory: any valid GitHub owner/repository may be configured, independently of the active checkout or repository namespace, and native write approval still applies. The previous generic `klondikemarlen/omp-config` default migrates to the new default; other explicit configured targets are preserved.

Related proposals require source evidence identifying the owner and use `target: 'related'` with `repository: 'klondikemarlen/owner-project'`, such as `klondikemarlen/omp-soft-boundary-guard`. Their existing `klondikemarlen/*` restriction is separate from the configurable shared destination. Malformed configured repositories and external related targets are rejected before GitHub issue lookup/create, without fallback. Selecting a shared knowledge base does not authorize unrelated upstream issues or redirect another owner's work there.

When tool ownership is unclear, inspect installed/plugin source metadata and the user's own repositories first. Ownership uncertainty is not permission to file elsewhere. [`omp-soft-boundary-guard`](https://github.com/klondikemarlen/omp-soft-boundary-guard) provides advisory warnings, not enforcement of this restriction; Learner enforces its own ticket destinations without changing the guard's policy.

Learner can classify potential verification without executing or activating anything. When a user explicitly requests verification support for an accepted shared or project rule, it can file a reviewable verifier-integration proposal with source evidence, candidate owner, deterministic or agentic classification, Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Relevant supplied-check metadata in package.json `omp.verifications` identifies existing check IDs, entries, and triggers; reuse an applicable supplied verifier rather than proposing a duplicate implementation. The shared package or owning project supplies checks; [`omp-verifier` discovers and executes declared checks](https://github.com/klondikemarlen/omp-verifier#verification-manifests). Reusable provider/check changes route to the shared repository, project-only integration to the active project, and verifier runtime/discovery gaps to `omp-verifier`. A classification or issue does not prove a verifier is installed, active, applicable, or passing.

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

`/learner setup` enables the ticket-first advisor and keeps the current shared destination. Use `/learner setup your-account/knowledge-base` or an HTTPS GitHub repository URL to select your own knowledge base; both shared-guidance and reusable-verifier proposals use it. The default remains `klondikemarlen/marlens-skills-rules-and-tools`. Configuration selects the destination but does not bypass native write approval. `/learner status` shows that destination and the integration/ownership boundaries. `/learner off` removes only Learner's marked entry and preserves verifier configuration and user-owned Learner notes.

## Release and install verification

After a release is merged to `main` and reachable on GitHub:

```bash
omp plugin uninstall omp-learner
omp plugin install github:klondikemarlen/omp-learner --force
omp plugin list --json
```

Confirm the listing contains an enabled `omp-learner` entry with `./omp-plugin/index.ts` and the released package version, then restart OMP. In a fresh session, run `/learner status` and inspect `/advisor status` for a resolved Learner model; exercise command autocomplete and readable reporting.

Run local checks with `npm test`; they cover configuration migration, default/custom shared-guidance and reusable-verifier destinations, readable/JSON report parity, acknowledgment, exact created/reused URLs, multiline evidence, mixed outcomes, and invalid/related-destination rejection before GitHub actions without creating issues. For native QA, use isolated ticket responses and compare completed named Learner transcripts, actual tool/reporter evidence, and delivered primary notes. Verify the default and a different user's configured repository for both shared proposal types, owner-local corrective rules, and Learner-owned implementation improvements. Contrast context-only project facts in an ordinary project and a Learner checkout: neither should trigger automatic knowledge capture. Supplied-verifier proposals must reuse relevant metadata without installing or executing checks, and reports must not claim a proposal activates guidance or proves verification. Keep existing denied-action, ordinary-work silence, and supplementary-memory boundaries covered when affected. Use real GitHub only for genuine authorized improvements—never release-verification fixtures.

## GitHub Actions pinning

Pin every third-party GitHub Actions `uses:` reference to its full immutable commit SHA. Keep a human-readable version comment when useful; never replace the SHA with a mutable tag.
