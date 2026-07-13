import BaseService from '../lib/base-service.mjs';
import { redactText } from '../lib/redact-text.mjs';
import { timestamp } from '../lib/timestamp.mjs';

export class PromoteCandidateService extends BaseService {
  constructor(store, id, rationale = '') {
    super();
    this.store = store;
    this.id = id;
    this.rationale = rationale;
  }

  perform() {
    const candidate = this.#removePendingCandidate();
    const decision = this.#buildDecision(candidate);
    this.#recordDecision(decision);
    return decision;
  }

  #buildDecision(candidate) {
    return {
      ...candidate,
      status: 'accepted',
      decidedAt: timestamp(),
      userRationale: redactText(this.rationale),
    };
  }

  #recordDecision(decision) {
    this.store.decisions.push(decision);
  }

  #removePendingCandidate() {
    const index = this.store.pending.findIndex((candidate) => candidate.id === this.id);
    if (index === -1) throw new Error(`Unknown pending candidate: ${this.id}`);

    const [candidate] = this.store.pending.splice(index, 1);
    return candidate;
  }
}

export default PromoteCandidateService;
