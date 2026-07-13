import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CONFIG_VERSION = 3;
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
  removeLegacyAdvisor(agentDir);
  writeConfiguration(agentDir, { version: CONFIG_VERSION, enabled: true, upstream });
  return { upstream, configPath: configurationPath(agentDir) };
}

export function disableLearner(agentDir) {
  writeConfiguration(agentDir, { ...readConfiguration(agentDir), enabled: false });
  removeLegacyAdvisor(agentDir);
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

function removeLegacyAdvisor(agentDir) {
  const watchdogPath = path.join(agentDir, WATCHDOG_FILE);
  if (existsSync(watchdogPath)) {
    const currentWatchdog = readFileSync(watchdogPath, 'utf8');
    const nextWatchdog = currentWatchdog.replace(new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n');
    if (nextWatchdog.trim() === 'advisors:') rmSync(watchdogPath);
    else if (nextWatchdog !== currentWatchdog) writeText(watchdogPath, nextWatchdog, 0o600);
  }
  const instructionsPath = path.join(agentDir, LEARNER_DIR, WATCHDOG_INSTRUCTIONS_FILE);
  if (existsSync(instructionsPath) && readFileSync(instructionsPath, 'utf8').startsWith('# OMP Learner watchdog\n')) rmSync(instructionsPath);
}

function writeText(filePath, content, mode) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, content, { mode });
  renameSync(temporaryPath, filePath);
}
