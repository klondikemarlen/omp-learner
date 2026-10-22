import assert from 'node:assert/strict';

import { createLearnerReportTool, formatLearningOperations } from '../omp-plugin/learner/report.mjs';

const acknowledgment = [{
  operation: 'learn',
  outcome: 'acknowledged',
  subject: 'Keep explicit project invariants',
  evidence: 'Lesson stored.',
}];
assert.equal(formatLearningOperations(acknowledgment, 'text'), '');

const createdTicket = [{
  operation: 'learner_file_ticket',
  outcome: 'created',
  subject: 'Document operation reports',
  evidence: 'https://github.com/owner/project/issues/42',
}];
assert.equal(formatLearningOperations(createdTicket, 'text'), 'Improvement ticket created\nDocument operation reports\n  https://github.com/owner/project/issues/42');

const reusedTicket = [{
  operation: 'learner_file_ticket',
  outcome: 'reused',
  subject: 'Document operation reports',
  evidence: 'https://github.com/owner/project/issues/42',
}];
assert.equal(formatLearningOperations(reusedTicket, 'text'), 'Improvement ticket reused\nDocument operation reports\n  https://github.com/owner/project/issues/42');

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
assert.equal(formatLearningOperations(deniedTicket, 'text'), 'Improvement ticket blocked\nDocument operation reports\n  Tool approval denied.');
assert.equal(formatLearningOperations([], 'text'), '');

// Frozen records catch mutation while checking both public representations of the same evidence.
const records = Object.freeze(mixedOutcomes.map((record) => Object.freeze(record)));
const z = { object: (shape) => shape, array: (schema) => schema, enum: (values) => values, string: () => ({}) };
const reporter = createLearnerReportTool({ z });
const jsonReport = await reporter.execute('json-report', { records, format: 'json' });
assert.deepEqual(JSON.parse(jsonReport.content[0].text), records);
const textReport = await reporter.execute('text-report', { records: jsonReport.details.records, format: 'text' });
assert.deepEqual(textReport.details.records, records);
assert.equal(textReport.content[0].text, 'Improvement ticket failed\nDocument operation reports\n  GitHub authentication unavailable\n  No issue URL returned.');

const coveredGuidance = Object.freeze({
  operation: 'guidance_coverage',
  outcome: 'covered',
  subject: 'Use Update rather than Set for CRUD updates',
  evidence: 'https://github.com/owner/guidance/blob/main/docs/code-organization.md#service-updates\nhttps://github.com/owner/guidance/pull/455 (merged)',
});
const coverageRecords = Object.freeze([coveredGuidance]);
assert.equal(formatLearningOperations(coverageRecords, 'text'), '');
const coverageJsonReport = await reporter.execute('coverage-json-report', { records: coverageRecords, format: 'json' });
assert.deepEqual(JSON.parse(coverageJsonReport.content[0].text), coverageRecords);
assert.deepEqual(coverageJsonReport.details.records, coverageRecords);
const coverageTextReport = await reporter.execute('coverage-text-report', { records: coverageJsonReport.details.records, format: 'text' });
assert.equal(coverageTextReport.content[0].text, '');
assert.deepEqual(coverageTextReport.details.records, coverageRecords);

const missingGuidance = Object.freeze({
  operation: 'guidance_coverage',
  outcome: 'not_covered',
  subject: 'Document operation reports',
  evidence: 'Bounded guidance review found no equivalent rule.',
});
const ticketWithCoverage = Object.freeze([missingGuidance, Object.freeze(createdTicket[0]), Object.freeze(acknowledgment[0])]);
const notification = await reporter.execute('ticket-with-coverage', { records: ticketWithCoverage, format: 'text' });
assert.equal(notification.content[0].text, 'Improvement ticket created\nDocument operation reports\n  https://github.com/owner/project/issues/42');
assert.deepEqual(notification.details.records, ticketWithCoverage);
const structuredReport = await reporter.execute('structured-coverage', { records: ticketWithCoverage, format: 'json' });
assert.deepEqual(JSON.parse(structuredReport.content[0].text), ticketWithCoverage);

console.log('learning report checks passed');
