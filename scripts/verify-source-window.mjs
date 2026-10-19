import assert from 'node:assert/strict';
import { createLearnerSourceTool } from '../omp-plugin/learner/source.mjs';

const tool = createLearnerSourceTool({ z: { object: (shape) => shape } });

const learnerReport = (id, note) => ({
  type: 'custom_message',
  id,
  customType: 'advisor',
  details: { notes: [{ advisor: 'learner', note }] },
});

const userMessage = (id, content, extras = {}) => ({
  type: 'message',
  id,
  message: { role: 'user', content, ...extras },
});

const run = (branch, id = 'source-window') => tool.execute(id, {}, undefined, undefined, {
  sessionManager: { getBranch: () => branch },
});

const correctionReport = learnerReport(
  'correction-report',
  'covered guidance_coverage: Keep source READMEs focused on layer guidance',
);
const resumedOrdinaryTurn = await run([
  userMessage('correction', [{ type: 'text', text: 'Correction: no feature summaries in source READMEs.' }]),
  correctionReport,
  userMessage('question', [{ type: 'text', text: 'Do we still need ordering here?' }]),
]);
assert.deepEqual(resumedOrdinaryTurn.details, {
  source: { id: 'question', text: 'Do we still need ordering here?' },
  lastReport: correctionReport.details.notes[0].note,
  recentPrompts: [
    { id: 'question', text: 'Do we still need ordering here?', truncated: false },
    { id: 'correction', text: 'Correction: no feature summaries in source READMEs.', truncated: false },
  ],
  recentReports: [{ id: 'correction-report', text: correctionReport.details.notes[0].note, truncated: false }],
  historyTruncated: false,
});
assert.equal(resumedOrdinaryTurn.content[0].text, JSON.stringify(resumedOrdinaryTurn.details));

const repeatedYield = await run([
  userMessage('correction', 'Correction: no feature summaries in source READMEs.'),
  correctionReport,
  userMessage('synthetic', 'Continue your final review.', { synthetic: true, attribution: 'agent' }),
]);
assert.deepEqual(repeatedYield.details, {
  source: { id: 'correction', text: 'Correction: no feature summaries in source READMEs.' },
  lastReport: correctionReport.details.notes[0].note,
  recentPrompts: [
    { id: 'correction', text: 'Correction: no feature summaries in source READMEs.', truncated: false },
  ],
  recentReports: [{ id: 'correction-report', text: correctionReport.details.notes[0].note, truncated: false }],
  historyTruncated: false,
});

const newCorrectionReport = learnerReport(
  'old-report',
  'covered guidance_coverage: Keep source READMEs focused on layer guidance',
);
const newRelatedCorrection = await run([
  userMessage('old', 'Correction: no feature summaries in source READMEs.'),
  userMessage('new', 'Correction: put contributor commands before rationale.'),
  newCorrectionReport,
  {
    type: 'custom_message',
    customType: 'advisor',
    id: 'verifier-report',
    details: { notes: [{ advisor: 'verifier', note: 'Unrelated verification result' }] },
  },
]);
assert.deepEqual(newRelatedCorrection.details, {
  source: { id: 'new', text: 'Correction: put contributor commands before rationale.' },
  lastReport: newCorrectionReport.details.notes[0].note,
  recentPrompts: [
    { id: 'new', text: 'Correction: put contributor commands before rationale.', truncated: false },
    { id: 'old', text: 'Correction: no feature summaries in source READMEs.', truncated: false },
  ],
  recentReports: [{ id: 'old-report', text: newCorrectionReport.details.notes[0].note, truncated: false }],
  historyTruncated: false,
});

