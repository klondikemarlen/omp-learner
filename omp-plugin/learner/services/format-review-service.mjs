import BaseService from '../lib/base-service.mjs';

export class FormatReviewService extends BaseService {
  constructor(store) {
    super();
    this.store = store;
  }

  perform() {
    if (this.store.pending.length === 0) return 'No pending learner candidates.';

    return this.store.pending.map((candidate) => this.#formatCandidate(candidate)).join('\n\n');
  }

  #formatCandidate(candidate) {
    return [
      `### ${candidate.id} — ${candidate.category}`,
      `Rule: ${candidate.proposedRule || '(none)'}`,
      `Scope: ${candidate.scope || '(unspecified)'}`,
      `Destination: ${candidate.suggestedDestination || '(unspecified)'}`,
      `Confidence: ${candidate.confidence || '(unspecified)'}`,
      `Provenance: ${candidate.provenance?.kind || '(none)'} ${candidate.provenance?.reference || ''}`.trim(),
    ].join('\n');
  }
}

export default FormatReviewService;
