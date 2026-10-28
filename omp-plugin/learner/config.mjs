import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_VERSION = 6;
export const LEARNER_REPOSITORY = 'klondikemarlen/omp-learner';
export const DEFAULT_KNOWLEDGE_BASE_REPOSITORY = 'klondikemarlen/marlens-skills-rules-and-tools';
const LEARNER_DIR = 'learner';
const WATCHDOG_FILE = 'WATCHDOG.yml';
const WATCHDOG_INSTRUCTIONS_FILE = 'WATCHDOG.md';
const WATCHDOG_OVERRIDE_FILE = 'WATCHDOG.override.md';
const GENERATED_GUIDANCE_MARKER = '<!-- omp-learner: generated instructions; edit WATCHDOG.override.md instead -->';
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
  if (!existsSync(filePath)) {
    return { version: CONFIG_VERSION, enabled: false, knowledgeBaseRepository: DEFAULT_KNOWLEDGE_BASE_REPOSITORY };
  }

  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  const storedKnowledgeBaseRepository = migrateKnowledgeBaseRepository(normalizeRepository(parsed.knowledgeBaseRepository));
  return {
    version: CONFIG_VERSION,
    enabled: Boolean(parsed.enabled),
    knowledgeBaseRepository: storedKnowledgeBaseRepository,
  };
}

export function configureLearner(agentDir, { knowledgeBaseRepository } = {}) {
  const configuration = readConfiguration(agentDir);
  const nextConfiguration = {
    version: CONFIG_VERSION,
    enabled: true,
    knowledgeBaseRepository: migrateKnowledgeBaseRepository(normalizeRepository(knowledgeBaseRepository ?? configuration.knowledgeBaseRepository)),
  };
  const instructionsPath = path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE);
  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  const currentWatchdog = existsSync(watchdogPath) ? readFileSync(watchdogPath, 'utf8') : '';
  const nextWatchdog = withLearnerAdvisor(currentWatchdog, agentDir);

  writeText(instructionsPath, learnerInstructions(agentDir, nextConfiguration.knowledgeBaseRepository), 0o600);
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
  if (existsSync(instructionsPath)) {
    const instructions = readFileSync(instructionsPath, 'utf8');
    if (instructions.startsWith(GENERATED_GUIDANCE_MARKER) || /^# OMP Learner (?:advisor|watchdog)\n/.test(instructions)) {
      rmSync(instructionsPath);
    }
  }
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
    '    tools: [read, grep, glob, learn, eval]',
    '    instructions: |',
    `      @${path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE)}`,
    MARKER_END,
  ];
}

function learnerInstructions(agentDir, knowledgeBaseRepository) {
  const overridePath = path.join(agentDir, LEARNER_DIR, WATCHDOG_OVERRIDE_FILE);
  let template;

  try {
    template = readFileSync(overridePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;

    template = readFileSync(new URL('./WATCHDOG.md', import.meta.url), 'utf8');
  }

  const instructions = template.replaceAll('{{KNOWLEDGE_BASE_REPOSITORY}}', () => knowledgeBaseRepository);
  return `${GENERATED_GUIDANCE_MARKER}\n${instructions}`;
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

function migrateKnowledgeBaseRepository(repository) {
  if (repository.toLowerCase() === 'klondikemarlen/omp-config') {
    return DEFAULT_KNOWLEDGE_BASE_REPOSITORY;
  }

  return repository;
}
