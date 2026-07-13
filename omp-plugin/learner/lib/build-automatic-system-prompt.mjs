import { RECORD_TOOL_NAME } from '../constants.mjs';

export function buildAutomaticSystemPrompt() {
  return `Learner automatic triage is enabled. For the current user prompt only, decide whether it contains explicit durable feedback about code style, test style, commit message style, commit file grouping, or reusable workflow/tooling guidance. If it does, call ${RECORD_TOOL_NAME} exactly once with a pending learner candidate. Do not call the tool for one-off wording nits, verifier evidence/PASS/FAIL/BLOCKED feedback, ordinary task instructions, or uncertain feedback. For commit_file_grouping, only use that category when provenance.kind is diff, staged_files, commit_hash, or local_committing_doc and provenance.reference names the visible source; otherwise use insufficient_context or do not record. Stored learner history is not part of this classification.`;
}

export default buildAutomaticSystemPrompt;