const attributionFiltered = await run([
  userMessage('older-user', 'A real user prompt.'),
  userMessage('agent-attributed', 'Not a user prompt.', { attribution: 'agent' }),
  userMessage('synthetic-user', 'Synthetic continuation.', { synthetic: true, attribution: 'user' }),
  { type: 'message', id: 'assistant', message: { role: 'assistant', content: 'Assistant output.' } },
  {
    type: 'custom_message',
    id: 'wrong-custom-type',
    customType: 'other',
    details: { notes: [{ advisor: 'learner', note: 'Not an advisor report.' }] },
  },
  {
    type: 'custom_message',
    id: 'other-advisor',
    customType: 'advisor',
    details: { notes: [{ advisor: 'verifier', note: 'Not a Learner report.' }] },
  },
  {
    type: 'custom_message',
    id: 'learner-report',
    customType: 'advisor',
    details: { notes: [
      { advisor: 'verifier', note: 'Ignore this note.' },
      { advisor: 'learner', note: 'Only this Learner note is included.' },
    ] },
  },
  userMessage('unattributed-user', 'Unattributed role=user remains a real user prompt.'),
]);
assert.deepEqual(attributionFiltered.details, {
  source: { id: 'unattributed-user', text: 'Unattributed role=user remains a real user prompt.' },
  lastReport: 'Only this Learner note is included.',
  recentPrompts: [
    { id: 'unattributed-user', text: 'Unattributed role=user remains a real user prompt.', truncated: false },
    { id: 'older-user', text: 'A real user prompt.', truncated: false },
  ],
  recentReports: [{ id: 'learner-report', text: 'Only this Learner note is included.', truncated: false }],
  historyTruncated: false,
});

const countLimitedBranch = [
  ...Array.from({ length: 15 }, (_, index) => userMessage(`prompt-${index}`, `Prompt ${index}`)),
  ...Array.from({ length: 10 }, (_, index) => learnerReport(`report-${index}`, `Report ${index}`)),
];
const countLimited = await run(countLimitedBranch, 'count-limits');
assert.deepEqual(countLimited.details.recentPrompts, Array.from({ length: 12 }, (_, index) => {
  const prompt = 14 - index;
  return { id: `prompt-${prompt}`, text: `Prompt ${prompt}`, truncated: false };
}));
assert.deepEqual(countLimited.details.recentReports, Array.from({ length: 8 }, (_, index) => {
  const report = 9 - index;
  return { id: `report-${report}`, text: `Report ${report}`, truncated: false };
}));
assert.equal(countLimited.details.source.id, 'prompt-14');
assert.equal(countLimited.details.lastReport, 'Report 9');
assert.equal(countLimited.details.historyTruncated, true);

const longText = 'x'.repeat(2001);
const segmentedLongText = [
  { type: 'text', text: 'a'.repeat(1500) },
  { type: 'image', data: 'ignored' },
  { type: 'text', text: 'b'.repeat(600) },
];
const longReport = learnerReport('long-report', longText);
const longHistory = await run([
  userMessage('segmented-old', segmentedLongText),
  learnerReport('older-long-report', longText),
  userMessage('long-current', longText),
  longReport,
], 'character-limits');
assert.equal(longHistory.details.source.text, longText);
assert.deepEqual(longHistory.details.recentPrompts, [
  { id: 'long-current', text: 'x'.repeat(2000), truncated: true },
  { id: 'segmented-old', text: `${'a'.repeat(1500)}\n${'b'.repeat(499)}`, truncated: true },
]);
assert.equal(longHistory.details.lastReport, longText);
assert.deepEqual(longHistory.details.recentReports, [
  { id: 'long-report', text: 'x'.repeat(2000), truncated: true },
  { id: 'older-long-report', text: 'x'.repeat(2000), truncated: true },
]);
assert.equal(longHistory.details.historyTruncated, true);

const emptySource = await run([], 'empty');
assert.deepEqual(emptySource.details, {
  source: null,
  lastReport: null,
  recentPrompts: [],
  recentReports: [],
  historyTruncated: false,
});
await assert.rejects(() => tool.execute('unavailable', {}), /native session branch access is required/);
console.log('Authoritative source-window checks passed.');
