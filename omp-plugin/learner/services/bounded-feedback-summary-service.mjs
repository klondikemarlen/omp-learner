import { SUMMARY_LIMIT } from '../constants.mjs';
import BaseService from '../lib/base-service.mjs';

export class BoundedFeedbackSummaryService extends BaseService {
  constructor(store, limit = SUMMARY_LIMIT) {
    super();
    this.store = store;
    this.limit = limit;
  }

  perform() {
    return [
      'Recent accepted examples:',
      ...this.#acceptedExamples().map((item) => `- ${item.category}: ${item.proposedRule} (${item.scope})`),
      'Recent rejected/noisy examples:',
      ...this.#rejectedExamples().map((item) => `- ${item.category}: ${item.feedbackLabel || 'rejected'} — ${item.proposedRule}`),
      'Recent edited examples:',
      ...this.#editedExamples().map((item) => `- ${item.after.category}: ${item.after.proposedRule}`),
      'Recent user feedback on learner quality:',
      ...this.#userFeedback().map((item) => `- ${item.label}: ${item.rationale}`),
    ].join('\n');
  }

  #acceptedExamples() {
    return this.store.decisions.filter((item) => item.status === 'accepted').slice(-this.limit);
  }

  #rejectedExamples() {
    return this.store.decisions.filter((item) => item.status === 'rejected').slice(-this.limit);
  }

  #editedExamples() {
    return this.store.edits.slice(-this.limit);
  }

  #userFeedback() {
    return this.store.feedback.slice(-this.limit);
  }
}

export default BoundedFeedbackSummaryService;
