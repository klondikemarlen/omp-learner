import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

import { DEFAULT_KNOWLEDGE_BASE_REPOSITORY, LEARNER_REPOSITORY, normalizeRepository, readConfiguration } from './config.mjs';

const execFileAsync = promisify(execFile);
const MAX_TITLE_LENGTH = 120;
const MAX_MULTILINE_FIELD_LENGTH = 6_000;
const MAX_REPOSITORY_LENGTH = 200;
const MAX_CANDIDATE_OWNER_LENGTH = 200;
const MAX_CONFIDENCE_LENGTH = 20;
const MAX_CLASSIFICATION_LENGTH = 20;
const MAX_IDENTIFIER_LENGTH = 30;
const MAX_ISSUE_BODY_LENGTH = 65_536;
const FINGERPRINT_LENGTH = 20;
const TARGET_LABELS = {
  knowledge_base: 'Shared skills, rules, and workflows',
  local: 'Current project',
  learner: 'OMP Learner plugin',
  reusable_check: 'Shared verification checks',
  project_check: 'Current project verification checks',
  verifier: 'OMP Verifier runtime',
  related: 'Related project',
};
const TARGETS = Object.keys(TARGET_LABELS);
const VERIFIER_REPOSITORY = 'klondikemarlen/omp-verifier';
const VERIFIER_TARGETS = ['reusable_check', 'project_check', 'verifier'];
const VERIFIER_PROPOSAL = 'verifier_check';
const CHECK_CLASSIFICATIONS = ['deterministic', 'agentic'];

