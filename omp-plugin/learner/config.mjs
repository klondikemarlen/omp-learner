import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CONFIG_VERSION = 2;
const LEARNER_DIR = 'learner';
const WATCHDOG_FILE = 'WATCHDOG.yml';
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
  if (!existsSync(filePath)) return { version: CONFIG_VERSION, enabled: false, upstream: null };

  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return { version: CONFIG_VERSION, enabled: Boolean(parsed.enabled), upstream: parsed.upstream || null };
}

export function normalizeUpstream(value) {
  const match = String(value || '').trim().match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Upstream must be an HTTPS GitHub repository URL, for example https://github.com/owner/repository.');

  return `${match[1]}/${match[2]}`;
}

export function configureLearner(agentDir, upstreamUrl, { verifyUpstream: validateUpstream = verifyUpstream } = {}) {
  const normalizedUpstream = normalizeUpstream(upstreamUrl);
  const upstream = validateUpstream(normalizedUpstream) || normalizedUpstream;
  const configPath = path.join(agentDir, 'config.yml');
  const currentConfig = readOptional(configPath);
  if (!hasAdvisorModel(currentConfig)) throw new Error('OMP modelRoles.advisor must be configured before learner setup.');

  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  const currentWatchdog = readOptional(watchdogPath);
  const nextWatchdog = withLearnerAdvisor(currentWatchdog, agentDir);
  const nextConfig = withAdvisorEnabled(currentConfig);

  writeText(configPath, nextConfig, 0o600);
  writeText(watchdogPath, nextWatchdog, 0o600);
  writeConfiguration(agentDir, { version: CONFIG_VERSION, enabled: true, upstream });
  writeText(path.join(agentDir, LEARNER_DIR, 'WATCHDOG.md'), watchdogInstructions(agentDir), 0o600);

  return { upstream, configPath: configurationPath(agentDir), watchdogPath };
}

export function disableLearner(agentDir) {
  const configuration = readConfiguration(agentDir);
  writeConfiguration(agentDir, { ...configuration, enabled: false });

  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  if (!existsSync(watchdogPath)) return;

  const nextWatchdog = withoutLearnerAdvisor(readOptional(watchdogPath));
  if (nextWatchdog.trim() === 'advisors:') rmSync(watchdogPath);
  else writeText(watchdogPath, nextWatchdog, 0o600);
}

export function watchdogInstructions(agentDir) {
  const configuration = readConfiguration(agentDir);
  return `# OMP Learner watchdog\n\nYou are an independent, non-blocking learner watchdog. The configured upstream repository is ${configuration.upstream}.\n\nReview completed turns only for explicit, durable user feedback about code style, test style, commit message style, commit file grouping, or reusable workflow/tooling guidance. Stay silent for ordinary task requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording edits, and uncertain feedback.\n\nWhen feedback is high confidence, reusable, and has sufficient visible provenance, use advise to identify the proposed issue for human review. Commit file grouping requires a visible diff, staged files, commit hash, or local COMMITTING.md. Do not file GitHub issues: OMP advisors cannot call extension tools safely. Never open pull requests, edit files, commit, push, change memory, or block the primary task.\n`;
}

function verifyUpstream(upstream) {
  try {
    const result = JSON.parse(execFileSync('gh', ['repo', 'view', upstream, '--json', 'nameWithOwner,hasIssuesEnabled'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    if (!result.hasIssuesEnabled) throw new Error(`Issues are disabled for ${result.nameWithOwner || upstream}.`);
    return result.nameWithOwner;
  } catch (error) {
    throw new Error(error.stderr?.toString().trim() || error.message || `Cannot access ${upstream} through GitHub CLI.`);
  }
}

function writeConfiguration(agentDir, configuration) {
  writeText(configurationPath(agentDir), `${JSON.stringify(configuration, null, 2)}\n`, 0o600);
}

function readOptional(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function writeText(filePath, content, mode) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, content, { mode });
  renameSync(temporaryPath, filePath);
}

function hasAdvisorModel(config) {
  return sectionLines(config, 'modelRoles').some((line) => /^\s*advisor\s*:\s*(?!#)\S/.test(line));
}

function withAdvisorEnabled(config) {
  const lines = config ? config.split('\n') : [];
  const section = sectionRange(lines, 'advisor');
  if (!section) return `${config.replace(/\s*$/, '')}\n${config.trim() ? '\n' : ''}advisor:\n  enabled: true\n`;

  const enabledIndex = lines.slice(section.start + 1, section.end).findIndex((line) => /^\s+enabled\s*:/.test(line));
  if (enabledIndex >= 0) lines[section.start + 1 + enabledIndex] = '  enabled: true';
  else lines.splice(section.start + 1, 0, '  enabled: true');
  return `${lines.join('\n').replace(/\s*$/, '')}\n`;
}

function withLearnerAdvisor(watchdog, agentDir) {
  const base = withoutLearnerAdvisor(watchdog).replace(/\s*$/, '') || 'advisors:';
  if (/^advisors:\s*\[\s*\]\s*$/m.test(base)) throw new Error('Existing WATCHDOG.yml has an inline advisors list; learner setup will not overwrite it.');

  const lines = base.split('\n');
  const section = sectionRange(lines, 'advisors');
  if (!section) throw new Error('Existing WATCHDOG.yml has no block-style advisors list; learner setup will not overwrite it.');

  lines.splice(section.end, 0, '', ...learnerAdvisorBlock(agentDir), '');
  return `${lines.join('\n').replace(/\s*$/, '')}\n`;
}

function learnerAdvisorBlock(agentDir) {
  return [
    MARKER_START,
    '  - name: learner',
    '    tools: [read, grep, glob]',
    '    instructions: |',
    `      @${path.join(agentDir, LEARNER_DIR, 'WATCHDOG.md')}`,
    MARKER_END,
  ];
}

function withoutLearnerAdvisor(watchdog) {
  const expression = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
  return watchdog.replace(expression, '').replace(/\n{3,}/g, '\n\n');
}

function sectionLines(config, name) {
  const lines = config.split('\n');
  const section = sectionRange(lines, name);
  return section ? lines.slice(section.start + 1, section.end) : [];
}

function sectionRange(lines, name) {
  const start = lines.findIndex((line) => new RegExp(`^${name}:\\s*$`).test(line));
  if (start < 0) return null;

  const end = lines.findIndex((line, index) => index > start && /^\S/.test(line));
  return { start, end: end < 0 ? lines.length : end };
}
