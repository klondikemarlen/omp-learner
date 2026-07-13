import BaseService from '../lib/base-service.mjs';
import { normalizeCandidate } from '../lib/normalize-candidate.mjs';
import { timestamp } from '../lib/timestamp.mjs';

export class AddCandidateService extends BaseService {
  constructor(store, candidate) {
    super();
    this.store = store;
    this.candidate = candidate;
  }

  perform() {
    const record = this.#buildCandidateRecord();
    this.#addRecord(record);
    return record;
  }

  #buildCandidateRecord() {
    const now = timestamp();
    return {
      id: `lf-${this.store.nextId}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ...normalizeCandidate(this.candidate),
    };
  }

  #addRecord(record) {
    this.store.pending.push(record);
    this.store.nextId += 1;
  }
}

export default AddCandidateService;
