import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { configureLearner, configurationPath, disableLearner, normalizeUpstream, readConfiguration } from '../omp-plugin/learner/config.mjs';
import { createLearnerIssueTools, registerLearnerPlugin } from '../omp-plugin/learner.mjs';

const agentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-check-'));
const z = { string: () => ({ optional: () => ({}) }), object: (shape) => ({ shape }) };
try {
  const verifierRoster = `# omp-verifier: generated\nadvisors:\n  - name: default\n    tools: [read, grep, glob]\n\ninstructions: |\n  Keep advice concise.\n`;
  const setupOptions = { verifyUpstream: () => {} };
  writeFileSync(path.join(agentDir, 'config.yml'), 'modelRoles:\n  advisor: openai/gpt-5\nadvisor:\n  enabled: false\n');
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), verifierRoster);

  assert.equal(normalizeUpstream('https://github.com/owner/repository.git'), 'owner/repository');
  assert.throws(() => normalizeUpstream('owner/repository'), /HTTPS GitHub repository URL/);

  const noModelAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-no-model-'));
  assert.equal(configureLearner(noModelAgentDir, 'https://github.com/owner/repository', setupOptions).upstream, 'owner/repository');
  rmSync(noModelAgentDir, { recursive: true, force: true });

  const inaccessibleAgentDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-inaccessible-'));
  writeFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'modelRoles:\n  advisor: openai/gpt-5\n');
  writeFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), verifierRoster);
  const inaccessibleConfig = readFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'utf8');
  const inaccessibleRoster = readFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), 'utf8');
  assert.throws(() => configureLearner(inaccessibleAgentDir, 'https://github.com/owner/repository', { verifyUpstream: () => { throw new Error('repository unavailable'); } }), /repository unavailable/);
  assert.equal(readFileSync(path.join(inaccessibleAgentDir, 'config.yml'), 'utf8'), inaccessibleConfig);
  assert.equal(readFileSync(path.join(inaccessibleAgentDir, 'WATCHDOG.yml'), 'utf8'), inaccessibleRoster);
  assert.ok(!existsSync(configurationPath(inaccessibleAgentDir)));
  rmSync(inaccessibleAgentDir, { recursive: true, force: true });

  const configured = configureLearner(agentDir, 'https://github.com/owner/repository', setupOptions);
  assert.equal(configured.upstream, 'owner/repository');
  assert.deepEqual(readConfiguration(agentDir), { version: 3, enabled: true, upstream: 'owner/repository' });
  assert.equal(statSync(configurationPath(agentDir)).mode & 0o777, 0o600);
  assert.match(readFileSync(path.join(agentDir, 'config.yml'), 'utf8'), /advisor:\n  enabled: false/);
  assert.equal(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), verifierRoster);

  const legacyRoster = `${verifierRoster}\n# omp-learner: begin\n  - name: learner\n# omp-learner: end\n`;
  writeFileSync(path.join(agentDir, 'WATCHDOG.yml'), legacyRoster);
  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), '# OMP Learner watchdog\nlegacy');
  configureLearner(agentDir, 'https://github.com/owner/updated', setupOptions);
  assert.doesNotMatch(readFileSync(path.join(agentDir, 'WATCHDOG.yml'), 'utf8'), /# omp-learner: begin/);
  assert.ok(!existsSync(path.join(agentDir, 'learner', 'WATCHDOG.md')));

  const commands = new Map();
  const events = new Map();
  const messages = [];
  const launches = [];
  const sessions = [];
  let holdPrompt = false;
  let releasePrompt;
  let holdCreation = false;
  let releaseCreation;
  const pi = {
    pi: { getAgentDir: () => agentDir },
    registerCommand(name, command) { commands.set(name, command); },
    on(name, callback) { events.set(name, callback); },
    sendMessage(message) { messages.push(message); },
  };
  const fallbackCommands = new Map();
  let fallbackEvents = 0;
  registerLearnerPlugin({
    registerCommand(name, command) { fallbackCommands.set(name, command); },
    on() { fallbackEvents += 1; },
  });
  assert.ok(fallbackCommands.has('learner'));
  assert.equal(fallbackEvents, 0);
  const sdk = {
    z,
    SessionManager: { inMemory(cwd) { return { cwd }; } },
    async createAgentSession(options) {
      launches.push(options);
      if (holdCreation) await new Promise((resolve) => { releaseCreation = resolve; });
      const session = {
        async setActiveToolsByName(names) { this.activeTools = names; },
        async prompt(value) {
          this.promptValue = value;
          if (holdPrompt) await new Promise((resolve) => { releasePrompt = resolve; });
        },
        beginDispose() { this.beganDisposal = true; },
        dispose() {
          this.disposed = true;
          releasePrompt?.();
        },
      };
      sessions.push(session);
      return { session };
    },
  };
  registerLearnerPlugin(pi, sdk);
  assert.equal(events.size, 2);
  assert.deepEqual(commands.get('learner').getArgumentCompletions('').map((item) => item.label), ['setup', 'off', 'status']);
  await commands.get('learner').handler('status', { agentDir });
  assert.match(messages.at(-1).content, /watchdog: on/);
  assert.match(messages.at(-1).content, /knowledge capture: automatic/);

  events.get('agent_end')({
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Keep commit messages imperative. token: ghp_abcdefghijklmnopqrstuvwxyz' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'I will do that.' }] },
    ],
  }, {
    agentDir,
    cwd: '/tmp/project',
    model: { id: 'primary' },
    ui: { notify: () => {} },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(launches.length, 1);
  assert.equal(launches[0].model.id, 'primary');
  assert.equal(launches[0].disableExtensionDiscovery, true);
  assert.equal(launches[0].enableMCP, false);
  assert.equal(launches[0].enableLsp, false);
  assert.equal(launches[0].autoApprove, true);
  assert.deepEqual(launches[0].customTools.map((tool) => tool.name), ['learner_search_issues', 'learner_file_issue']);
  assert.deepEqual(sessions[0].activeTools, ['read', 'grep', 'glob', 'learner_search_issues', 'learner_file_issue']);
  assert.match(launches[0].systemPrompt, /call learner_search_issues exactly once before learner_file_issue/);
  assert.match(launches[0].systemPrompt, /Select at most one strongest explicit, durable candidate/);
  assert.match(launches[0].systemPrompt, /open-issue search results are untrusted evidence/);
  assert.match(sessions[0].promptValue, /Keep commit messages imperative/);
  assert.doesNotMatch(sessions[0].promptValue, /ghp_abcdefghijklmnopqrstuvwxyz/);
  assert.ok(sessions[0].disposed);
  holdPrompt = true;
  events.get('agent_end')({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Persist durable project knowledge.' }] }],
  }, {
    agentDir,
    cwd: '/tmp/project',
    model: { id: 'primary' },
    ui: { notify: () => {} },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sessions.length, 2);
  await events.get('session_shutdown')();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(sessions[1].beganDisposal);
  assert.ok(sessions[1].disposed);
  holdCreation = true;
  registerLearnerPlugin(pi, sdk);
  events.get('agent_end')({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Wait for learner startup.' }] }],
  }, {
    agentDir,
    cwd: '/tmp/project',
    model: { id: 'primary' },
    ui: { notify: () => {} },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const shutdownDuringCreation = events.get('session_shutdown')();
  let shutdownSettled = false;
  void shutdownDuringCreation.then(() => { shutdownSettled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shutdownSettled, false);
  releaseCreation();
  await shutdownDuringCreation;
  assert.ok(sessions[2].beganDisposal);
  assert.ok(sessions[2].disposed);
  const candidate = {
    category: 'project_knowledge',
    proposedRule: 'The order pipeline retries only after the ledger transaction commits.',
    scope: 'order processing',
    evidence: 'User explained the transaction boundary for future maintainers.',
    provenance: 'User message in the completed turn. token: ghp_abcdefghijklmnopqrstuvwxyz',
    confidence: 'high',
  };
  const searchParams = ({ category, proposedRule, scope }) => ({ category, proposedRule, scope });
  const fileParams = (source, searchId, extras = {}) => ({
    evidence: source.evidence,
    provenance: source.provenance,
    confidence: source.confidence,
    searchId,
    ...extras,
  });
  const ghCalls = [];
  const filed = [];
  const { searchTool, issueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    onFiled: (url) => filed.push(url),
    runGh: async (args) => {
      ghCalls.push(args);
      if (args[1] === 'create') return 'https://github.com/owner/updated/issues/1\n';
      return '[]';
    },
  });
  assert.ok(issueTool.parameters.shape.existingIssueNumber);
  assert.ok(issueTool.parameters.shape.searchId);
  assert.equal(issueTool.parameters.shape.proposedRule, undefined);
  const search = await searchTool.execute('search-1', searchParams(candidate));
  assert.equal(search.details.searchId, 'search-1');
  assert.deepEqual(ghCalls[0].slice(0, 6), ['issue', 'list', '--repo', 'owner/updated', '--state', 'open']);
  assert.ok(!ghCalls[0].includes('--search'));
  assert.equal(ghCalls[0][ghCalls[0].indexOf('--limit') + 1], '1000');
  const created = await issueTool.execute('issue-1', fileParams(candidate, search.details.searchId));
  const abortController = new AbortController();
  let ghSignal;
  const { searchTool: abortableSearchTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (_args, signal) => {
      ghSignal = signal;
      return await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    },
  });
  const abortedSearch = abortableSearchTool.execute('search-abort', searchParams(candidate), undefined, undefined, abortController.signal);
  abortController.abort(new Error('parent shutdown'));
  await assert.rejects(abortedSearch, /parent shutdown/);
  assert.equal(ghSignal, abortController.signal);
  const fakeGhDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-gh-'));
  const fakeGhPidPath = path.join(fakeGhDir, 'pid');
  const originalPath = process.env.PATH;
  const originalPidPath = process.env.LEARNER_GH_PID_FILE;
  let fakeGhPid;
  let fakeGhExited = false;
  try {
    writeFileSync(path.join(fakeGhDir, 'gh'), `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
writeFileSync(process.env.LEARNER_GH_PID_FILE, String(process.pid));
setInterval(() => {}, 1_000);
`, { mode: 0o700 });
    process.env.PATH = `${fakeGhDir}:${originalPath || ''}`;
    process.env.LEARNER_GH_PID_FILE = fakeGhPidPath;
    const processAbortController = new AbortController();
    const { searchTool: processAbortSearchTool } = createLearnerIssueTools({ upstream: 'owner/updated', agentDir, z });
    const processSearch = processAbortSearchTool.execute('search-process-abort', searchParams(candidate), undefined, undefined, processAbortController.signal);
    for (let attempts = 0; attempts < 50 && !existsSync(fakeGhPidPath); attempts += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(existsSync(fakeGhPidPath));
    fakeGhPid = Number(readFileSync(fakeGhPidPath, 'utf8'));
    processAbortController.abort();
    await assert.rejects(processSearch, /aborted/i);
    for (let attempts = 0; attempts < 50 && !fakeGhExited; attempts += 1) {
      try {
        process.kill(fakeGhPid, 0);
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        assert.equal(error.code, 'ESRCH');
        fakeGhExited = true;
      }
    }
    assert.ok(fakeGhExited);
  } finally {
    if (fakeGhPid && !fakeGhExited) {
      try {
        process.kill(fakeGhPid, 'SIGKILL');
      } catch {}
    }
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalPidPath === undefined) delete process.env.LEARNER_GH_PID_FILE;
    else process.env.LEARNER_GH_PID_FILE = originalPidPath;
    rmSync(fakeGhDir, { recursive: true, force: true });
  }
  if (process.platform === 'linux' && process.arch === 'x64') {
    const parentDeathDir = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-pdeath-'));
    const fakeGhPath = path.join(parentDeathDir, 'gh');
    const fakeGhPidPath = path.join(parentDeathDir, 'gh.pid');
    const parentScriptPath = path.join(parentDeathDir, 'parent.mjs');
    const parentAgentDir = path.join(parentDeathDir, 'agent');
    let parent;
    let parentExited = false;
    let parentGhPid;
    let parentGhExited = false;
    try {
      mkdirSync(path.join(parentAgentDir, 'learner'), { recursive: true });
      writeFileSync(path.join(parentAgentDir, 'learner', 'config.json'), JSON.stringify({ version: 3, enabled: true, upstream: 'owner/updated' }));
      writeFileSync(fakeGhPath, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
process.on('SIGTERM', () => {});
writeFileSync(process.env.LEARNER_GH_PID_FILE, String(process.pid));
setInterval(() => {}, 1_000);
`, { mode: 0o700 });
      writeFileSync(parentScriptPath, `import { createLearnerIssueTools } from ${JSON.stringify(pathToFileURL(path.resolve('omp-plugin/learner.mjs')).href)};
const z = { string: () => ({ optional: () => ({}) }), object: () => ({}) };
const { searchTool } = createLearnerIssueTools({ upstream: 'owner/updated', agentDir: process.env.LEARNER_AGENT_DIR, z });
await searchTool.execute('parent-death', { category: 'project_knowledge', proposedRule: 'Keep commits focused', scope: 'repository' });
`);
      parent = spawn(process.execPath, [parentScriptPath], {
        env: { ...process.env, LEARNER_AGENT_DIR: parentAgentDir, LEARNER_GH_PID_FILE: fakeGhPidPath, PATH: `${parentDeathDir}:${process.env.PATH || ''}` },
        stdio: 'ignore',
      });
      for (let attempts = 0; attempts < 50 && !existsSync(fakeGhPidPath); attempts += 1) await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(existsSync(fakeGhPidPath));
      parentGhPid = Number(readFileSync(fakeGhPidPath, 'utf8'));
      parent.kill('SIGKILL');
      const parentSignal = await new Promise((resolve) => parent.once('exit', (_code, signal) => resolve(signal)));
      parentExited = true;
      assert.equal(parentSignal, 'SIGKILL');
      for (let attempts = 0; attempts < 50 && !parentGhExited; attempts += 1) {
        try {
          readFileSync(`/proc/${parentGhPid}/stat`, 'utf8');
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (error) {
          assert.equal(error.code, 'ENOENT');
          parentGhExited = true;
        }
      }
      assert.ok(parentGhExited);
    } finally {
      if (parent && !parentExited) parent.kill('SIGKILL');
      if (parentGhPid && !parentGhExited) {
        try {
          process.kill(parentGhPid, 'SIGKILL');
        } catch {}
      }
      rmSync(parentDeathDir, { recursive: true, force: true });
    }
  }

  assert.equal(created.details.created, true);
  assert.equal(filed[0], 'https://github.com/owner/updated/issues/1');
  assert.deepEqual(ghCalls[2].slice(0, 4), ['issue', 'create', '--repo', 'owner/updated']);
  assert.match(ghCalls[2].at(-1), /\*\*Provenance:\*\* User message in the completed turn\. token: \[REDACTED\]/);
  assert.doesNotMatch(ghCalls[2].at(-1), /ghp_abcdefghijklmnopqrstuvwxyz/);

  let wroteWithoutSearch = false;
  const { issueTool: noSearchIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async () => {
      wroteWithoutSearch = true;
      return '[]';
    },
  });
  await assert.rejects(noSearchIssueTool.execute('issue-2', fileParams(candidate, 'search-1')), /Search open upstream issues/);
  assert.equal(wroteWithoutSearch, false);

  const reuseCalls = [];
  const paraphrasedCandidate = {
    ...candidate,
    proposedRule: 'Retry the pipeline only when the ledger transaction is complete.',
    scope: 'order reliability',
  };
  const { searchTool: reuseSearchTool, issueTool: reuseIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      reuseCalls.push(args);
      return '[{"number":42,"title":"Keep ledger changes atomic","body":"Commit payment ledger work as one transaction. token: ghp_abcdefghijklmnopqrstuvwxyz","url":"https://github.com/owner/updated/issues/42"}]';
    },
  });
  const reuseSearch = await reuseSearchTool.execute('search-2', searchParams(paraphrasedCandidate));
  assert.doesNotMatch(reuseSearch.content[0].text, /ghp_abcdefghijklmnopqrstuvwxyz/);
  const reused = await reuseIssueTool.execute('issue-3', fileParams(paraphrasedCandidate, reuseSearch.details.searchId, { existingIssueNumber: '42' }));
  assert.equal(reused.details.created, false);
  assert.equal(reused.details.url, 'https://github.com/owner/updated/issues/42');
  assert.equal(reuseCalls.length, 1);
  const largeIssues = Array.from({ length: 100 }, (_, index) => ({
    number: index + 1,
    title: index === 99 ? 'Ledger transaction retries' : `Unrelated open issue ${index + 1} ${'x'.repeat(280)}`,
    body: 'y'.repeat(500),
    url: `https://github.com/owner/updated/issues/${index + 1}`,
  }));
  const { searchTool: boundedSearchTool, issueTool: boundedIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async () => JSON.stringify(largeIssues),
  });
  const boundedSearch = await boundedSearchTool.execute('search-bounded', searchParams(candidate));
  assert.ok(boundedSearch.content[0].text.length <= 16_000);
  assert.match(boundedSearch.content[0].text, /\[Truncated: \d+ open issue summaries omitted/);
  assert.ok(boundedSearch.content[0].text.indexOf('#100 Ledger transaction retries') < boundedSearch.content[0].text.indexOf('#1 Unrelated open issue 1'));
  assert.ok(boundedSearch.details.issueCount < 100);
  await assert.rejects(boundedIssueTool.execute('issue-bounded', fileParams(candidate, boundedSearch.details.searchId, { existingIssueNumber: '99' })), /was not returned/);

  const unrelatedCalls = [];
  const { searchTool: unrelatedSearchTool, issueTool: unrelatedIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      unrelatedCalls.push(args);
      if (args[1] === 'create') return 'https://github.com/owner/updated/issues/43';
      if (args.includes('number,title,body,url')) return '[{"number":7,"title":"Rename documentation section","body":"Unrelated formatting change.","url":"https://github.com/owner/updated/issues/7"}]';
      return '[]';
    },
  });
  const unrelatedSearch = await unrelatedSearchTool.execute('search-3', searchParams(candidate));
  const distinct = await unrelatedIssueTool.execute('issue-4', fileParams(candidate, unrelatedSearch.details.searchId));
  assert.equal(distinct.details.created, true);
  assert.equal(unrelatedCalls.filter((args) => args[1] === 'create').length, 1);

  const { searchTool: invalidSearchTool, issueTool: invalidReuseTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async () => '[{"number":7,"title":"Existing issue","body":"","url":"https://github.com/owner/updated/issues/7"}]',
  });
  const invalidSearch = await invalidSearchTool.execute('search-4', searchParams(candidate));
  await assert.rejects(invalidReuseTool.execute('issue-5', fileParams(candidate, invalidSearch.details.searchId, { existingIssueNumber: '8' })), /was not returned/);

  const exactDedupCalls = [];
  const { searchTool: exactSearchTool, issueTool: exactDedupTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      exactDedupCalls.push(args);
      if (args.includes('number,title,body,url')) return '[]';
      return '[{"url":"https://github.com/owner/updated/issues/1"}]';
    },
  });
  const exactSearch = await exactSearchTool.execute('search-5', searchParams(candidate));
  const exactDuplicate = await exactDedupTool.execute('issue-6', fileParams(candidate, exactSearch.details.searchId));
  assert.equal(exactDuplicate.details.created, false);
  assert.equal(exactDedupCalls.filter((args) => args[1] === 'create').length, 0);

  const storedCandidateCalls = [];
  const { searchTool: changedSearchTool, issueTool: changedIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      storedCandidateCalls.push(args);
      return args[1] === 'create' ? 'https://github.com/owner/updated/issues/44' : '[]';
    },
  });
  const changedSearch = await changedSearchTool.execute('search-6', searchParams(candidate));
  const storedCandidate = await changedIssueTool.execute('issue-7', {
    ...fileParams(candidate, changedSearch.details.searchId),
    proposedRule: 'A changed candidate must not replace the searched candidate.',
  });
  assert.equal(storedCandidate.details.created, true);
  assert.match(storedCandidateCalls.at(-1).at(-1), /The order pipeline retries only after the ledger transaction commits/);
  assert.doesNotMatch(storedCandidateCalls.at(-1).at(-1), /A changed candidate must not replace the searched candidate/);

  let wroteRejectedCandidate = false;
  const { searchTool: rejectedSearchTool, issueTool: rejectedIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async () => {
      wroteRejectedCandidate = true;
      return '[]';
    },
  });
  const rejectedSearch = await rejectedSearchTool.execute('search-7', searchParams(candidate));
  wroteRejectedCandidate = false;
  await assert.rejects(rejectedIssueTool.execute('issue-8', fileParams({ ...candidate, confidence: 'medium' }, rejectedSearch.details.searchId)), /confidence must be high/);
  assert.equal(wroteRejectedCandidate, false);
  let resolveExactLookup;
  const exactLookupStarted = new Promise((resolve) => { resolveExactLookup = resolve; });
  const concurrentCalls = [];
  const { searchTool: concurrentSearchTool, issueTool: concurrentIssueTool } = createLearnerIssueTools({
    upstream: 'owner/updated',
    agentDir,
    z,
    runGh: async (args) => {
      concurrentCalls.push(args);
      if (args.includes('number,title,body,url')) return '[]';
      if (args[1] === 'list') return exactLookupStarted;
      return 'https://github.com/owner/updated/issues/45';
    },
  });
  const concurrentSearch = await concurrentSearchTool.execute('search-8', searchParams(candidate));
  const concurrentResults = Promise.allSettled([
    concurrentIssueTool.execute('issue-9', fileParams(candidate, concurrentSearch.details.searchId)),
    concurrentIssueTool.execute('issue-10', fileParams(candidate, concurrentSearch.details.searchId)),
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(concurrentCalls.filter((args) => args[1] === 'list').length, 2);
  resolveExactLookup('[]');
  const [firstConcurrentResult, secondConcurrentResult] = await concurrentResults;
  assert.equal(firstConcurrentResult.status, 'fulfilled');
  assert.equal(secondConcurrentResult.status, 'rejected');
  assert.equal(concurrentCalls.filter((args) => args[1] === 'create').length, 1);

  writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'user-owned notes');
  disableLearner(agentDir);
  assert.equal(readConfiguration(agentDir).enabled, false);
  assert.equal(readFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), 'utf8'), 'user-owned notes');
  await commands.get('learner').handler('off', { agentDir });
  assert.match(messages.at(-1).content, /disabled/);
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

console.log('learner checks passed');
