export function isLearnerWorkflowPrompt(promptText) {
  const text = String(promptText || '');
  return text.startsWith('Use docs/workflows/learner-feedback-workflow.md')
    || text.startsWith('Review learner candidate ')
    || text.includes('through docs/workflows/learn-workflow.md before persisting it');
}

export default isLearnerWorkflowPrompt;
