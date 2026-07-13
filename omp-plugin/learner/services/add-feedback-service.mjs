import { FEEDBACK_LABELS } from '../constants.mjs';
import BaseService from '../lib/base-service.mjs';
import { redactText } from '../lib/redact-text.mjs';
import { timestamp } from '../lib/timestamp.mjs';

export class AddFeedbackService extends BaseService {
  constructor(store, id, label, rationale = '') {
    super();
    this.store = store;
    this.id = id;
    this.label = label;
    this.rationale = rationale;
  }

  perform() {
    this.#validateLabel();
    const record = this.#buildFeedbackRecord();
    this.#recordFeedback(record);
    return record;
  }

  #validateLabel() {
    if (!FEEDBACK_LABELS.has(this.label)) throw new Error(`Feedback label must be one of: ${[...FEEDBACK_LABELS].join(', ')}`);
  }

  #buildFeedbackRecord() {
    return {
      id: this.id,
      label: this.label,
      rationale: redactText(this.rationale),
      createdAt: timestamp(),
    };
  }

  #recordFeedback(record) {
    this.store.feedback.push(record);
  }
}

export default AddFeedbackService;
