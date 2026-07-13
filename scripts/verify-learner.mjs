import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureLearner, configurationPath, disableLearner, normalizeUpstream, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { registerLearnerPlugin } from '../omp-plugin/learner.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-check-'));
try {
  const verifierRoster = `# omp-verifier: generated\nadvisors:\n  - name: default\n    tools: [read, grep, glob]\n\ninstructions: |\n  Keep advice concise.\n`;
  const setupOptions = { verifyUpstream: () => {} };
  writeFileSync(path.join(agentDir, 'config.yml'), 'modelRoles:\n  advisor: openai/gpt-5\nadvisor:\n  enabled: false\n');
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  assert.equal(normalizeUpstream('https://github.com/owner/repository.git'), 'owner/repository');
  assert.throws(() => normalizeUpstream('owner/repository'), /HTTPS GitHub repository URL/);

  const noModelAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-no-model-'));
  assert.throws(() => configureLearner(noModelAgentDir, 'https://github.com/owner/repository', setupOptions), /modelRoles\.advisor/);
  rmSync(noModelAgentDir, { recursive: true, force: true });

  const blankModelAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-blank-model-'));
  writeFileSync(path.join(blankModelAgentDir, 'config.yml'), 'modelRoles:\n  advisor:\n');
  assert.throws(() => configureLearner(blankModelAgentDir, 'https://github.com/owner/repository', setupOptions), /modelRoles\.advisor/);
  rmSync(blankModelAgentDir, { recursive: true, force: true });
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
  assert.deepEqual(readConfiguration(agentDir), { version: 2, enabled: true, upstream: 'owner/repository' });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);
  assert.match(readFileSync(path.join(agentDir, 'config.yml'), 'utf8'), /advisor:\n  enabled: true/);

  const roster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.match(roster, /# omp-verifier: generated/);
  assert.match(roster, /name: default/);
  assert.match(roster, /# omp-learner: begin/);
  assert.match(roster, /name: learner/);
  assert.match(roster, /tools: \[read, grep, glob\]/);
  assert.doesNotMatch(roster, /learner_file_issue/);
  assert.ok(roster.indexOf('name: learner') < roster.indexOf('instructions: |'));
  const instructions = readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8');
  assert.match(instructions, /configured upstream repository is owner\/repository/);
  assert.match(instructions, /Do not file GitHub issues/);

  configureLearner(agentDir, 'https://github.com/owner/updated', setupOptions);
  const updatedRoster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.equal(updatedRoster.match(/# omp-learner: begin/g).length, 1);
  assert.match(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), /owner\/updated/);

  const commands = new Map();
  const tools = new Map();
  const events = new Map();
  const messages = [];
  const pi = {
    pi: { getAgentDir: () => agentDir },
    registerCommand(name, command) { commands.set(name, command); },
    registerTool(tool) { tools.set(tool.name, tool); },
    on(name, callback) { events.set(name, callback); },
    sendMessage(message) { messages.push(message); },
  };
  registerLearnerPlugin(pi);
  assert.equal(tools.size, 0);
  assert.equal(events.size, 0);
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);
  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /watchdog: configured/);
  assert.match(messages.at(-1).content, /issue filing: unavailable/);

  disableLearner(agentDir);
  assert.equal(readConfiguration(agentDir).enabled, false);
  const disabledRoster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.match(disabledRoster, /# omp-verifier: generated/);
  assert.doesNotMatch(disabledRoster, /# omp-learner: begin/);
  await commands.get('learner').handler('off', { agentDir });
  assert.match(messages.at(-1).content, /disabled/);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
