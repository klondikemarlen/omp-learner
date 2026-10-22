import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { configureLearner } from '../omp-plugin/learner/config.mjs';
import { createLearnerReportTool } from '../omp-plugin/learner/report.mjs';
import { createLearnerTicketTool } from '../omp-plugin/learner/ticket.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-eval-transport-'));
const z = {
  object: (shape) => shape,
  array: (schema) => schema,
  enum: (values) => values,
  string: () => ({
    max() { return this; },
    optional() { return this; },
    describe() { return this; },
  }),
  number: () => ({
    int() { return this; },
    positive() { return this; },
    optional() { return this; },
    describe() { return this; },
  }),
};
const issueUrl = 'https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/701';
const ticket = {
  target: 'knowledge_base',
  title: 'Preserve explicit evidence links',
  proposal: 'Keep operation receipt evidence links explicit.',
  evidence: 'Synthetic current user correction; no private source data.',
  confidence: 'high',
};

try {
  configureLearner(agentDir);
  const guidance = readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8');
  const examples = [...guidance.matchAll(/```js\n([\s\S]*?)\n```/g)].map((match) => match[1]);
  const generatedProgram = new vm.Script(`(async () => {\n${examples.join('\n')}\n})()`);
  const reporter = createLearnerReportTool({ z });
  let created = false;
  const action = createLearnerTicketTool({
    agentDir,
    z,
    runGh: async (args) => {
      if (args[1] === 'list') return JSON.stringify(created ? [{ url: issueUrl }] : []);
      created = true;
      return issueUrl;
    },
  });

  async function runGeneratedExamples(ticketAction) {
    const printed = [];
    let receipt;
    const runtime = {
      ticket,
      print(value) { printed.push(value); },
      tool: {
        async learner_file_ticket(params) {
          receipt = await ticketAction.execute('generated-ticket', params);
          return receipt;
        },
        learner_report_operations: (params) => reporter.execute('generated-report', params),
      },
      get records() {
        return [{
          operation: 'learner_file_ticket',
          outcome: receipt.details.created ? 'created' : 'reused',
          subject: ticket.title,
          evidence: receipt.details.url,
        }];
      },
    };
    await generatedProgram.runInNewContext(runtime);
    return printed;
  }

  const createdOutput = await runGeneratedExamples(action);
  assert.deepEqual(createdOutput, [
    {
      content: [{ type: 'text', text: `Created learner ticket: ${issueUrl}` }],
      details: { created: true, url: issueUrl },
    },
    {
      content: [{ type: 'text', text: `Improvement ticket created\n${ticket.title}\n  ${issueUrl}` }],
      details: { records: [{ operation: 'learner_file_ticket', outcome: 'created', subject: ticket.title, evidence: issueUrl }] },
    },
  ]);

  const reusedOutput = await runGeneratedExamples(action);
  assert.equal(reusedOutput[0].details.created, false);
  assert.equal(reusedOutput[0].details.url, issueUrl);
  assert.equal(reusedOutput[1].content[0].text, `Improvement ticket reused\n${ticket.title}\n  ${issueUrl}`);

  const failingAction = createLearnerTicketTool({
    agentDir,
    z,
    runGh: async () => { throw new Error('Synthetic GitHub authentication unavailable'); },
  });
  await assert.rejects(() => runGeneratedExamples(failingAction), /Synthetic GitHub authentication unavailable/);

  const unavailableOutput = [];
  await assert.rejects(
    () => generatedProgram.runInNewContext({ ticket, tool: {}, print: (value) => unavailableOutput.push(value) }),
    /learner_file_ticket is not a function/,
  );
  assert.deepEqual(unavailableOutput, []);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('Generated eval transport checks passed.');
