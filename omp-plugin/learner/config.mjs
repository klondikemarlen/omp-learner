import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_VERSION = 4;
const LEARNER_DIR = 'learner';
const WATCHDOG_FILE = 'WATCHDOG.yml';
const WATCHDOG_INSTRUCTIONS_FILE = 'WATCHDOG.md';
const MARKER_START = '# omp-learner: begin';
const MARKER_END = '# omp-learner: end';

export function resolveAgentDir(env = process.env, agentDir) {
  return agentDir || env.PI_CODING_AGENT_DIR || path.join(env.HOME || os.homedir(), '.omp', 'agent');
}

export function configurationPath(agentDir) {
  return path.join(agentDir, LEARNER_DIR, 'config.json');
}

export function readConfiguration(agentDir) {
  const filePath = configurationPath(agentDir);
  if (!existsSync(filePath)) return { version: CONFIG_VERSION, enabled: false };

  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return { version: CONFIG_VERSION, enabled: Boolean(parsed.enabled) };
}

export function normalizeUpstream(value) {
  const match = String(value || '').trim().match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Upstream must be an HTTPS GitHub repository URL, for example https://github.com/owner/repository.');

  return `${match[1]}/${match[2]}`;
}

export function configureLearner(agentDir) {
  const instructionsPath = path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE);
  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  const currentWatchdog = existsSync(watchdogPath) ? readFileSync(watchdogPath, 'utf8') : '';
  const nextWatchdog = withLearnerAdvisor(currentWatchdog, agentDir);

  writeText(instructionsPath, learnerInstructions(), 0o600);
  if (nextWatchdog !== currentWatchdog) writeText(watchdogPath, nextWatchdog, 0o600);
  writeConfiguration(agentDir, { version: CONFIG_VERSION, enabled: true });
  return { configPath: configurationPath(agentDir), watchdogPath };
}

export function disableLearner(agentDir) {
  writeConfiguration(agentDir, { ...readConfiguration(agentDir), enabled: false });
  removeLearnerAdvisor(agentDir);
}

function removeLearnerAdvisor(agentDir) {
  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  if (existsSync(watchdogPath)) {
    const currentWatchdog = readFileSync(watchdogPath, 'utf8');
    const nextWatchdog = withoutLearnerAdvisor(currentWatchdog);
    if (!nextWatchdog.trim()) rmSync(watchdogPath);
    else if (nextWatchdog !== currentWatchdog) writeText(watchdogPath, nextWatchdog, 0o600);
  }
  const instructionsPath = path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE);
  if (existsSync(instructionsPath) && /^# OMP Learner (?:advisor|watchdog)\n/.test(readFileSync(instructionsPath, 'utf8'))) rmSync(instructionsPath);
}

function withLearnerAdvisor(watchdog, agentDir) {
  const base = withoutLearnerAdvisor(watchdog).replace(/\s*$/, '') || 'advisors:\n  - name: default';
  const lines = base.split('\n');
  let start = lines.findIndex((line) => /^advisors:\s*$/.test(line));
  if (start < 0) {
    lines.push('', 'advisors:', '  - name: default');
    start = lines.length - 2;
  }
  const end = lines.findIndex((line, index) => index > start && /^\S/.test(line));
  lines.splice(end < 0 ? lines.length : end, 0, '', ...learnerAdvisorBlock(agentDir), '');
  return `${lines.join('\n').replace(/\s*$/, '')}\n`;
}

function withoutLearnerAdvisor(watchdog) {
  return watchdog.replace(new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n');
}

function learnerAdvisorBlock(agentDir) {
  return [
    MARKER_START,
    '  - name: learner',
    '    tools: [read, grep, glob]',
    '    instructions: |',
    `      @${path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE)}`,
    MARKER_END,
  ];
}

function learnerInstructions() {
  return `# OMP Learner advisor

You are the independent, non-blocking learner advisor. Review completed turns for explicit, durable user feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Ignore ordinary task requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty.

When feedback is high-confidence and reusable, use advise once with a concise recommendation for human review. Do not edit files, run commands, file issues, open pull requests, or block the primary task.
`;
}

function writeConfiguration(agentDir, configuration) {
  writeText(configurationPath(agentDir), `${JSON.stringify(configuration, null, 2)}\n`, 0o600);
}

function writeText(filePath, content, mode) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, content, { mode });
  renameSync(temporaryPath, filePath);
}
