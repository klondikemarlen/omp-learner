import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_KNOWLEDGE_BASE_REPOSITORY, configurationPath, configureLearner, disableLearner, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { createLearnerTicketTool } from '../omp-plugin/learner/ticket.mjs';
import { createToolLoopGuard, registerLearnerPlugin } from '../omp-plugin/learner.mjs';

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
const z = {
  object: (shape) => shape,
  array: (schema) => schema,
  enum: (values) => values,
  string: () => ({
    max() { return this; },
    optional() { return this; },
    describe() { return this; },
  }),
};

try {
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  const missingConfiguration = readConfiguration(path.join(agentDir, 'missing-agent'));
  assert.deepEqual(missingConfiguration, { version: 6, enabled: false, knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY });

  const configured = configureLearner(agentDir);
  assert.equal(configured.configPath, configurationPath(agentDir));
  assert.equal(configured.knowledgeBaseRepository, DEFAULT_KNOWLEDGE_BASE_REPOSITORY);
  assert.deepEqual(readConfiguration(agentDir), { version: 6, enabled: true, knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);

  writeFileSync(configurationPath(agentDir), JSON.stringify({
    version: 5,
    enabled: false,
    knowledgeBaseRepository: 'KLONDIKEMARLEN/OMP-CONFIG',
  }));
  assert.deepEqual(readConfiguration(agentDir), {
    version: 6,
    enabled: false,
    knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY,
  });
  disableLearner(agentDir);
  assert.deepEqual(JSON.parse(readFileSync(configurationPath(agentDir), 'utf8')), {
    version: 6,
    enabled: false,
    knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY,
  });

  writeFileSync(configurationPath(agentDir), JSON.stringify({
    version: 5,
    enabled: true,
    knowledgeBaseRepository: 'owner/custom-repository',
  }));
  assert.deepEqual(readConfiguration(agentDir), {
    version: 6,
    enabled: true,
    knowledgeBaseRepository: 'owner/custom-repository',
  });
  configureLearner(agentDir);
  assert.deepEqual(JSON.parse(readFileSync(configurationPath(agentDir), 'utf8')), {
    version: 6,
    enabled: true,
    knowledgeBaseRepository: 'owner/custom-repository',
  });

  configureLearner(agentDir, { knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY });
  const configuredRoster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.match(configuredRoster, /# omp-verifier: advisor begin/);
  assert.match(configuredRoster, /# omp-learner: begin/);

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
  const verifierTicket = (target, title, classification = 'deterministic') => ({
    ...ticket(target, title),
    proposalType: 'verifier_check',
    candidateOwner: 'The team that owns this check.',
    acceptedRule: 'The shared or project rule was accepted after review.',
    classification,
    goldCondition: 'The check proves the accepted rule without inventing new behavior.',
    passEvidence: 'PASS: the accepted rule is satisfied.',
    failEvidence: 'FAIL: the accepted rule is violated.',
    blockedEvidence: 'BLOCKED: required evidence or runtime support is unavailable.',
    nonGoals: 'Do not execute commands or create enforcement automatically.',
  });

  const knowledgeBaseTicket = await ticketTool.execute('ticket-1', ticket('knowledge_base', 'Capture reusable guidance'), undefined, undefined, { cwd: '/tmp/project' });
  assert.deepEqual(knowledgeBaseTicket, {
    content: [{ type: 'text', text: 'Created learner ticket: https://github.com/icefoganalytics/wrap/issues/99' }],
    details: { created: true, url: 'https://github.com/icefoganalytics/wrap/issues/99' },
  });
  assert.ok(calls[0].includes(DEFAULT_KNOWLEDGE_BASE_REPOSITORY));
  assert.match(calls[1][calls[1].indexOf('--body') + 1], /\[REDACTED\]/);
  calls.length = 0;
  const boundarySecret = 'github_pat_abcdefghijklmnopqrstuvwxyz';
  await ticketTool.execute('ticket-1b', { ...ticket('knowledge_base', 'Redact boundary secret'), evidence: `${'x'.repeat(3_990)} token=${boundarySecret}` }, undefined, undefined, { cwd: '/tmp/project' });
  const boundaryBody = calls[1][calls[1].indexOf('--body') + 1];
  assert.doesNotMatch(boundaryBody, new RegExp(boundarySecret));

  const proposalPrefix = [
    '## Change proposal',
    '',
    'Preserve this paragraph.',
    '',
    '- Preserve this list.',
    '',
    '```js',
    'return true;',
    '```',
    '',
  ].join('\n');
  const multilineProposal = `${proposalPrefix}${'x'.repeat(5_161 - proposalPrefix.length)}`;
  const multilineEvidence = [
    '## Source notes',
    '',
    'First evidence paragraph.',
    '',
    '- Keep the evidence list.',
    '',
    '```text',
    'token=github_pat_abcdefghijklmnopqrstuvwxyz',
    '```',
  ].join('\n');
  const sanitizedEvidence = multilineEvidence.replace(
    'token=github_pat_abcdefghijklmnopqrstuvwxyz',
    'token: [REDACTED]',
  );
  calls.length = 0;
  await ticketTool.execute('ticket-1c', {
    ...ticket('knowledge_base', 'Preserve complete multiline content'),
    proposal: multilineProposal,
    evidence: multilineEvidence,
  }, undefined, undefined, { cwd: '/tmp/project' });
  const multilineBody = calls[1][calls[1].indexOf('--body') + 1];
  assert.ok(multilineBody.includes(multilineProposal), 'The entire 5,161-character proposal should be retained.');
  assert.ok(multilineBody.includes(sanitizedEvidence), 'Evidence formatting should survive redaction.');
  assert.doesNotMatch(multilineBody, /github_pat_abcdefghijklmnopqrstuvwxyz/);

  calls.length = 0;
  await ticketTool.execute('ticket-2', ticket('learner', 'Improve learner routing'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('klondikemarlen/omp-learner'));

  calls.length = 0;
  await ticketTool.execute('ticket-3', ticket('local', 'Fix project-local behavior'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('icefoganalytics/wrap'));
  calls.length = 0;
  const verifierFieldPayloads = {
    proposal: '## Proposed check\n\nPreserve this paragraph.\n\n- Preserve this list.\n\n```js\ncheck();\n```',
    evidence: '## Source detail\n\nKeep this evidence paragraph.\n\n- Keep this list.',
    acceptedRule: '## Accepted rule\n\nThe accepted rule spans paragraphs.\n\n- Keep its list.',
    goldCondition: '## Gold condition\n\nGold evidence remains multiline.\n\n```text\nexpected\n```',
    passEvidence: '## PASS evidence\n\npassword=must-not-leak\n\n```text\nPASS\n```',
    failEvidence: '## FAIL evidence\n\nKeep this failure paragraph.\n\n- Keep this list.',
    blockedEvidence: '## BLOCKED evidence\n\nKeep this blocked paragraph.\n\n```text\nBLOCKED\n```',
    nonGoals: '## Non-goals\n\nKeep this non-goal paragraph.\n\n- Do not execute commands.',
  };
  calls.length = 0;
  await ticketTool.execute('ticket-3a', {
    ...verifierTicket('reusable_check', 'Propose shared verifier check'),
    ...verifierFieldPayloads,
  }, undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('klondikemarlen/marlens-skills-rules-and-tools'));
  const verifierBody = calls[1][calls[1].indexOf('--body') + 1];
  for (const [field, payload] of Object.entries(verifierFieldPayloads)) {
    if (field !== 'passEvidence') {
      assert.ok(verifierBody.includes(payload), `${field} should retain its multiline formatting.`);
    }
  }

  assert.ok(verifierBody.includes('## PASS evidence\n\npassword: [REDACTED]\n\n```text\nPASS\n```'));
  assert.doesNotMatch(verifierBody, /must-not-leak/);
  assert.match(verifierBody, /\*\*Candidate owner:\*\* The team that owns this check\./);
  assert.match(verifierBody, /\*\*Classification:\*\* deterministic/);

  const maximumVerifierInput = {
    ...verifierTicket('reusable_check', 'Bound the complete generated body'),
    proposal: 'x'.repeat(6_000),
    evidence: 'x'.repeat(6_000),
    acceptedRule: 'x'.repeat(6_000),
    goldCondition: 'x'.repeat(6_000),
    passEvidence: 'x'.repeat(6_000),
    failEvidence: 'x'.repeat(6_000),
    blockedEvidence: 'x'.repeat(6_000),
    nonGoals: 'x'.repeat(6_000),
  };
  calls.length = 0;
  await ticketTool.execute('ticket-3a-max', maximumVerifierInput, undefined, undefined, { cwd: '/tmp/project' });
  const maximumVerifierBody = calls[1][calls[1].indexOf('--body') + 1];
  assert.ok(maximumVerifierBody.length <= 65_536);

  calls.length = 0;
  await ticketTool.execute('ticket-3b', verifierTicket('project_check', 'Propose project verifier check', 'agentic'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('icefoganalytics/wrap'));
  const projectVerifierBody = calls[1][calls[1].indexOf('--body') + 1];
  assert.match(projectVerifierBody, /\*\*Classification:\*\* agentic/);
  calls.length = 0;
  await ticketTool.execute('ticket-3c', verifierTicket('verifier', 'Propose verifier runtime check'), undefined, undefined, { cwd: '/tmp/project' });
  assert.ok(calls[0].includes('klondikemarlen/omp-verifier'));
  await assert.rejects(() => ticketTool.execute('ticket-3d', { ...verifierTicket('verifier', 'Reject unknown classification'), classification: 'unknown' }, undefined, undefined, { cwd: '/tmp/project' }), /deterministic or agentic/);
  await assert.rejects(() => ticketTool.execute('ticket-3e', ticket('verifier', 'Reject implicit verifier proposal'), undefined, undefined, { cwd: '/tmp/project' }), /explicit verification support/);
  await assert.rejects(() => ticketTool.execute('ticket-4', { ...ticket('local', 'Reject low confidence'), confidence: 'low' }, undefined, undefined, { cwd: '/tmp/project' }), /requires high confidence/);
  const nonGitHubLocalTool = createLearnerTicketTool({ agentDir, z, runGit: async () => 'git@gitlab.com:owner/project.git\n' });
  await assert.rejects(() => nonGitHubLocalTool.execute('ticket-4', ticket('local', 'Reject non-GitHub origin'), undefined, undefined, { cwd: '/tmp/project' }), /GitHub origin/);

  await assert.rejects(() => ticketTool.execute('missing-cwd', ticket('local', 'Missing project context')), /without a working directory/);

  const failedTicketTool = createLearnerTicketTool({
    agentDir,
    z,
    runGh: async () => {
      throw new Error('GitHub authentication unavailable');
    },
  });
  await assert.rejects(() => failedTicketTool.execute('failed-ticket', ticket('knowledge_base', 'Unavailable GitHub action')), /GitHub authentication unavailable/);

  let createdTickets = 0;
  const duplicateUrl = 'https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/1';
  const createdFingerprints = new Set();
  const searchFingerprints = [];
  const deduplicatingTool = createLearnerTicketTool({
    agentDir,
    z,
    runGh: async (args) => {
      if (args[1] === 'list') {
        const fingerprint = args[args.indexOf('--search') + 1];
        searchFingerprints.push(fingerprint);
        return JSON.stringify(createdFingerprints.has(fingerprint) ? [{ url: duplicateUrl }] : []);
      }

      const body = args[args.indexOf('--body') + 1];
      const fingerprint = body.match(/<!-- omp-learner-ticket:([a-f0-9]{20}) -->/)?.[1];
      assert.ok(fingerprint, 'Created issue body should contain its fingerprint.');
      createdFingerprints.add(fingerprint);
      createdTickets += 1;
      return duplicateUrl;
    },
  });
  const repeatedProposal = ticket('knowledge_base', 'Capture reusable guidance');
  await deduplicatingTool.execute('ticket-first', repeatedProposal);
  const duplicate = await deduplicatingTool.execute('ticket-repeat', repeatedProposal);
  assert.deepEqual(duplicate, {
    content: [{ type: 'text', text: `Existing learner ticket: ${duplicateUrl}` }],
    details: { created: false, url: duplicateUrl },
  });
  assert.equal(searchFingerprints[0], searchFingerprints[1], 'The exact accepted proposal should reuse its marker.');
  assert.equal(createdTickets, 1);

  const sharedMarkerPrefix = 'x'.repeat(2_000);
  await deduplicatingTool.execute('ticket-suffix-a', {
    ...ticket('knowledge_base', 'Suffix-sensitive marker'),
    proposal: `${sharedMarkerPrefix} first suffix`,
  });
  await deduplicatingTool.execute('ticket-suffix-b', {
    ...ticket('knowledge_base', 'Suffix-sensitive marker'),
    proposal: `${sharedMarkerPrefix} second suffix`,
  });
  assert.notEqual(
    searchFingerprints[2],
    searchFingerprints[3],
    'Different accepted proposal suffixes after the former 2,000-character cut must use different markers.',
  );
  assert.equal(createdTickets, 3, 'Distinct accepted proposals should each create an issue.');

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
  assert.equal(events.size, 3);
  assert.equal(tools.get('learner_file_ticket').approval, 'write');
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);
  const repeatedEdit = { toolName: 'edit', toolCallId: 'edit-1', input: { path: 'file', oldText: 'old', newText: 'new' } };
  assert.equal(events.get('tool_call')(repeatedEdit, { agentDir }), undefined);
  events.get('tool_result')({ ...repeatedEdit, isError: true }, { agentDir });
  const blockedEdit = events.get('tool_call')({ ...repeatedEdit, toolCallId: 'edit-2', input: { newText: 'new', oldText: 'old', path: 'file' } }, { agentDir });
  assert.equal(blockedEdit.block, true);
  assert.match(blockedEdit.reason, /Re-read the current state and retry with a fresh anchor/);
  const successfulEdit = createToolLoopGuard();
  successfulEdit.onToolCall(repeatedEdit);
  successfulEdit.onToolResult({ toolCallId: repeatedEdit.toolCallId, isError: false, content: [{ type: 'text', text: 'edited file' }] });
  assert.equal(successfulEdit.onToolCall({ ...repeatedEdit, toolCallId: 'edit-3' }), undefined);
  const staleAnchorGuard = createToolLoopGuard();
  staleAnchorGuard.onToolCall(repeatedEdit);
  staleAnchorGuard.onToolResult({ toolCallId: repeatedEdit.toolCallId, isError: false, content: [{ type: 'text', text: 'stale anchor' }] });
  assert.equal(staleAnchorGuard.onToolCall({ ...repeatedEdit, toolCallId: 'edit-4' }).block, true);
  const readGuard = createToolLoopGuard();
  readGuard.onToolCall({ toolName: 'read', toolCallId: 'read-1', input: { path: 'file' } });
  readGuard.onToolResult({ toolCallId: 'read-1', isError: false, content: [{ type: 'text', text: 'no changes' }] });
  assert.equal(readGuard.onToolCall({ toolName: 'read', toolCallId: 'read-2', input: { path: 'file' } }), undefined);

  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /advisor: on/);

  await commands.get('learner').handler('setup https://github.com/owner/repository.git', { agentDir });
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
  assert.equal(events.get('tool_call')(repeatedEdit, { agentDir }), undefined);
  assert.equal(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), 'user-owned notes');
  assert.doesNotMatch(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);
  assert.match(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-verifier: advisor begin/);
  assert.ok(existsSync(configurationPath(agentDir)));
  await assert.rejects(() => ticketTool.execute('ticket-6', ticket('knowledge_base', 'Disabled filing'), undefined, undefined, { cwd: '/tmp/project' }), /disabled/);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
