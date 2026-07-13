import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerLearnerPlugin } from '../omp-plugin/learner.mjs';
import AddCandidateService from '../omp-plugin/learner/services/add-candidate-service.mjs';
import AddFeedbackService from '../omp-plugin/learner/services/add-feedback-service.mjs';
import BoundedFeedbackSummaryService from '../omp-plugin/learner/services/bounded-feedback-summary-service.mjs';
import DiscardCandidateService from '../omp-plugin/learner/services/discard-candidate-service.mjs';
import EditCandidateService from '../omp-plugin/learner/services/edit-candidate-service.mjs';
import PromoteCandidateService from '../omp-plugin/learner/services/promote-candidate-service.mjs';
import LearnerStoreRepository from '../omp-plugin/learner/repositories/learner-store-repository.mjs';
import { buildClassifierPrompt } from '../omp-plugin/learner/lib/build-classifier-prompt.mjs';
import { redactText } from '../omp-plugin/learner/lib/redact-text.mjs';

const storeRepository = new LearnerStoreRepository();

assert.equal(redactText('email me at user@example.com with ghp_abcdefghijklmnopqrstuvwxyz'), 'email me at [redacted-email] with [redacted-token]');
const token = 'ghp_abcdefghijklmnopqrstuvwxyz';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'learner-check-'));
try {
  const storePath = storeRepository.path({ OMP_LEARNER_DIR: tmp }, '/ignored');
  let store = storeRepository.read(storePath);

  const missingCommitContext = AddCandidateService.perform(store, {
    category: 'commit_file_grouping',
    proposedRule: 'Split docs and tests.',
    evidence: 'no diff or staged files were visible',
    provenance: { kind: '', reference: '' },
  });
  assert.equal(missingCommitContext.category, 'insufficient_context');

  const longText = Array(120).fill('longword').join(' ');
  const grouped = AddCandidateService.perform(store, {
    category: 'commit_file_grouping',
    proposedRule: `Split lockfile churn from behavior changes. ${token} ${longText}`,
    scope: `cross-project commits ${token}`,
    provenance: { kind: 'diff', reference: 'git diff --cached --stat' },
    confidence: 'high',
  });
  assert.equal(grouped.proposedRule.length, 500);
  assert.ok(!grouped.proposedRule.includes(token));
  assert.ok(!grouped.scope.includes(token));
  assert.equal(grouped.category, 'commit_file_grouping');

  const edited = EditCandidateService.perform(store, grouped.id, { proposedRule: 'Split dependency churn from behavior changes.' });
  assert.equal(edited.status, 'edited');
  assert.equal(store.edits.length, 1);

  const accepted = PromoteCandidateService.perform(store, edited.id, 'good cross-project commit grouping rule');
  assert.equal(accepted.status, 'accepted');
  assert.equal(store.pending.length, 1);

  const noisy = AddCandidateService.perform(store, { category: 'one_off_no_action', proposedRule: 'Say tiny here.' });
  DiscardCandidateService.perform(store, noisy.id, 'noisy', 'local wording nit');
  AddFeedbackService.perform(store, accepted.id, 'useful', 'helped future commit grouping');

  const summary = BoundedFeedbackSummaryService.perform(store, 5);
  assert.match(summary, /Recent accepted examples:/);
  assert.match(summary, /Recent rejected\/noisy examples:/);
  assert.match(summary, /Recent edited examples:/);
  assert.match(summary, /Recent user feedback on learner quality:/);
  assert.ok(!summary.includes(token));
  assert.ok(summary.length < 1200);

  const prompt = buildClassifierPrompt('Please keep lockfile churn separate.');
  assert.match(prompt, /docs\/workflows\/learner-feedback-workflow\.md/);
  assert.match(prompt, /provenance\.kind as diff, staged_files, commit_hash, or local_committing_doc/);
  assert.match(prompt, /Stored learner history is intentionally not injected/);
  assert.doesNotMatch(prompt, /Recent accepted examples:/);
  assert.doesNotMatch(prompt, /Split dependency churn/);

  storeRepository.write(store, storePath);
  assert.equal(statSync(storePath).mode & 0o777, 0o600);
  const reread = storeRepository.read(storePath);
  assert.equal(reread.decisions.length, 2);
  assert.equal(reread.edits.length, 1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const commandTmp = mkdtempSync(path.join(os.tmpdir(), 'learner-command-check-'));
try {
  const commands = new Map();
  const tools = new Map();
  const events = new Map();
  const messages = [];
  let activeTools = [];
  const schema = { optional: () => schema, describe: () => schema };
  const z = {
    string: () => schema,
    enum: () => schema,
    object: () => schema,
  };
  const pi = {
    pi: { getAgentDir: () => commandTmp },
    zod: { z },
    registerCommand(name, options) {
      commands.set(name, options);
    },
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    on(event, handler) {
      events.set(event, handler);
    },
    getActiveTools() {
      return activeTools;
    },
    async setActiveTools(nextTools) {
      activeTools = nextTools;
    },
    sendMessage(message, options) {
      messages.push({ message, options });
    },
  };

  registerLearnerPlugin(pi);
  const learner = commands.get('learner');
  const recordTool = tools.get('learner_record_candidate');
  assert.ok(learner, 'learner command must register');
  assert.ok(recordTool, 'learner recording tool must register');
  assert.deepEqual(learner.getArgumentCompletions('').map((item) => item.label), ['on', 'off', 'status']);

  await learner.handler('review', {});
  assert.match(messages.at(-1).message.content, /Unknown learner command: review/);
  await learner.handler('on extra', {});
  assert.match(messages.at(-1).message.content, /Usage: \/learner on/);

  await learner.handler('on', {});
  assert.match(messages.at(-1).message.content, /automatic triage enabled/);
  assert.ok(activeTools.includes('learner_record_candidate'));
  activeTools = [];
  const notices = [];
  await events.get('session_start')({ type: 'session_start' }, { agentDir: commandTmp, ui: { notify(message, level) { notices.push({ message, level }); } } });
  assert.ok(activeTools.includes('learner_record_candidate'));
  assert.deepEqual(notices, [{ message: 'Learner automatic triage enabled', level: 'info' }]);

  assert.equal(storeRepository.read(path.join(commandTmp, 'learner', 'feedback-store.json')).settings.enabled, true);

  const pendingEvalCases = JSON.parse(readFileSync('docs/evals/learner-feedback.json', 'utf8')).cases.filter((testCase) => testCase.expectedAction === 'pending_candidate');
  const beforePromptMessages = messages.length;
  for (const testCase of pendingEvalCases) {
    const result = await events.get('before_agent_start')({ type: 'before_agent_start', prompt: testCase.input, systemPrompt: ['base prompt'] }, { agentDir: commandTmp });
    assert.match(result.systemPromptAppend, /Learner automatic triage is enabled/, testCase.id);
    assert.match(result.systemPromptAppend, /learner_record_candidate/, testCase.id);
  }
  assert.equal(messages.length, beforePromptMessages);

  const toolResult = await recordTool.execute('tc-1', {
    category: 'test_style',
    proposedRule: `Assert explicit expected values. ${token}`,
    scope: 'cross-project tests',
    provenance: { kind: 'local_committing_doc', reference: 'COMMITTING.md' },
    confidence: 'high',
  }, undefined, undefined, { agentDir: commandTmp });
  assert.match(toolResult.content[0].text, /Stored pending learner candidate lf-1/);
  assert.ok(!readFileSync(path.join(commandTmp, 'learner', 'feedback-store.json'), 'utf8').includes(token));

  const skippedToolResult = await recordTool.execute('tc-2', {
    category: 'insufficient_context',
    proposedRule: 'Split commit groups.',
  }, undefined, undefined, { agentDir: commandTmp });
  assert.match(skippedToolResult.content[0].text, /No learner candidate recorded for insufficient_context/);
  assert.equal(storeRepository.read(path.join(commandTmp, 'learner', 'feedback-store.json')).pending.length, 1);

  await learner.handler('status', {});
  assert.match(messages.at(-1).message.content, /automatic triage: on/);
  assert.match(messages.at(-1).message.content, /recording tool: active/);
  assert.match(messages.at(-1).message.content, /pending candidates: 1/);

  const ordinaryPromptResult = await events.get('before_agent_start')({ type: 'before_agent_start', prompt: 'Please remember this code style.', systemPrompt: ['base prompt'] }, { agentDir: commandTmp });
  assert.match(ordinaryPromptResult.systemPromptAppend, /Learner automatic triage is enabled/);
  assert.ok(activeTools.includes('learner_record_candidate'));

  const workflowPromptResult = await events.get('before_agent_start')({ type: 'before_agent_start', prompt: 'Use docs/workflows/learner-feedback-workflow.md to classify this user feedback.', systemPrompt: ['base prompt'] }, { agentDir: commandTmp });
  assert.deepEqual(workflowPromptResult, {});
  assert.ok(!activeTools.includes('learner_record_candidate'));


  await learner.handler('off', {});
  const disabledPromptResult = await events.get('before_agent_start')({ type: 'before_agent_start', prompt: 'Please remember this code style.', systemPrompt: ['base prompt'] }, { agentDir: commandTmp });
  assert.deepEqual(disabledPromptResult, {});
  assert.match(messages.at(-1).message.content, /disabled/);
  assert.ok(!activeTools.includes('learner_record_candidate'));
  assert.equal(storeRepository.read(path.join(commandTmp, 'learner', 'feedback-store.json')).settings.enabled, false);
} finally {
  rmSync(commandTmp, { recursive: true, force: true });
}

const evalSet = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile('docs/evals/learner-feedback.json', 'utf8')));
const ids = new Set(evalSet.cases.map((item) => item.id));
for (const required of [
  'accepted-commit-message-style',
  'accepted-test-style',
  'rejected-noisy-local-nit',
  'wrong-scope-project-style',
  'wrong-destination-workflow',
  'verifier-overlap',
  'insufficient-context-commit-grouping-negative',
  'accepted-commit-grouping-with-diff',
]) {
  assert.ok(ids.has(required), `missing eval case ${required}`);
}

const verifierOverlap = evalSet.cases.find((item) => item.id === 'verifier-overlap');
assert.equal(verifierOverlap.expectedCategory, 'one_off_no_action');
assert.equal(verifierOverlap.expectedAction, 'no_candidate');

const negativeCommitGrouping = evalSet.cases.find((item) => item.id === 'insufficient-context-commit-grouping-negative');
assert.equal(negativeCommitGrouping.expectedCategory, 'insufficient_context');

console.log('learner checks passed');