export function createLearnerTicketTool({ agentDir, z, runGh = runGitHubCli, runGit = readOrigin }) {
  return {
    name: 'learner_file_ticket',
    label: 'File Learner Improvement Ticket',
    description: 'File one classified, evidence-backed learning or implementation-improvement proposal; never implement or activate it. Shared rules/skills/workflows and reusable verifier changes belong to the configured shared owner; project corrections/integration stay with the project; target learner is only for this plugin, never general project knowledge. Supplied check execution belongs to omp-verifier. Set existingIssueNumber only after inspecting an equivalent open proposal; its current OPEN state and canonical repository/issue URL are rechecked before returning a reused receipt. Maximum lengths in characters: title 120; proposal and evidence 6,000 each; confidence 20 and must be high; proposalType 30 and, when present, must be verifier_check; candidateOwner and related repository 200 each; classification 20; acceptedRule, goldCondition, passEvidence, failEvidence, blockedEvidence, and nonGoals 6,000 each. The complete generated issue body is limited to 65,536 characters.',
    approval: 'write',
    parameters: z.object({
      target: z.enum(TARGETS),
      title: z.string().max(MAX_TITLE_LENGTH),
      repository: z.string().max(MAX_REPOSITORY_LENGTH).optional(),
      proposal: z.string().max(MAX_MULTILINE_FIELD_LENGTH).describe('Reader-facing Markdown with ### Problem, ### Proposed change, and ### Done when. Explain the user impact in short sentences; use bullets for changes and observable completion criteria. Add ### Scope limits only for relevant exclusions or approval boundaries.'),
      evidence: z.string().max(MAX_MULTILINE_FIELD_LENGTH).describe('Short labeled Markdown bullets: Source (brief user quote and source ID), Observed behavior, Existing guidance, and Related proposals, as applicable. Link only inspected references with known URLs; retain bounded-search limits. Explain findings instead of dumping lookup commands or internal classification prose.'),
      confidence: z.string().max(MAX_CONFIDENCE_LENGTH).describe('Must be "high".'),
      proposalType: z.string().max(MAX_IDENTIFIER_LENGTH).optional().describe('When present, must be "verifier_check".'),
      candidateOwner: z.string().max(MAX_CANDIDATE_OWNER_LENGTH).optional(),
      acceptedRule: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      classification: z.string().max(MAX_CLASSIFICATION_LENGTH).optional(),
      goldCondition: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      passEvidence: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      failEvidence: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      blockedEvidence: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      nonGoals: z.string().max(MAX_MULTILINE_FIELD_LENGTH).optional(),
      existingIssueNumber: z.number().int().positive().optional().describe('Explicitly reuse an equivalent currently open issue in the resolved target repository.'),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const configuration = readConfiguration(resolveAgentDir(agentDir, ctx));
      if (!configuration.enabled) throw new Error('Learner ticket filing is disabled.');

      const ticket = normalizeTicket(params);
      assertTicketBodyWithinLimit(ticket);
      const repository = await resolveRepository(ticket, configuration, ctx?.cwd, runGit, signal);
      if (ticket.existingIssueNumber !== undefined) {
        const existing = await readSelectedOpenIssue(repository, ticket.existingIssueNumber, runGh, signal);
        return ticketResult(`Existing learner ticket: ${existing.url}`, existing.url, false);
      }

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
  if (params.existingIssueNumber !== undefined && (!Number.isInteger(params.existingIssueNumber) || params.existingIssueNumber <= 0)) {
    throw new Error('Existing learner issue number must be a positive integer.');
  }

  const target = clean(params.target, MAX_IDENTIFIER_LENGTH, 'target');
  if (!TARGETS.includes(target)) throw new Error('Learner ticket target is not eligible.');
  const repository = normalizeTargetRepository(params.repository, target);
  const confidence = clean(params.confidence, MAX_CONFIDENCE_LENGTH, 'confidence').toLowerCase();
  if (confidence !== 'high') throw new Error('Learner ticket filing requires high confidence.');
  const proposalType = optionalClean(params.proposalType, MAX_IDENTIFIER_LENGTH, 'proposalType');
  if (VERIFIER_TARGETS.includes(target)) {
    if (proposalType !== VERIFIER_PROPOSAL) throw new Error('Verifier-check proposals require explicit verification support.');
    const classification = clean(params.classification, MAX_CLASSIFICATION_LENGTH, 'classification').toLowerCase();
    if (!CHECK_CLASSIFICATIONS.includes(classification)) throw new Error('Verifier-check classification must be deterministic or agentic.');
    return {
      target,
      repository,
      confidence,
      title: clean(params.title, MAX_TITLE_LENGTH, 'title'),
      proposal: cleanMultiline(params.proposal, MAX_MULTILINE_FIELD_LENGTH, 'proposal'),
      evidence: cleanMultiline(params.evidence, MAX_MULTILINE_FIELD_LENGTH, 'evidence'),
      proposalType,
      candidateOwner: clean(params.candidateOwner, MAX_CANDIDATE_OWNER_LENGTH, 'candidateOwner'),
      acceptedRule: cleanMultiline(params.acceptedRule, MAX_MULTILINE_FIELD_LENGTH, 'acceptedRule'),
      classification,
      goldCondition: cleanMultiline(params.goldCondition, MAX_MULTILINE_FIELD_LENGTH, 'goldCondition'),
      passEvidence: cleanMultiline(params.passEvidence, MAX_MULTILINE_FIELD_LENGTH, 'passEvidence'),
      failEvidence: cleanMultiline(params.failEvidence, MAX_MULTILINE_FIELD_LENGTH, 'failEvidence'),
      blockedEvidence: cleanMultiline(params.blockedEvidence, MAX_MULTILINE_FIELD_LENGTH, 'blockedEvidence'),
      nonGoals: cleanMultiline(params.nonGoals, MAX_MULTILINE_FIELD_LENGTH, 'nonGoals'),
      existingIssueNumber: params.existingIssueNumber,
    };
  }
  if (proposalType) throw new Error('Verifier-check proposals require an eligible verifier target.');
  return {
    target,
    repository,
    confidence,
    title: clean(params.title, MAX_TITLE_LENGTH, 'title'),
    proposal: cleanMultiline(params.proposal, MAX_MULTILINE_FIELD_LENGTH, 'proposal'),
    evidence: cleanMultiline(params.evidence, MAX_MULTILINE_FIELD_LENGTH, 'evidence'),
    existingIssueNumber: params.existingIssueNumber,
  };
}

async function readSelectedOpenIssue(repository, issueNumber, runGh, signal) {
  const response = JSON.parse(await runGh([
    'issue',
    'view',
    String(issueNumber),
    '--repo',
    repository,
    '--json',
    'url,state,number',
  ], signal));
  const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
  if (response?.state !== 'OPEN' || response.number !== issueNumber || typeof response.url !== 'string' || response.url.toLowerCase() !== expectedUrl.toLowerCase()) {
    throw new Error(`Selected learner issue #${issueNumber} is not an open issue in ${repository}.`);
  }

  return response;
}

function normalizeTargetRepository(value, target) {
  if (target !== 'related') {
    if (value !== undefined) {
      throw new Error('A repository can only be specified for related learner tickets.');
    }

    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Related learner tickets require a repository.');
  }

  if (value.length > MAX_REPOSITORY_LENGTH) {
    throw new Error(`Learner ticket repository exceeds the ${MAX_REPOSITORY_LENGTH}-character limit.`);
  }

  const repository = normalizeDestinationRepository(value);
  if (!isUserOwnedRepository(repository)) {
    throw new Error('Learner ticket repository boundary blocks related repositories outside klondikemarlen/*.');
  }

  return repository;
}

function optionalClean(value, limit, fieldName) {
  return value == null || value === '' ? '' : clean(value, limit, fieldName);
}

async function resolveRepository(ticket, configuration, cwd, runGit, signal) {
  const { target } = ticket;
  if (target === 'verifier') {
    return VERIFIER_REPOSITORY;
  }

  if (target === 'project_check' || target === 'local') {
    if (!cwd) {
      throw new Error('Learner cannot resolve the current project without a working directory.');
    }

    return normalizeGitHubRemote(await runGit(cwd, signal));
  }

  if (target === 'related') {
    return ticket.repository;
  }

  if (target === 'learner') {
    return LEARNER_REPOSITORY;
  }

  return normalizeDestinationRepository(configuration.knowledgeBaseRepository || DEFAULT_KNOWLEDGE_BASE_REPOSITORY);
}

function normalizeDestinationRepository(value) {
  const repository = normalizeRepository(value);
  const components = repository.split('/');
  if (components.some((component) => component === '.' || component === '..')) {
    throw new Error('Learner ticket repository must be a normalized GitHub owner/repository.');
  }

  return repository;
}

function isUserOwnedRepository(repository) {
  return repository.split('/')[0].toLowerCase() === 'klondikemarlen';
}

function normalizeGitHubRemote(remote) {
  const value = String(remote || '').trim();
  const match = value.match(/^(?:git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Learner can file a local ticket only from a GitHub origin remote.');
  return normalizeDestinationRepository(`${match[1]}/${match[2]}`);
}

function clean(value, limit, fieldName) {
  const source = String(value || '');
  assertFieldLength(source, limit, fieldName);
  const result = redactText(source.replace(/\s+/g, ' ').trim());
  if (!result) {
    throw new Error('Learner ticket fields must not be empty.');
  }

  assertFieldLength(result, limit, fieldName);
  return result;
}

function cleanMultiline(value, limit, fieldName) {
  const source = String(value || '');
  assertFieldLength(source, limit, fieldName);
  const result = redactText(source.replace(/\r\n?/g, '\n').trim());
  if (!result) {
    throw new Error('Learner ticket fields must not be empty.');
  }

  assertFieldLength(result, limit, fieldName);
  return result;
}

function assertFieldLength(value, limit, fieldName) {
  if (value.length > limit) {
    throw new Error(`Learner ticket ${fieldName} exceeds the ${limit}-character limit.`);
  }
}

function assertTicketBodyWithinLimit(ticket) {
  const placeholderFingerprint = '0'.repeat(FINGERPRINT_LENGTH);
  const body = ticketBody(ticket, placeholderFingerprint);
  if (body.length > MAX_ISSUE_BODY_LENGTH) {
    throw new Error(`Learner ticket issue body exceeds the ${MAX_ISSUE_BODY_LENGTH}-character limit.`);
  }
}

function createFingerprint(repository, ticket) {
  return createHash('sha256').update(`${repository}\n${ticket.title}\n${ticket.proposal}\n${ticket.proposalType || ''}\n${ticket.candidateOwner || ''}`).digest('hex').slice(0, FINGERPRINT_LENGTH);
}

function ticketBody(ticket, fingerprint) {
  const filingDetails = `## Filing details

- **Destination:** ${TARGET_LABELS[ticket.target]}
- **Confidence:** ${ticket.confidence}`;

  if (ticket.proposalType === VERIFIER_PROPOSAL) {
    return `## Verifier-check proposal

${ticket.proposal}

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

${filingDetails}
- **Candidate owner:** ${ticket.candidateOwner}
- **Classification:** ${ticket.classification}

<!-- omp-learner-ticket:${fingerprint} -->`;
  }
  return `## Proposed improvement

${ticket.proposal}

## Evidence

${ticket.evidence}

${filingDetails}

<!-- omp-learner-ticket:${fingerprint} -->`;
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
