export const STORE_VERSION = 1;
export const MAX_EXCERPT = 500;
export const SUMMARY_LIMIT = 5;
export const RECORD_TOOL_NAME = 'learner_record_candidate';

export const COMMIT_CONTEXT_KINDS = new Set(['diff', 'staged_files', 'commit_hash', 'local_committing_doc']);

export const CATEGORIES = new Set([
  'project_code_style',
  'cross_project_code_style',
  'test_style',
  'commit_file_grouping',
  'commit_message_style',
  'workflow_or_tooling',
  'one_off_no_action',
  'ambiguous_needs_review',
  'insufficient_context',
]);

export const FEEDBACK_LABELS = new Set(['useful', 'noisy', 'wrong-scope', 'wrong-destination']);
export const NON_RECORDING_CATEGORIES = new Set(['one_off_no_action', 'ambiguous_needs_review', 'insufficient_context']);
