import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_VERSION = 5;
export const LEARNER_REPOSITORY = 'klondikemarlen/omp-learner';
export const DEFAULT_KNOWLEDGE_BASE_REPOSITORY = 'klondikemarlen/omp-config';
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

export function normalizeRepository(value) {
  const candidate = String(value || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\/?\.git\/?$/, '').replace(/\/$/, '');
  if (!candidate) return DEFAULT_KNOWLEDGE_BASE_REPOSITORY;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate)) throw new Error('Knowledge base must be a GitHub owner/repository or HTTPS repository URL.');
  return candidate;
}

export function readConfiguration(agentDir) {
  const filePath = configurationPath(agentDir);
  if (!existsSync(filePath)) return { version: CONFIG_VERSION, enabled: false, knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY };

  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return {
    version: CONFIG_VERSION,
    enabled: Boolean(parsed.enabled),
    knowledgeBaseRepository: normalizeRepository(parsed.knowledgeBaseRepository),
  };
}


export function configureLearner(agentDir, { knowledgeBaseRepository } = {}) {
  const configuration = readConfiguration(agentDir);
  const nextConfiguration = { version: CONFIG_VERSION, enabled: true, knowledgeBaseRepository: normalizeRepository(knowledgeBaseRepository ?? configuration.knowledgeBaseRepository) };
  const instructionsPath = path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE);
  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  const currentWatchdog = existsSync(watchdogPath) ? readFileSync(watchdogPath, 'utf8') : '';
  const nextWatchdog = withLearnerAdvisor(currentWatchdog, agentDir);

  writeText(instructionsPath, learnerInstructions(), 0o600);
  if (nextWatchdog !== currentWatchdog) writeText(watchdogPath, nextWatchdog, 0o600);
  writeConfiguration(agentDir, nextConfiguration);
  return { configPath: configurationPath(agentDir), watchdogPath, knowledgeBaseRepository: nextConfiguration.knowledgeBaseRepository };
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
    '    tools: [read, grep, glob, learn, learner_file_ticket]',
    '    instructions: |',
    `      @${path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE)}`,
    MARKER_END,
  ];
}

function learnerInstructions() {
  return `# OMP Learner advisor

You are the independent, non-blocking learner advisor. Review completed turns for explicit, durable user feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Ignore ordinary task requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty.

When feedback is high-confidence and reusable, call OMP's core learn tool once with a concise, self-contained lesson and source context. Code-style standards are durable preferences: store them with learn so future generated code follows them.

File a high-confidence implementation improvement with learner_file_ticket only when it needs tracked work. Prefer knowledge_base for reusable guidance, local for a project-specific change in the active checkout, and learner only for a gap owned by this omp-learner plugin. Do not route OMP runtime, built-in tool, or other-plugin gaps here. Do not advise, edit files, run commands, file pull requests, or create more than one ticket.
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
