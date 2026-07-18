import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configurationPath, configureLearner, disableLearner, readConfiguration } from '../omp-plugin/learner/config.mjs';
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

try {
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  const configured = configureLearner(agentDir);
  assert.equal(configured.configPath, configurationPath(agentDir));
  assert.deepEqual(readConfiguration(agentDir), { version: 4, enabled: true });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);
  const configuredRoster = readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8');
  assert.match(configuredRoster, /# omp-verifier: advisor begin/);
  assert.match(configuredRoster, /# omp-learner: begin/);
  assert.match(configuredRoster, /tools: \[read, grep, glob, learn\]/);
  assert.match(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), /core learn tool/);

  const commands = new Map();
  const events = new Map();
  const messages = [];
  const pi = {
    pi: { getAgentDir: () => agentDir },
    registerCommand(name, command) { commands.set(name, command); },
    on(name, callback) { events.set(name, callback); },
    sendMessage(message) { messages.push(message); },
  };
  registerLearnerPlugin(pi);
  assert.equal(events.size, 1);
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);

  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /advisor: on/);
  assert.match(messages.at(-1).content, /core learning: uses OMP's learn tool/);

  disableLearner(agentDir);
  await commands.get('learner').handler('setup https://github.com/owner/repository', { agentDir });
  assert.match(messages.at(-1).content, /Usage: \/learner setup/);
  assert.equal(readConfiguration(agentDir).enabled, false);

  await commands.get('learner').handler('setup', { agentDir });
  assert.match(messages.at(-1).content, /core learn tool/);
  assert.equal(readConfiguration(agentDir).enabled, true);

  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);
  events.get('session_start')({}, { agentDir, ui: { notify: () => {} } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);

  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'user-owned notes');
  disableLearner(agentDir);
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), 'user-owned notes');
  assert.doesNotMatch(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);
  assert.match(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-verifier: advisor begin/);
  assert.ok(existsSync(configurationPath(agentDir)));
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
