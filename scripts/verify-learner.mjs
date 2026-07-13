import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureLearner, configurationPath, disableLearner, normalizeUpstream, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { createLearnerIssueTool, registerLearnerPlugin } from '../omp-plugin/learner.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-check-'));
const z = { string: () => ({}), object: (shape) => ({ shape }) };
try {
  const verifierRoster = `# omp-verifier: generated\nadvisors:\n  - name: default\n    tools: [read, grep, glob]\n\ninstructions: |\n  Keep advice concise.\n`;
  const setupOptions = { verifyUpstream: () => {} };
  writeFileSync(path.join(agentDir, 'config.yml'), 'modelRoles:\n  advisor: openai/gpt-5\nadvisor:\n  enabled: false\n');
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  assert.equal(normalizeUpstream('https://github.com/owner/repository.git'), 'owner/repository');
  assert.throws(() => normalizeUpstream('owner/repository'), /HTTPS GitHub repository URL/);

  const noModelAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-no-model-'));
  assert.equal(configureLearner(noModelAgentDir, 'https://github.com/owner/repository', setupOptions).upstream, 'owner/repository');
  rmSync(noModelAgentDir, { recursive: true, force: true });

  const inaccessibleAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-inaccessible-'));
  writeFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'modelRoles:\n  advisor: openai/gpt-5\n');
  writeFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), verifierRoster);
  const inaccessibleConfig = readFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'utf8');
  const inaccessibleRoster = readFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), 'utf8');
  assert.throws(() => configureLearner(inaccessibleAgentDir, 'https://github.com/owner/repository', { verifyUpstream: () => { throw new Error('repository unavailable'); } }), /repository unavailable/);
  assert.equal(readFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'utf8'), inaccessibleConfig);
  assert.equal(readFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), 'utf8'), inaccessibleRoster);
  assert.ok(!existsSync(configurationPath(inaccessibleAgentDir)));
  rmSync(inaccessibleAgentDir, { recursive: true, force: true });

  const configured = configureLearner(agentDir, 'https://github.com/owner/repository', setupOptions);
  assert.equal(configured.upstream, 'owner/repository');
  assert.deepEqual(readConfiguration(agentDir), { version: 3, enabled: true, upstream: 'owner/repository' });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);
  assert.match(readFileSync(path.join(agentDir, 'config.yml'), 'utf8'), /advisor:\n  enabled: false/);
  assert.equal(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), verifierRoster);

  const legacyRoster = `${verifierRoster}\n# omp-learner: begin\n  - name: learner\n# omp-learner: end\n`;
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), legacyRoster);
  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), '# OMP Learner watchdog\nlegacy');
  configureLearner(agentDir, 'https://github.com/owner/updated', setupOptions);
  assert.doesNotMatch(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);
  assert.ok(!existsSync(path.join(agentDir, 'learner', 'WATCHDOG.md')));

  const commands = new Map();
  const events = new Map();
  const messages = [];
  const launches = [];
  const sessions = [];
  const pi = {
    pi: { getAgentDir: () => agentDir },
    registerCommand(name, command) { commands.set(name, command); },
    on(name, callback) { events.set(name, callback); },
    sendMessage(message) { messages.push(message); },
  };
  const fallbackCommands = new Map();
  let fallbackEvents = 0;
  registerLearnerPlugin({
    registerCommand(name, command) { fallbackCommands.set(name, command); },
    on() { fallbackEvents += 1; },
  });
  assert.ok(fallbackCommands.has('learner'));
  assert.equal(fallbackEvents, 0);
  const sdk = {
    z,
    SessionManager: { inMemory(cwd) { return { cwd }; } },
    async createAgentSession(options) {
      launches.push(options);
      const session = {
        async setActiveToolsByName(names) { this.activeTools = names; },
        async prompt(value) { this.promptValue = value; },
        dispose() { this.disposed = true; },
      };
      sessions.push(session);
      return { session };
    },
  };
  registerLearnerPlugin(pi, sdk);
  assert.equal(events.size, 1);
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);
  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /watchdog: on/);
  assert.match(messages.at(-1).content, /knowledge capture: automatic/);

  events.get('agent_end')({
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Keep commit messages imperative. token: ghp_abcdefghijklmnopqrstuvwxyz' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'I will do that.' }] },
    ],
  }, {
    agentDir,
    cwd: '/tmp/project',
    model: { id: 'primary' },
    ui: { notify: () => {} },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(launches.length, 1);
  assert.equal(launches[0].model.id, 'primary');
  assert.equal(launches[0].disableExtensionDiscovery, true);
  assert.equal(launches[0].enableMCP, false);
  assert.equal(launches[0].enableLsp, false);
  assert.equal(launches[0].autoApprove, true);
  assert.equal(launches[0].customTools[0].name, 'learner_file_issue');
  assert.deepEqual(sessions[0].activeTools, ['read', 'grep', 'glob', 'learner_file_issue']);
  assert.match(launches[0].systemPrompt, /Use read, grep, or glob only when needed to verify a candidate against project evidence/);
  assert.match(launches[0].systemPrompt, /Never call a mutation tool or any tool outside read, grep, glob, and learner_file_issue/);
  assert.match(launches[0].systemPrompt, /exact visible source in provenance and confidence high/);
  assert.match(sessions[0].promptValue, /Keep commit messages imperative/);
  assert.doesNotMatch(sessions[0].promptValue, /ghp_abcdefghijklmnopqrstuvwxyz/);
  assert.ok(sessions[0].disposed);

  const ghCalls = [];
  const filed = [];
  const issueTool = createLearnerIssueTool({
    upstream: 'owner/updated',
    agentDir,
    z,
    onFiled: (url) => filed.push(url),
    runGh: async (args) => {
      ghCalls.push(args);
      return args[1] === 'list' ? '[]' : 'https://github.com/owner/updated/issues/1\n';
    },
  });
  assert.ok(issueTool.parameters.shape.provenance);
  const created = await issueTool.execute('issue-1', {
    category: 'project_knowledge',
    proposedRule: 'The order pipeline retries only after the ledger transaction commits.',
    scope: 'order processing',
    evidence: 'User explained the transaction boundary for future maintainers.',
    provenance: 'User message in the completed turn. token: ghp_abcdefghijklmnopqrstuvwxyz',
    confidence: 'high',
  });
  assert.equal(created.details.created, true);
  assert.equal(filed[0], 'https://github.com/owner/updated/issues/1');
  assert.deepEqual(ghCalls[0].slice(0, 4), ['issue', 'list', '--repo', 'owner/updated']);
  assert.deepEqual(ghCalls[1].slice(0, 4), ['issue', 'create', '--repo', 'owner/updated']);
  await assert.rejects(issueTool.execute('issue-2', {
    category: 'project_knowledge',
    proposedRule: 'The order pipeline retries only after the ledger transaction commits.',
    scope: 'order processing',
    evidence: 'duplicate',
    provenance: 'Duplicate learner request',
    confidence: 'high',
  }), /at most one issue/);
  assert.match(ghCalls[1].at(-1), /\*\*Provenance:\*\* User message in the completed turn\. token: \[REDACTED\]/);
  assert.doesNotMatch(ghCalls[1].at(-1), /ghp_abcdefghijklmnopqrstuvwxyz/);
  const duplicateCalls = [];
  const duplicateIssueTool = createLearnerIssueTool({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      duplicateCalls.push(args);
      return '[{"url":"https://github.com/owner/updated/issues/1"}]';
    },
  });
  const duplicate = await duplicateIssueTool.execute('issue-3', {
    category: 'project_knowledge',
    proposedRule: 'The order pipeline retries only after the ledger transaction commits.',
    scope: 'order processing',
    evidence: 'duplicate',
    provenance: 'User message in the completed turn',
    confidence: 'high',
  });
  assert.equal(duplicate.details.created, false);
  assert.equal(duplicateCalls.length, 1);
  let wroteRejectedCandidate = false;
  const rejectedIssueTool = createLearnerIssueTool({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async () => {
      wroteRejectedCandidate = true;
      return '[]';
    },
  });
  await assert.rejects(rejectedIssueTool.execute('issue-4', {
    category: 'project_knowledge',
    proposedRule: 'A non-qualifying candidate.',
    scope: 'order processing',
    evidence: 'uncertain feedback',
    provenance: 'User message in the completed turn',
    confidence: 'medium',
  }), /confidence must be high/);
  assert.equal(wroteRejectedCandidate, false);
  let resolveSearch;
  const searchStarted = new Promise((resolve) => { resolveSearch = resolve; });
  const concurrentCalls = [];
  const concurrentIssueTool = createLearnerIssueTool({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      concurrentCalls.push(args);
      if (args[1] === 'list') return searchStarted;
      return 'https://github.com/owner/updated/issues/2';
    },
  });
  const concurrentCandidate = {
    category: 'project_knowledge',
    proposedRule: 'One concurrent learner issue.',
    scope: 'order processing',
    evidence: 'durable feedback',
    provenance: 'User message in the completed turn',
    confidence: 'high',
  };
  const concurrentResults = Promise.allSettled([
    concurrentIssueTool.execute('issue-5', concurrentCandidate),
    concurrentIssueTool.execute('issue-6', concurrentCandidate),
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(concurrentCalls.length, 1);
  resolveSearch('[]');
  const [firstConcurrentResult, secondConcurrentResult] = await concurrentResults;
  assert.equal(firstConcurrentResult.status, 'fulfilled');
  assert.equal(secondConcurrentResult.status, 'rejected');
  assert.equal(concurrentCalls.filter((args) => args[1] === 'list').length, 1);
  assert.equal(concurrentCalls.filter((args) => args[1] === 'create').length, 1);

  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'user-owned notes');
  disableLearner(agentDir);
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), 'user-owned notes');
  await commands.get('learner').handler('off', { agentDir });
  assert.match(messages.at(-1).content, /disabled/);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
