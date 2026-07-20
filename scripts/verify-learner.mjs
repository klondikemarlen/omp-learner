import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_KNOWLEDGE_BASE_REPOSITORY, configurationPath, configureLearner, disableLearner, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { createLearnerTicketTool } from '../omp-plugin/learner/ticket.mjs';
import { registerLearnerPlugin } from '../omp-plugin/learner.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-check-'));
const verifierRoster = `# omp-verifier: generated
instructions: |
  Everyone: keep advice concise.

advisors:
  # omp-verifier: advisor begin
  - name: default
    tools: [read, grep, glob]
  # omp-verifier: advisor end
`;
const z = { object: (shape) => shape, enum: (values) => values, string: () => ({}) };

try {
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  const configured = configureLearner(agentDir);
  assert.equal(configured.configPath, configurationPath(agentDir));
  assert.equal(configured.knowledgeBaseRepository, DEFAULT_KNOWLEDGE_BASE_REPOSITORY);
  assert.deepEqual(readConfiguration(agentDir), { version: 5, enabled: true, knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);
  const configuredRoster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.match(configuredRoster, /# omp-verifier: advisor begin/);
  assert.match(configuredRoster, /# omp-learner: begin/);
  assert.match(configuredRoster, /tools: \[read, grep, glob, learn, learner_file_ticket\]/);
  const instructions = readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8');
  assert.match(instructions, /Code-style standards are durable preferences/);
  assert.match(instructions, /Prefer knowledge_base/);

  const calls = [];
  const ticketTool = createLearnerTicketTool({
    agentDir,
    z,
    runGit: async () => 'git@github.com:icefoganalytics/wrap.git\n',
    runGh: async (args) => {
      calls.push(args);
      return args[1] === 'list' ? '[]' : 'https://github.com/icefoganalytics/wrap/issues/99\n';
    },
  });
  const ticket = (target, title) => ({
    target,
    title,
    proposal: 'Persist this reusable improvement.',
    evidence: 'token=github_pat_abcdefghijklmnopqrstuvwx',
    confidence: 'high',
  });

  const knowledgeBaseTicket = await ticketTool.execute('ticket-1', ticket('knowledge_base', 'Capture reusable guidance'), undefined, undefined, { cwd: '/tmp/project' });
  assert.equal(knowledgeBaseTicket.details.created, true);
  assert.ok(calls[0].includes(DEFAULT_KNOWLEDGE_BASE_REPOSITORY));
  assert.match(calls[1][calls[1].indexOf('--body') + 1], /\[REDACTED\]/);
  calls.length = 0;
  const boundarySecret = 'github_pat_abcdefghijklmnopqrstuvwxyz';
  await ticketTool.execute('ticket-1b', { ...ticket('knowledge_base', 'Redact boundary secret'), evidence: `${'x'.repeat(3_990)} token=${boundarySecret}` }, undefined, undefined, { cwd: '/tmp/project' });
  const boundaryBody = calls[1][calls[1].indexOf('--body') + 1];
  assert.doesNotMatch(boundaryBody, new RegExp(boundarySecret));

  calls.length = 0;
  await ticketTool.execute('ticket-2', ticket('learner', 'Improve learner routing'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('klondikemarlen/omp-learner'));

  calls.length = 0;
  await ticketTool.execute('ticket-3', ticket('local', 'Fix project-local behavior'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('icefoganalytics/wrap'));
  await assert.rejects(() => ticketTool.execute('ticket-4', { ...ticket('local', 'Reject low confidence'), confidence: 'low' }, undefined, undefined, { cwd: '/tmp/project' }), /requires high confidence/);
  const nonGitHubLocalTool = createLearnerTicketTool({ agentDir, z, runGit: async () => 'git@gitlab.com:owner/project.git\n' });
  await assert.rejects(() => nonGitHubLocalTool.execute('ticket-4', ticket('local', 'Reject non-GitHub origin'), undefined, undefined, { cwd: '/tmp/project' }), /GitHub origin/);

  const duplicateTool = createLearnerTicketTool({
    agentDir,
    z,
    runGh: async () => JSON.stringify([{ url: 'https://github.com/klondikemarlen/omp-config/issues/1' }]),
  });
  const duplicate = await duplicateTool.execute('ticket-5', ticket('knowledge_base', 'Capture reusable guidance'), undefined, undefined, { cwd: '/tmp/project' });
  assert.equal(duplicate.details.created, false);

  const commands = new Map();
  const events = new Map();
  const tools = new Map();
  const messages = [];
  const pi = {
    pi: { getAgentDir: () => agentDir },
    zod: { z },
    registerCommand(name, command) { commands.set(name, command); },
    registerTool(tool) { tools.set(tool.name, tool); },
    on(name, callback) { events.set(name, callback); },
    sendMessage(message) { messages.push(message); },
  };
  registerLearnerPlugin(pi);
  assert.equal(events.size, 1);
  assert.equal(tools.get('learner_file_ticket').approval, 'write');
  assert.equal(tools.get('learner_file_ticket').hidden, true);
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);

  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /advisor: on/);
  assert.match(messages.at(-1).content, new RegExp(`knowledge base: ${DEFAULT_KNOWLEDGE_BASE_REPOSITORY}`));
  assert.match(messages.at(-1).content, /ticket filing: learner_file_ticket/);

  await commands.get('learner').handler('setup https://github.com/owner/repository.git', { agentDir });
  assert.match(messages.at(-1).content, /Preferred ticket target: owner\/repository/);
  assert.equal(readConfiguration(agentDir).knowledgeBaseRepository, 'owner/repository');
  const previousConfiguration = readFileSync(configurationPath(agentDir), 'utf8');
  const previousWatchdog = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  await commands.get('learner').handler('setup not-a-repository', { agentDir });
  assert.match(messages.at(-1).content, /Knowledge base must be a GitHub owner\/repository/);
  assert.equal(readFileSync(configurationPath(agentDir), 'utf8'), previousConfiguration);
  assert.equal(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), previousWatchdog);

  await commands.get('learner').handler('setup owner repository', { agentDir });
  assert.match(messages.at(-1).content, /Usage: \/learner setup \[owner\/repository\]/);

  writeFileSync(configurationPath(agentDir), '{');
  const malformedCommands = new Map();
  const malformedTools = new Map();
  const malformedEvents = new Map();
  const malformedMessages = [];
  assert.doesNotThrow(() => registerLearnerPlugin({
    pi: { getAgentDir: () => agentDir },
    zod: { z },
    registerCommand(name, command) { malformedCommands.set(name, command); },
    registerTool(tool) { malformedTools.set(tool.name, tool); },
    on(name, callback) { malformedEvents.set(name, callback); },
    sendMessage(message) { malformedMessages.push(message); },
  }));
  assert.ok(malformedCommands.has('learner'));
  assert.ok(malformedTools.has('learner_file_ticket'));
  assert.ok(malformedEvents.has('session_start'));
  const malformedWarnings = [];
  malformedEvents.get('session_start')({}, { agentDir, setTimeout: (callback) => callback(), ui: { notify: (...args) => malformedWarnings.push(args) } });
  assert.match(malformedWarnings.at(-1)[0], /Learner advisor setup failed:/);
  await malformedCommands.get('learner').handler('status', { agentDir });
  assert.match(malformedMessages.at(-1).content, /Learner setup failed:/);
  writeFileSync(configurationPath(agentDir), previousConfiguration);

  const scheduled = [];
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);
  events.get('session_start')({}, { agentDir, setTimeout: (callback) => scheduled.push(callback), ui: { notify: () => {} } });
  assert.equal(scheduled.length, 1);
  scheduled[0]();
  assert.match(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);

  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'user-owned notes');
  disableLearner(agentDir);
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), 'user-owned notes');
  assert.doesNotMatch(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);
  assert.match(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-verifier: advisor begin/);
  assert.ok(existsSync(configurationPath(agentDir)));
  await assert.rejects(() => ticketTool.execute('ticket-6', ticket('knowledge_base', 'Disabled filing'), undefined, undefined, { cwd: '/tmp/project' }), /disabled/);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
