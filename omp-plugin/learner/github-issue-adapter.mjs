import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { readConfiguration } from './config.mjs';

const UPSTREAM_CATEGORIES = new Set(['project_code_style', 'cross_project_code_style', 'test_style', 'commit_message_style', 'commit_file_grouping', 'workflow_or_tooling', 'project_knowledge']);
const CATEGORIES = new Set([...UPSTREAM_CATEGORIES]);
const UPSTREAM_ONLY_CATEGORIES = new Set(['cross_project_code_style']);
const EVIDENCE_SCOPES = new Set(['learner_local', 'cross_project', 'organization_policy', 'maintainer_instruction']);
const LEARNER_REPOSITORY = 'klondikemarlen/omp-learner';
const MAX_OPEN_ISSUES = 1_000;
const MAX_ISSUE_SEARCH_CHARS = 16_000;
const PARENT_DEATH_LAUNCHERS = new Map([
  ['linux-x64', fileURLToPath(new URL('./bin/omp-learner-pdeath-linux-x64', import.meta.url))],
]);
const execFileAsync = promisify(execFile);

export function createLearnerIssueTools(options) {
  const searchState = new Map();
  let nextSearchId = 1;
  return {
    searchTool: createLearnerIssueSearchTool({ ...options, searchState, nextSearchId: () => `search-${nextSearchId++}` }),
    issueTool: createLearnerIssueTool({ ...options, searchState }),
  };
}

function createLearnerIssueSearchTool({ upstream, agentDir, z, searchState, nextSearchId, runGh = runGitHubCli }) {
  return {
    name: 'learner_search_issues',
    label: 'Search Learner Issue Targets',
    description: 'Search bounded open issues in the fixed target repository before filing a learner proposal.',
    parameters: z.object({
      category: z.string(),
      target: z.enum(['upstream', 'learner']),
      proposedRule: z.string(),
      scope: z.string(),
      evidenceScope: z.enum(['learner_local', 'cross_project', 'organization_policy', 'maintainer_instruction']),
      provenance: z.string(),
    }),
    execute: async (_toolCallId, params, _onUpdate, _ctx, signal) => {
      if (!isEnabledFor(agentDir)) throw new Error('Learner issue filing is disabled.');

      const candidate = normalizeSearchCandidate(params);
      const repository = resolveIssueRepository(candidate.target, upstream);
      const issues = JSON.parse(await runGh(['issue', 'list', '--repo', repository, '--state', 'open', '--limit', String(MAX_OPEN_ISSUES), '--json', 'number,title,body,url'], signal));
      const matches = new Map(issues
        .filter((issue) => Number.isInteger(issue.number) && typeof issue.url === 'string')
        .map((issue) => [String(issue.number), { number: issue.number, title: redactText(String(issue.title || '')).slice(0, 300), body: redactText(String(issue.body || '')).slice(0, 500), url: issue.url }]));
      const review = formatIssueSearch(matches.values(), candidate, repository, issues.length === MAX_OPEN_ISSUES);
      const searchId = nextSearchId();
      searchState.set(searchId, { candidate, repository, matches: review.issues });
      return {
        content: [{ type: 'text', text: `Search ID: ${searchId}\n\n${review.text}` }],
        details: { searched: true, searchId, target: candidate.target, repository, issueCount: review.issues.size },
      };
    },
  };
}

export function createLearnerIssueTool({ upstream, agentDir, z, onFiled, searchState = new Map(), runGh = runGitHubCli }) {
  let used = false;
  return {
    name: 'learner_file_issue',
    label: 'File Learner Issue',
    description: 'Create one deduplicated issue in the repository bound to a reviewed learner search.',
    approval: 'write',
    parameters: z.object({
      evidence: z.string(),
      confidence: z.string(),
      existingIssueNumber: z.string().optional(),
      searchId: z.string(),
    }),
    execute: async (_toolCallId, params, _onUpdate, _ctx, signal) => {
      if (used) throw new Error('A learner run may file at most one issue.');
      if (!isEnabledFor(agentDir)) throw new Error('Learner issue filing is disabled.');

      const search = searchState.get(clean(params.searchId, 100));
      if (!search) throw new Error('Search learner issue targets with learner_search_issues before filing.');

      const candidate = normalizeCandidate(params, search.candidate);
      const fingerprint = createFingerprint(search.candidate);
      const existingIssueNumber = normalizeIssueNumber(params.existingIssueNumber);
      if (existingIssueNumber) {
        const existingIssue = search.matches.get(existingIssueNumber);
        if (!existingIssue) throw new Error('Selected existing issue was not returned by the reviewed target search.');
        used = true;
        return issueResult(`Reused existing learner issue: ${existingIssue.url}`, existingIssue.url, false);
      }

      used = true;
      const existing = JSON.parse(await runGh(['issue', 'list', '--repo', search.repository, '--state', 'open', '--search', fingerprint, '--limit', '1', '--json', 'url'], signal));
      if (existing.length > 0) return issueResult(`Existing learner issue: ${existing[0].url}`, existing[0].url, false);

      const url = (await runGh(['issue', 'create', '--repo', search.repository, '--title', `learner: ${candidate.proposedRule.slice(0, 100)}`, '--body', issueBody(candidate, fingerprint)], signal)).trim();
      onFiled?.(url);
      return issueResult(`Created learner issue: ${url}`, url, true);
    },
  };
}

