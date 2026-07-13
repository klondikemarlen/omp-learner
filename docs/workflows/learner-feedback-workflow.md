# Learner Feedback Workflow

Use when a user explicitly asks the package learner to triage feedback about code style, test style, commit messages, commit file grouping, or reusable workflow/tooling guidance.

## Gold

The learner proposes durable learnings conservatively, keeps every candidate human-reviewed, and never overlaps with `omp-verifier` evidence review.

## OMP API Finding

The current public OMP extension API supports commands, tools, session events, messages, and optional memory. `ctx.models` is query-only; `pi.pi.createAgentSession` can spawn a full nested agent session, but this package rejects that path because it recursively loads extension/tool surfaces, has broad cost and side-effect risk, and does not provide a narrow learner-classifier contract. There is no safe public in-session advisor/model-call bridge for plugins. OMP does support `before_agent_start` system-prompt appends and default-inactive tools, so `/learner on` follows the verifier-style lifecycle: turn on persisted guidance, activate the recording tool, and let the current model turn decide whether the user's prompt contains durable feedback.

Boundary with OMP built-in learning: this package does not read or write `autolearn.enabled` state. Use `/learner on` only when you want this package's durable-guidance triage; if built-in autolearn is also enabled, keep promoted learner candidates human-reviewed to avoid duplicate persistence.

Use this package's explicit `/learner` command path:

- `/learner on` enables automatic learner triage for future turns.
- `/learner off` disables automatic learner triage and deactivates the recording tool.
- `/learner status` reports enabled state, tool state, pending candidates, and store path.
- `learner_record_candidate` is a default-inactive LLM-callable tool. `/learner on` activates it so the current model turn can store one high-confidence pending candidate for later human review without exposing manual slash subcommands.

The command stores `feedback-store.json` under the active OMP agent directory (`pi.pi.getAgentDir()/learner/`), or `OMP_LEARNER_DIR` when set for tests or explicit relocation. Writes are bounded, redacted, and local; the plugin does not use plugin-manager internals as storage.

## Categories

Use exactly one category:

- `project_code_style`
- `cross_project_code_style`
- `test_style`
- `commit_file_grouping`
- `commit_message_style`
- `workflow_or_tooling`
- `one_off_no_action`
- `ambiguous_needs_review`
- `insufficient_context`

## Candidate Fields

A candidate contains:

- `category`
- `proposedRule`
- `scope`
- `rationale`
- `suggestedDestination`
- `evidence` or `promptExcerpt` containing only a redacted bounded excerpt
- `provenance.kind`
- `provenance.reference`
- `confidence`
- `whenNotToApply`
- `relationshipToExistingGuidance`

For `commit_file_grouping`, structured provenance is required. `provenance.kind` must be one of `diff`, `staged_files`, `commit_hash`, or `local_committing_doc`, and `provenance.reference` must name the visible source. If the visible context is only negative text like "no diff or staged files were visible", use `insufficient_context`.

## Decision Rules

- High-confidence durable feedback: propose a pending candidate.
- Uncertain feedback: use `ambiguous_needs_review`.
- One-off/local wording nits: use `one_off_no_action`.
- Commit grouping without visible diff, staged files, commit hash, or local `COMMITTING.md`: use `insufficient_context`.
- Do not auto-persist to long-term memory.
- Do not file issues, edit files, stage, commit, push, or release.
- Redact emails, tokens, and long opaque secrets before storing excerpts.
- Do not inject stored learner history into classification until an executable eval proves adaptive summaries improve relevance without increasing verifier overlap or noisy emissions.

## Boundary With omp-verifier

The learner owns durable-learning candidates from explicit user feedback.

`omp-verifier` owns evidence, tests, `PASS`/`FAIL`/`BLOCKED`, and whether completed work is proven.

The learner must not block completion, demand tests, or re-review implementation evidence. `omp-verifier` must not persist learnings or propose upstream prompt/rule changes.

## Evaluation

Use `docs/evals/learner-feedback.json` as the small labeled fixture set. The eval must include accepted, rejected/noisy, wrong-scope, wrong-destination, verifier-overlap, and insufficient-context examples. Feedback summaries may be used only when they improve relevance without increasing verifier overlap or noisy emissions.
