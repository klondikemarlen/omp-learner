import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { DEFAULT_KNOWLEDGE_BASE_REPOSITORY, LEARNER_REPOSITORY, readConfiguration } from './config.mjs';

const execFileAsync = promisify(execFile);
const TARGETS = ['knowledge_base', 'local', 'learner', 'reusable_check', 'project_check', 'verifier'];
const VERIFIER_REPOSITORIES = {
  reusable_check: 'klondikemarlen/marlens-skills-rules-and-tools',
  verifier: 'klondikemarlen/omp-verifier',
};
const VERIFIER_PROPOSAL = 'verifier_check';
const CHECK_CLASSIFICATIONS = ['deterministic', 'agentic'];

export function createLearnerTicketTool({ agentDir, z, runGh = runGitHubCli, runGit = readOrigin }) {
  return {
    name: 'learner_file_ticket',
    label: 'File Learner Improvement Ticket',
    description: 'File one deduplicated, high-confidence improvement ticket to the preferred knowledge base, active project, Learner, or a reviewable verifier-check proposal.',
    hidden: true,
    approval: 'write',
    parameters: z.object({
      target: z.enum(TARGETS),
      title: z.string(),
      proposal: z.string(),
      evidence: z.string(),
      confidence: z.string(),
      proposalType: z.string().optional(),
      candidateOwner: z.string().optional(),
      acceptedRule: z.string().optional(),
      classification: z.string().optional(),
      goldCondition: z.string().optional(),
      passEvidence: z.string().optional(),
      failEvidence: z.string().optional(),
      blockedEvidence: z.string().optional(),
      nonGoals: z.string().optional(),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const configuration = readConfiguration(resolveAgentDir(agentDir, ctx));
      if (!configuration.enabled) throw new Error('Learner ticket filing is disabled.');

      const ticket = normalizeTicket(params);
      const repository = await resolveRepository(ticket.target, configuration, ctx?.cwd, runGit, signal);
      const fingerprint = createFingerprint(repository, ticket);
      const existing = JSON.parse(await runGh(['issue', 'list', '--repo', repository, '--state', 'open', '--search', fingerprint, '--limit', '1', '--json', 'url'], signal));
      if (Array.isArray(existing) && typeof existing[0]?.url === 'string') return ticketResult(`Existing learner ticket: ${existing[0].url}`, existing[0].url, false);

      const url = (await runGh(['issue', 'create', '--repo', repository, '--title', ticket.title, '--body', ticketBody(ticket, fingerprint)], signal)).trim();
      if (!url) throw new Error('GitHub did not return an issue URL.');
      return ticketResult(`Created learner ticket: ${url}`, url, true);
    },
  };
}

function resolveAgentDir(agentDir, ctx) {
  return typeof agentDir === 'function' ? agentDir(ctx) : agentDir;
}

function normalizeTicket(params) {
  const target = clean(params.target, 30);
  if (!TARGETS.includes(target)) throw new Error('Learner ticket target is not eligible.');
  const confidence = clean(params.confidence, 20).toLowerCase();
  if (confidence !== 'high') throw new Error('Learner ticket filing requires high confidence.');
  const proposalType = optionalClean(params.proposalType, 30);
  if (VERIFIER_REPOSITORIES[target] || target === 'project_check') {
    if (proposalType !== VERIFIER_PROPOSAL) throw new Error('Verifier-check proposals require explicit verification support.');
    const classification = clean(params.classification, 20).toLowerCase();
    if (!CHECK_CLASSIFICATIONS.includes(classification)) throw new Error('Verifier-check classification must be deterministic or agentic.');
    return {
      target,
      confidence,
      title: clean(params.title, 120),
      proposal: clean(params.proposal, 2_000),
      evidence: clean(params.evidence, 4_000),
      proposalType,
      candidateOwner: clean(params.candidateOwner, 200),
      acceptedRule: clean(params.acceptedRule, 2_000),
      classification,
      goldCondition: clean(params.goldCondition, 2_000),
      passEvidence: clean(params.passEvidence, 2_000),
      failEvidence: clean(params.failEvidence, 2_000),
      blockedEvidence: clean(params.blockedEvidence, 2_000),
      nonGoals: clean(params.nonGoals, 2_000),
    };
  }
  if (proposalType) throw new Error('Verifier-check proposals require an eligible verifier target.');
  return {
    target,
    confidence,
    title: clean(params.title, 120),
    proposal: clean(params.proposal, 2_000),
    evidence: clean(params.evidence, 4_000),
  };
}

function optionalClean(value, limit) {
  return value == null || value === '' ? '' : clean(value, limit);
}

async function resolveRepository(target, configuration, cwd, runGit, signal) {
  if (VERIFIER_REPOSITORIES[target]) return VERIFIER_REPOSITORIES[target];
  if (target === 'project_check' || target === 'local') {
    if (!cwd) throw new Error('Learner cannot resolve the current project without a working directory.');
    return normalizeGitHubRemote(await runGit(cwd, signal));
  }
  if (target === 'learner') return LEARNER_REPOSITORY;
  return configuration.knowledgeBaseRepository || DEFAULT_KNOWLEDGE_BASE_REPOSITORY;
}

function normalizeGitHubRemote(remote) {
  const value = String(remote || '').trim();
  const match = value.match(/^(?:git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Learner can file a local ticket only from a GitHub origin remote.');
  return `${match[1]}/${match[2]}`;
}

function clean(value, limit) {
  const result = redactText(String(value || '').replace(/\s+/g, ' ').trim());
  if (!result) throw new Error('Learner ticket fields must not be empty.');
  return result.slice(0, limit);
}

function createFingerprint(repository, ticket) {
  return createHash('sha256').update(`${repository}\n${ticket.title}\n${ticket.proposal}\n${ticket.proposalType || ''}\n${ticket.candidateOwner || ''}`).digest('hex').slice(0, 20);
}

function ticketBody(ticket, fingerprint) {
  if (ticket.proposalType === VERIFIER_PROPOSAL) {
    return `## Verifier-check proposal

${ticket.proposal}

- **Route:** ${ticket.target}
- **Candidate owner:** ${ticket.candidateOwner}
- **Classification:** ${ticket.classification}

## Accepted shared/project rule

${ticket.acceptedRule}

## Source evidence

${ticket.evidence}

## Gold condition

${ticket.goldCondition}

## Expected PASS evidence

${ticket.passEvidence}

## Expected FAIL evidence

${ticket.failEvidence}

## Expected BLOCKED evidence

${ticket.blockedEvidence}

## Non-goals

${ticket.nonGoals}

- **Confidence:** ${ticket.confidence}

<!-- omp-learner-ticket:${fingerprint} -->`;
  }
  return `## Learner improvement\n\n${ticket.proposal}\n\n- **Route:** ${ticket.target}\n- **Confidence:** ${ticket.confidence}\n\n## Evidence\n\n${ticket.evidence}\n\n<!-- omp-learner-ticket:${fingerprint} -->`;
}

function ticketResult(text, url, created) {
  return { content: [{ type: 'text', text }], details: { created, url } };
}

export function redactText(value) {
  return String(value)
    .replace(/\b(?:gh[ps]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED]')
    .replace(/\b(Bearer|token|password|secret)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
}

async function runGitHubCli(args, signal) {
  const { stdout } = await execFileAsync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], signal });
  return stdout;
}

async function readOrigin(cwd, signal) {
  const { stdout } = await execFileAsync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], signal });
  return stdout;
}
