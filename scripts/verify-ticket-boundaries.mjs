import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_KNOWLEDGE_BASE_REPOSITORY } from '../omp-plugin/learner/config.mjs';
import { createLearnerTicketTool } from '../omp-plugin/learner/ticket.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-ticket-boundaries-'));
const configurationDirectory = path.join(agentDir, 'learner');
const configurationPath = path.join(configurationDirectory, 'config.json');
const z = {
  object: (shape) => shape,
  enum: (values) => values,
  string: () => ({
    max() { return this; },
    optional() { return this; },
    describe() { return this; },
  }),
};
const createdUrl = 'https://github.com/klondikemarlen/omp-learner/issues/121';

function configureKnowledgeBase(repository = DEFAULT_KNOWLEDGE_BASE_REPOSITORY) {
  mkdirSync(configurationDirectory, { recursive: true });
  writeFileSync(configurationPath, JSON.stringify({ version: 6, enabled: true, knowledgeBaseRepository: repository }));
}

function proposal(target, title, extra = {}) {
  return {
    target,
    title,
    proposal: 'Keep this high-confidence improvement reviewable.',
    evidence: 'The behavior was observed in the active project.',
    confidence: 'high',
    ...extra,
  };
}

function createRecorder() {
  const calls = [];
  return {
    calls,
    runGh: async (args) => {
      calls.push(args);
      return args[1] === 'list' ? '[]' : `${createdUrl}\n`;
    },
  };
}

function createTool({ runGit, runGh }) {
  return createLearnerTicketTool({ agentDir, z, runGit, runGh });
}

function routedRepositories(calls) {
  return calls.map((args) => {
    const repositoryOption = args.indexOf('--repo');
    assert.notEqual(repositoryOption, -1, 'GitHub issue action must name its repository');
    return args[repositoryOption + 1];
  });
}

async function execute(tool, input) {
  return tool.execute('boundary-check', input, undefined, undefined, { cwd: '/tmp/active-project' });
}

try {
  configureKnowledgeBase();

  const projectCalls = createRecorder();
  const projectTool = createTool({
    runGit: async () => 'git@github.com:ExampleOrg/project.git\n',
    runGh: projectCalls.runGh,
  });
  await execute(projectTool, proposal('local', 'Project origin destination'));
  assert.deepEqual(routedRepositories(projectCalls.calls), ['ExampleOrg/project', 'ExampleOrg/project']);

  const relatedCalls = createRecorder();
  const relatedTool = createTool({
    runGit: async () => {
      throw new Error('Related tickets should not need the active origin.');
    },
    runGh: relatedCalls.runGh,
  });
  await execute(relatedTool, proposal('related', 'Related destination', { repository: 'https://github.com/KLONDIKEMARLEN/RelatedRepo.git' }));
  assert.deepEqual(routedRepositories(relatedCalls.calls), ['KLONDIKEMARLEN/RelatedRepo', 'KLONDIKEMARLEN/RelatedRepo']);

  relatedCalls.calls.length = 0;
  await execute(relatedTool, proposal('related', 'Preserve related configuration owner', { repository: 'klondikemarlen/omp-config' }));
  assert.deepEqual(routedRepositories(relatedCalls.calls), ['klondikemarlen/omp-config', 'klondikemarlen/omp-config']);

  projectCalls.calls.length = 0;
  const configurationProjectTool = createTool({
    runGit: async () => 'git@github.com:klondikemarlen/omp-config.git',
    runGh: projectCalls.runGh,
  });
  await execute(configurationProjectTool, proposal('local', 'Preserve active configuration project'));
  assert.deepEqual(routedRepositories(projectCalls.calls), ['klondikemarlen/omp-config', 'klondikemarlen/omp-config']);

  const sharedCalls = createRecorder();
  const sharedTool = createTool({
    runGit: async () => {
      throw new Error('The shared default should not need the active origin.');
    },
    runGh: sharedCalls.runGh,
  });
  await execute(sharedTool, proposal('knowledge_base', 'Shared default without origin'));
  assert.deepEqual(routedRepositories(sharedCalls.calls), ['klondikemarlen/marlens-skills-rules-and-tools', 'klondikemarlen/marlens-skills-rules-and-tools']);

  const rejectedRelatedCalls = createRecorder();
  const rejectedRelatedTool = createTool({
    runGit: async () => 'git@github.com:outside/project.git\n',
    runGh: rejectedRelatedCalls.runGh,
  });
  await assert.rejects(
    () => execute(rejectedRelatedTool, proposal('related', 'Reject external related target', { repository: 'outside/project' })),
    /repository boundary blocks related/,
  );
  assert.equal(rejectedRelatedCalls.calls.length, 0, 'Rejected related target must not fall back to another repository.');

  configureKnowledgeBase('outside/shared-guidance');
  const rejectedConfiguredCalls = createRecorder();
  const rejectedConfiguredTool = createTool({
    runGit: async () => 'git@github.com:active/project.git\n',
    runGh: rejectedConfiguredCalls.runGh,
  });
  await assert.rejects(
    () => execute(rejectedConfiguredTool, proposal('knowledge_base', 'Reject external configured destination')),
    /repository boundary blocks configured destination/,
  );
  assert.equal(rejectedConfiguredCalls.calls.length, 0, 'Rejected configured destination must not issue a GitHub issue action.');

  configureKnowledgeBase('IceFogAnalytics/Wrap');
  const matchingOriginCalls = createRecorder();
  const matchingOriginTool = createTool({
    runGit: async () => 'https://github.com/icefoganalytics/wrap.git\n',
    runGh: matchingOriginCalls.runGh,
  });
  await execute(matchingOriginTool, proposal('knowledge_base', 'Allow configured active origin'));
  assert.deepEqual(routedRepositories(matchingOriginCalls.calls), ['IceFogAnalytics/Wrap', 'IceFogAnalytics/Wrap']);

  const malformedCalls = createRecorder();
  const malformedTool = createTool({
    runGit: async () => 'git@github.com:klondikemarlen/safe.git\n',
    runGh: malformedCalls.runGh,
  });
  await assert.rejects(
    () => execute(malformedTool, proposal('related', 'Reject malformed related destination', { repository: 'klondikemarlen/..' })),
    /normalized GitHub owner\/repository/,
  );
  assert.equal(malformedCalls.calls.length, 0, 'Malformed repository must not reach GitHub issue actions.');

  const oversizedCalls = createRecorder();
  let originLookups = 0;
  const oversizedProposalTool = createTool({
    runGit: async () => {
      originLookups += 1;
      return 'git@github.com:example/project.git';
    },
    runGh: oversizedCalls.runGh,
  });
  await assert.rejects(
    () => execute(oversizedProposalTool, proposal('local', 'Reject oversized proposal', { proposal: 'x'.repeat(6_001) })),
  );
  assert.equal(oversizedCalls.calls.length, 0, 'Oversized input must not reach any GitHub lookup or mutation.');
  assert.equal(originLookups, 0, 'Oversized input must be rejected before repository resolution.');
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('Ticket boundary verification passed.');
