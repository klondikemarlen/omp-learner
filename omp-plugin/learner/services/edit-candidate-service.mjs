import BaseService from '../lib/base-service.mjs';
import { normalizeCandidate } from '../lib/normalize-candidate.mjs';
import { timestamp } from '../lib/timestamp.mjs';

export class EditCandidateService extends BaseService {
  constructor(store, id, patch) {
    super();
    this.store = store;
    this.id = id;
    this.patch = patch;
  }

  perform() {
    const record = this.#findPendingCandidate();
    const before = { ...record };

    this.#applyPatch(record);
    this.#recordEdit(before, record);
    return record;
  }

  #applyPatch(record) {
    Object.assign(record, normalizeCandidate({ ...record, ...this.patch }), { updatedAt: timestamp(), status: 'edited' });
  }

  #recordEdit(before, record) {
    this.store.edits.push({ id: this.id, editedAt: record.updatedAt, before, after: { ...record } });
  }

  #findPendingCandidate() {
    const record = this.store.pending.find((candidate) => candidate.id === this.id);
    if (!record) throw new Error(`Unknown pending candidate: ${this.id}`);
    return record;
  }
}

export default EditCandidateService;
