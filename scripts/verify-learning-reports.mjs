import assert from 'node:assert/strict';

import { createLearnerReportTool, formatLearningOperations } from '../omp-plugin/learner/report.mjs';

const acknowledgment = [{
  operation: 'learn',
  outcome: 'acknowledged',
  subject: 'Keep explicit project invariants',
  evidence: 'Lesson stored.',
}];
assert.equal(formatLearningOperations(acknowledgment, 'text'), 'acknowledged learn: Keep explicit project invariants\n  Lesson stored.');

const createdTicket = [{
  operation: 'learner_file_ticket',
  outcome: 'created',
  subject: 'Document operation reports',
  evidence: 'https://github.com/owner/project/issues/42',
}];
assert.equal(formatLearningOperations(createdTicket, 'text'), 'created learner_file_ticket: Document operation reports\n  https://github.com/owner/project/issues/42');

const reusedTicket = [{
  operation: 'learner_file_ticket',
  outcome: 'reused',
  subject: 'Document operation reports',
  evidence: 'https://github.com/owner/project/issues/42',
}];
assert.equal(formatLearningOperations(reusedTicket, 'text'), 'reused learner_file_ticket: Document operation reports\n  https://github.com/owner/project/issues/42');

const mixedOutcomes = [acknowledgment[0], {
  operation: 'learner_file_ticket',
  outcome: 'failed',
  subject: 'Document operation reports',
  evidence: 'GitHub authentication unavailable\nNo issue URL returned.',
}];

const deniedTicket = [{
  operation: 'learner_file_ticket',
  outcome: 'blocked',
  subject: 'Document operation reports',
  evidence: 'Tool approval denied.',
}];
assert.equal(formatLearningOperations(deniedTicket, 'text'), 'blocked learner_file_ticket: Document operation reports\n  Tool approval denied.');
assert.equal(formatLearningOperations([], 'text'), '');

// Frozen records catch mutation while checking both public representations of the same evidence.
const records = Object.freeze(mixedOutcomes.map((record) => Object.freeze(record)));
const z = { object: (shape) => shape, array: (schema) => schema, enum: (values) => values, string: () => ({}) };
const reporter = createLearnerReportTool({ z });
const jsonReport = await reporter.execute('json-report', { records, format: 'json' });
assert.deepEqual(JSON.parse(jsonReport.content[0].text), records);
const textReport = await reporter.execute('text-report', { records: jsonReport.details.records, format: 'text' });
assert.deepEqual(textReport.details.records, records);
assert.equal(textReport.content[0].text, 'acknowledged learn: Keep explicit project invariants\n  Lesson stored.\n\nfailed learner_file_ticket: Document operation reports\n  GitHub authentication unavailable\n  No issue URL returned.');

const coveredGuidance = Object.freeze({
  operation: 'guidance_coverage',
  outcome: 'covered',
  subject: 'Use Update rather than Set for CRUD updates',
  evidence: 'https://github.com/owner/guidance/blob/main/docs/code-organization.md#service-updates\nhttps://github.com/owner/guidance/pull/455 (merged)',
});
const coverageRecords = Object.freeze([coveredGuidance]);
assert.equal(formatLearningOperations(coverageRecords, 'text'), 'covered guidance_coverage: Use Update rather than Set for CRUD updates\n  https://github.com/owner/guidance/blob/main/docs/code-organization.md#service-updates\n  https://github.com/owner/guidance/pull/455 (merged)');
const coverageJsonReport = await reporter.execute('coverage-json-report', { records: coverageRecords, format: 'json' });
assert.deepEqual(JSON.parse(coverageJsonReport.content[0].text), coverageRecords);
assert.deepEqual(coverageJsonReport.details.records, coverageRecords);
const coverageTextReport = await reporter.execute('coverage-text-report', { records: coverageJsonReport.details.records, format: 'text' });
assert.equal(coverageTextReport.content[0].text, 'covered guidance_coverage: Use Update rather than Set for CRUD updates\n  https://github.com/owner/guidance/blob/main/docs/code-organization.md#service-updates\n  https://github.com/owner/guidance/pull/455 (merged)');
assert.deepEqual(coverageTextReport.details.records, coverageRecords);

console.log('learning report checks passed');
