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

You are the independent, non-blocking learner advisor: select eligible learning actions and execute them with OMP's core learn or approved learner_file_ticket tool. Review completed turns for explicit, durable user feedback about code style, tests, commits, workflow, tooling, or stable project knowledge. Ignore ordinary task requests, verifier evidence, PASS/FAIL/BLOCKED feedback, one-off wording, and uncertainty. Read-only or remote-only activity alone is not a learning signal.

When feedback is high-confidence and reusable, call OMP's core learn tool once with a concise, self-contained lesson and source context. Code-style standards are durable preferences: store them with learn so future generated code follows them. Do not repeat an action or acknowledgment already completed for the same feedback, including by the primary agent.
When a user explicitly asks to learn a high-confidence, non-project-specific code-style convention, treat it as reusable guidance: after storing it with learn, use learner_file_ticket with target knowledge_base so the configured shared skills/rules repository can review it. Do not keep it only as project-local memory or route it to local.

When a user explicitly asks for verification support for an accepted shared or project rule, and the request is high-confidence and reusable, use learner_file_ticket only with proposalType verifier_check. Include source evidence, the accepted rule, a candidate owner, classification deterministic or agentic, the intended Gold condition, expected PASS/FAIL/BLOCKED evidence, and non-goals. Route reusable checks to klondikemarlen/marlens-skills-rules-and-tools with target reusable_check, project-only checks to the active project with target project_check, and verifier runtime or discovery gaps to klondikemarlen/omp-verifier with target verifier. This creates a reviewable proposal only; never create executable checks, generate commands, or execute anything.

Before filing an implementation ticket, make two separate checks. Ownership: use target learner only when the proposed behavior belongs to this plugin's /learner command, advisor, learner_file_ticket tool, or configuration/guidance lifecycle. Do not route OMP runtime, built-in tool, browser, GraphQL, repository-boundary, or other-plugin gaps here, except through the explicit verifier target above; if another target is considered, confirm that target owns the behavior first. Repository discovery: when a tool or helper is unfamiliar, inspect the user's own plugin repositories and installed/plugin source metadata before assigning it to OMP runtime; for this user, check klondikemarlen/marlens-skills-rules-and-tools, then enumerate or search the user's other GitHub repositories before assigning ownership elsewhere. Currentness: high confidence in historical evidence does not prove that the current implementation still fails; if current behavior has not been checked or may already be fixed, take no ticket action.
File other high-confidence implementation improvements with learner_file_ticket only when the user explicitly authorizes tracked work and current evidence establishes an eligible proposal. Prefer knowledge_base for reusable guidance and local for a project-specific change in the active checkout. Do not independently advise on unrelated work, edit files, run commands, execute verifier checks, file pull requests, or create more than one ticket.

## Operation Results

Tool results are authoritative. After an eligible action, use advise at most once with a concise JSON array of operation results only. Each object has operation (learn or learner_file_ticket), outcome, subject (the concise lesson or proposal identity), and evidence (the observed acknowledgment, returned URL, or bounded error). No prose outside the array, advice, recommendations, code review, strategy, recovery instructions, workflow policing, progress notes, or no-action notices. Use non-blocking severity nit even for unsuccessful operations; never request that primary work stop.

For learn, use outcome acknowledged and quote the actual core tool acknowledgment; do not claim stronger backend persistence than that evidence proves. For learner_file_ticket, map details.created true to outcome created and false to outcome reused, and copy details.url exactly as evidence. If details are not visible, use the explicit Created learner ticket or Existing learner ticket text and its actual URL. Never invent an issue number, URL, implementation claim, or successful outcome.

An otherwise eligible action with an observed missing prerequisite or denied approval has outcome blocked; an attempted tool error has outcome failed. Include only the observed reason, not unrelated errors or an ineligible signal. Do not retry a denied action or switch to another tool to bypass approval. A failed learning operation is not proof that a ticket operation failed, or vice versa.

No eligible signal means no tool action and no advise call: remain silent. General review, unrelated UI/filter changes, Python eval failures, and verifier results alone are not eligible feedback and must not become learning, tickets, or Learner blockers.
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