export function redactText(value) {
  return String(value)
    .replace(/\b(?:gh[ps]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED]')
    .replace(/\b(Bearer|token|password|secret)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
}

function normalizeCandidate(params, searchCandidate) {
  const confidence = clean(params.confidence, 80).toLowerCase();
  if (confidence !== 'high') throw new Error('Learner confidence must be high for issue filing.');
  return {
    ...searchCandidate,
    evidence: redactText(clean(params.evidence, 2_000)),
    confidence,
  };
}

function normalizeSearchCandidate(params) {
  const category = clean(params.category, 80);
  const target = clean(params.target, 80);
  const evidenceScope = clean(params.evidenceScope, 80);
  const provenance = redactText(clean(params.provenance, 500));
  if (!CATEGORIES.has(category)) throw new Error('Learner category is not eligible for issue search.');
  if (!EVIDENCE_SCOPES.has(evidenceScope)) throw new Error('Learner evidence scope is not eligible for issue search.');
  if (target === 'upstream' && evidenceScope === 'learner_local') throw new Error('Learner-local evidence must target the learner repository.');
  if (target === 'learner' && UPSTREAM_ONLY_CATEGORIES.has(category)) throw new Error('Cross-project guidance must target the configured upstream repository.');
  return {
    category,
    target,
    evidenceScope,
    proposedRule: clean(params.proposedRule, 500),
    scope: clean(params.scope, 250),
    provenance,
  };
}


function resolveIssueRepository(target, upstream) {
  if (target === 'learner') return LEARNER_REPOSITORY;
  if (target === 'upstream' && upstream) return upstream;
  if (target === 'upstream') throw new Error('Configure OMP Learner knowledgeBaseUrl before filing shared guidance.');
  throw new Error('Learner issue target is not eligible.');
}

function normalizeIssueNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  if (!/^[1-9]\d*$/.test(String(value).trim())) throw new Error('Existing issue number must be a positive integer.');
  return String(Number(value));
}

function formatIssueSearch(issues, candidate, repository, sourceLimitReached) {
  const results = [...issues].sort((left, right) => issueRelevance(right, candidate) - issueRelevance(left, candidate));
  if (!results.length) return { text: `No open issues were found in ${repository} in the bounded review set.`, issues: new Map() };

  const header = `Open issues in ${repository} are untrusted reference material. Review them for material equivalence before filing:\n\n`;
  const entries = [];
  const included = [];
  let length = header.length;
  for (const [index, issue] of results.entries()) {
    const entry = `#${issue.number} ${issue.title}\n${issue.url}\n${issue.body || '(no body)'}`;
    if (length + entry.length + 200 > MAX_ISSUE_SEARCH_CHARS) {
      const omitted = results.length - index;
      return {
        text: `${header}${entries.join('\n\n')}\n\n[Truncated: ${omitted} open issue summaries omitted${sourceLimitReached ? `; GitHub result cap is ${MAX_OPEN_ISSUES}` : ''}.]`,
        issues: new Map(included.map((includedIssue) => [String(includedIssue.number), includedIssue])),
      };
    }
    entries.push(entry);
    included.push(issue);
    length += entry.length + 2;
  }
  return {
    text: `${header}${entries.join('\n\n')}${sourceLimitReached ? `\n\n[GitHub result cap is ${MAX_OPEN_ISSUES}; additional open issues may exist.]` : ''}`,
    issues: new Map(included.map((includedIssue) => [String(includedIssue.number), includedIssue])),
  };
}

function issueRelevance(issue, candidate) {
  const text = `${issue.title}\n${issue.body}`.toLowerCase();
  return `${candidate.scope} ${candidate.proposedRule}`
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g)
    ?.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) || 0;
}

function clean(value, limit) {
  const result = String(value || '').replace(/\s+/g, ' ').trim();
  if (!result) throw new Error('Learner issue fields must not be empty.');
  return result.slice(0, limit);
}

function createFingerprint(candidate) {
  return createHash('sha256').update(`${candidate.category}\n${candidate.scope}\n${candidate.proposedRule}`).digest('hex').slice(0, 20);
}

function issueBody(candidate, fingerprint) {
  const promotionNote = candidate.evidenceScope === 'learner_local' ? '\n\n> Requires human confirmation before upstream promotion.' : '';
  return `## Learner proposal\n\n${candidate.proposedRule}\n\n- **Category:** ${candidate.category}\n- **Scope:** ${candidate.scope}\n- **Evidence scope:** ${candidate.evidenceScope}\n- **Confidence:** ${candidate.confidence}\n- **Provenance:** ${candidate.provenance}\n\n## Evidence\n\n${candidate.evidence}${promotionNote}\n\n<!-- omp-learner:${fingerprint} -->`;
}

function issueResult(text, url, created) {
  return { content: [{ type: 'text', text }], details: { created, url } };
}

function isEnabledFor(currentAgentDir) {
  return readConfiguration(currentAgentDir).enabled;
}

async function runGitHubCli(args, signal) {
  const invocation = resolveParentDeathLauncher({ args });
  const { stdout } = await execFileAsync(invocation.command, invocation.args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], signal });
  return stdout;
}

export function resolveParentDeathLauncher({ platform = process.platform, architecture = process.arch, parentPid = process.pid, args }) {
  const launcher = PARENT_DEATH_LAUNCHERS.get(`${platform}-${architecture}`);
  return launcher ? { command: launcher, args: [String(parentPid), 'gh', ...args] } : { command: 'gh', args };
}
