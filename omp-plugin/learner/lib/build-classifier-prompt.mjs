import { redactText } from './redact-text.mjs';

export function buildClassifierPrompt(feedback) {
  return `Use docs/workflows/learner-feedback-workflow.md to classify this user feedback.\n\nFeedback:\n${redactText(feedback)}\n\nStored learner history is intentionally not injected into classification yet; keep pending candidates human-reviewed and keep adaptive summaries disabled until an executable eval proves they reduce noise without increasing verifier overlap.\n\nReturn one candidate JSON object only if it is high-confidence and durable. Use category ambiguous_needs_review for uncertain feedback, insufficient_context for commit grouping without structured visible provenance, and one_off_no_action for local nits. For commit_file_grouping, include provenance.kind as diff, staged_files, commit_hash, or local_committing_doc and provenance.reference naming the visible source. Do not persist, file issues, commit, push, edit files, or ask the user to run hidden learner subcommands.`;
}

export default buildClassifierPrompt;
