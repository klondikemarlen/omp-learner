import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { configureLearner, disableLearner, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { registerLearnerPlugin } from '../omp-plugin/learner.mjs';

test('when an override is present, its policy replaces the default and follows the configured destination', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-override-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  configureLearner(agentDir);
  const overridePath = path.join(agentDir, 'learner', 'WATCHDOG.override.md');
  writeFileSync(overridePath, '# Custom policy\nUse {{KNOWLEDGE_BASE_REPOSITORY}}; retain $& and {{UNRELATED}} literally.\n');

  // Act
  configureLearner(agentDir, { knowledgeBaseRepository: 'another-owner/guidance' });

  // Assert
  assert.match(
    readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'),
    /\n# Custom policy\nUse another-owner\/guidance; retain \$& and \{\{UNRELATED\}\} literally\.\n$/,
  );
  assert.equal(readFileSync(overridePath, 'utf8'), '# Custom policy\nUse {{KNOWLEDGE_BASE_REPOSITORY}}; retain $& and {{UNRELATED}} literally.\n');
});

test('when an override is removed after a package update, the current packaged Markdown becomes active', async (t) => {
  // Arrange
  const root = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-package-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageDir = path.join(root, 'installed-package');
  const agentDir = path.join(root, 'agent');
  mkdirSync(packageDir);
  copyFileSync(new URL('../omp-plugin/learner/config.mjs', import.meta.url), path.join(packageDir, 'config.mjs'));
  writeFileSync(path.join(packageDir, 'WATCHDOG.md'), '# First package policy\nOwner: {{KNOWLEDGE_BASE_REPOSITORY}}\n');
  const installedConfiguration = await import(pathToFileURL(path.join(packageDir, 'config.mjs')));
  installedConfiguration.configureLearner(agentDir);
  const overridePath = path.join(agentDir, 'learner', 'WATCHDOG.override.md');
  const instructionsPath = path.join(agentDir, 'learner', 'WATCHDOG.md');
  writeFileSync(overridePath, '# Personal replacement\nOwner: {{KNOWLEDGE_BASE_REPOSITORY}}\n');
  installedConfiguration.configureLearner(agentDir);
  writeFileSync(path.join(packageDir, 'WATCHDOG.md'), '# Updated package policy\nOwner: {{KNOWLEDGE_BASE_REPOSITORY}}\n');
  installedConfiguration.configureLearner(agentDir);
  assert.match(readFileSync(instructionsPath, 'utf8'), /\n# Personal replacement\nOwner: klondikemarlen\/marlens-skills-rules-and-tools\n$/);

  // Act
  rmSync(overridePath);
  installedConfiguration.configureLearner(agentDir, { knowledgeBaseRepository: 'owner/current-guidance' });

  // Assert
  assert.match(readFileSync(instructionsPath, 'utf8'), /\n# Updated package policy\nOwner: owner\/current-guidance\n$/);
});

test('when Learner is disabled and re-enabled, the user override and unrelated roster entries survive', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-disable-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  const rosterPath = path.join(agentDir, 'WATCHDOG.yml');
  const unrelatedRoster = 'advisors:\n  - name: default\n  - name: verifier\n    enabled: true\n';
  writeFileSync(rosterPath, unrelatedRoster);
  configureLearner(agentDir);
  const overridePath = path.join(agentDir, 'learner', 'WATCHDOG.override.md');
  const instructionsPath = path.join(agentDir, 'learner', 'WATCHDOG.md');
  writeFileSync(overridePath, '# User policy without a Learner heading\nKeep these instructions.\n');
  configureLearner(agentDir);

  // Act
  disableLearner(agentDir);

  // Assert
  assert.equal(readFileSync(overridePath, 'utf8'), '# User policy without a Learner heading\nKeep these instructions.\n');
  assert.equal(existsSync(instructionsPath), false);
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(readFileSync(rosterPath, 'utf8'), unrelatedRoster);

  // Act
  configureLearner(agentDir);

  // Assert
  assert.match(readFileSync(instructionsPath, 'utf8'), /\n# User policy without a Learner heading\nKeep these instructions\.\n$/);
  assert.equal(readFileSync(overridePath, 'utf8'), '# User policy without a Learner heading\nKeep these instructions.\n');
  assert.match(readFileSync(rosterPath, 'utf8'), /- name: verifier\n    enabled: true/);
});

test('when an enabled session starts after an override edit, the advisor receives the edited policy', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-session-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  configureLearner(agentDir);
  const overridePath = path.join(agentDir, 'learner', 'WATCHDOG.override.md');
  writeFileSync(overridePath, '# Earlier custom policy\n');
  const events = new Map();
  registerLearnerPlugin({
    pi: { getAgentDir: () => agentDir },
    registerCommand() {},
    on(name, callback) { events.set(name, callback); },
  });
  writeFileSync(overridePath, '# Edited custom policy\nDestination: {{KNOWLEDGE_BASE_REPOSITORY}}\n');

  // Act
  events.get('session_start')({}, { agentDir, setTimeout: (callback) => callback() });

  // Assert
  assert.match(
    readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'),
    /\n# Edited custom policy\nDestination: klondikemarlen\/marlens-skills-rules-and-tools\n$/,
  );
});

test('when a disabled session starts, the override does not re-enable Learner or recreate managed guidance', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-disabled-session-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  configureLearner(agentDir);
  const overridePath = path.join(agentDir, 'learner', 'WATCHDOG.override.md');
  writeFileSync(overridePath, '# Retained custom policy\n');
  disableLearner(agentDir);
  const events = new Map();
  registerLearnerPlugin({
    pi: { getAgentDir: () => agentDir },
    registerCommand() {},
    on(name, callback) { events.set(name, callback); },
  });

  // Act
  events.get('session_start')({}, { agentDir, setTimeout: (callback) => callback() });

  // Assert
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(existsSync(path.join(agentDir, 'learner', 'WATCHDOG.md')), false);
  assert.equal(readFileSync(overridePath, 'utf8'), '# Retained custom policy\n');
});

test('when an override cannot be read, setup leaves the active policy, roster, and destination unchanged', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-read-error-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  configureLearner(agentDir, { knowledgeBaseRepository: 'owner/original-guidance' });
  const instructionsPath = path.join(agentDir, 'learner', 'WATCHDOG.md');
  const rosterPath = path.join(agentDir, 'WATCHDOG.yml');
  const previousInstructions = readFileSync(instructionsPath, 'utf8');
  const previousRoster = readFileSync(rosterPath, 'utf8');
  mkdirSync(path.join(agentDir, 'learner', 'WATCHDOG.override.md'));

  // Act / Assert
  assert.throws(() => configureLearner(agentDir, { knowledgeBaseRepository: 'owner/replacement-guidance' }), { code: 'EISDIR' });
  assert.equal(readFileSync(instructionsPath, 'utf8'), previousInstructions);
  assert.equal(readFileSync(rosterPath, 'utf8'), previousRoster);
  assert.equal(readConfiguration(agentDir).knowledgeBaseRepository, 'owner/original-guidance');
});

test('when an override is empty, it remains an explicit replacement rather than selecting the default', (t) => {
  // Arrange
  const agentDir = mkdtempSync(path.join(os.tmpdir(), 'learner-guidance-empty-'));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  configureLearner(agentDir);
  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.override.md'), '');

  // Act
  configureLearner(agentDir);

  // Assert
  const instructions = readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8');
  assert.equal(instructions.slice(instructions.indexOf('\n') + 1), '');
});
