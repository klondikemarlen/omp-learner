import assert from 'node:assert/strict';
import { createLearnerSourceTool } from '../omp-plugin/learner/source.mjs';

const tool = createLearnerSourceTool({ z: { object: (shape) => shape } });
const report = {
  type: 'custom_message',
  customType: 'advisor',
  details: { notes: [{ advisor: 'learner', note: 'covered guidance_coverage: Keep source READMEs focused on layer guidance' }] },
};

const resumedOrdinaryTurn = await tool.execute('resumed-ordinary', {}, undefined, undefined, {
  sessionManager: { getBranch: () => [
    { type: 'message', id: 'correction', message: { role: 'user', attribution: 'user', content: [{ type: 'text', text: 'Correction: no feature summaries in source READMEs.' }] } },
    report,
    { type: 'message', id: 'question', message: { role: 'user', attribution: 'user', content: [{ type: 'text', text: 'Do we still need ordering here?' }] } },
  ] },
});
assert.deepEqual(resumedOrdinaryTurn.details, {
  source: { id: 'question', text: 'Do we still need ordering here?' },
  lastReport: 'covered guidance_coverage: Keep source READMEs focused on layer guidance',
});

const repeatedYield = await tool.execute('repeated-yield', {}, undefined, undefined, {
  sessionManager: { getBranch: () => [
    { type: 'message', id: 'correction', message: { role: 'user', content: 'Correction: no feature summaries in source READMEs.' } },
    report,
    { type: 'message', id: 'synthetic', message: { role: 'user', synthetic: true, attribution: 'agent', content: 'Continue your final review.' } },
  ] },
});
assert.deepEqual(repeatedYield.details, {
  source: { id: 'correction', text: 'Correction: no feature summaries in source READMEs.' },
  lastReport: 'covered guidance_coverage: Keep source READMEs focused on layer guidance',
});

const newRelatedCorrection = await tool.execute('new-correction', {}, undefined, undefined, {
  sessionManager: { getBranch: () => [
    { type: 'message', id: 'old', message: { role: 'user', content: 'Correction: no feature summaries in source READMEs.' } },
    { type: 'message', id: 'new', message: { role: 'user', content: 'Correction: put contributor commands before rationale.' } },
    report,
    { type: 'custom_message', customType: 'advisor', details: { notes: [{ advisor: 'verifier', note: 'Unrelated verification result' }] } },
  ] },
});
assert.deepEqual(newRelatedCorrection.details, {
  source: { id: 'new', text: 'Correction: put contributor commands before rationale.' },
  lastReport: 'covered guidance_coverage: Keep source READMEs focused on layer guidance',
});

const emptySource = await tool.execute('empty', {}, undefined, undefined, { sessionManager: { getBranch: () => [] } });
assert.deepEqual(emptySource.details, { source: null, lastReport: null });
await assert.rejects(() => tool.execute('unavailable', {}), /native session branch access is required/);
console.log('Authoritative source-window checks passed.');
