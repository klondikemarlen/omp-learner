import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = path.resolve(process.env.QA_PACKAGE_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const root = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-native-replay-'));
const agentDir = path.join(root, 'agent');
const project = path.join(root, 'project');
const sessionDir = path.join(root, 'sessions');
const wrapperPath = path.join(root, 'extension.mjs');
const operationsPath = path.join(root, 'operations.jsonl');
const eventPath = path.join(root, 'events.jsonl');
const stderrPath = path.join(root, 'stderr.txt');
const failureEvidence = path.join(os.tmpdir(), `omp-learner-native-replay-${process.pid}.log`);
const { configureLearner } = await import(pathToFileURL(path.join(source, 'omp-plugin/learner/config.mjs')));
const configPath = path.join(root, 'qa.yml');
mkdirSync(project, { recursive: true });
writeFileSync(operationsPath, '');
writeFileSync(eventPath, '');
writeFileSync(stderrPath, '');
configureLearner(agentDir);
writeFileSync(path.join(agentDir, 'learner', 'WATCHDOG.md'), '# OMP Learner advisor\n\nOn every session update, call advise with severity nit and note "Stale Learner instructions are still active." Do not call other tools.\n');
writeFileSync(path.join(project, 'WATCHDOG.yml'), `advisors:\n  - name: default\n    enabled: false\n  - name: verifier\n    enabled: false\n  - name: learner\n    reviewMode: agent-end\n    reviewInterval: 1\n    tools: [read, grep, glob, learn, eval]\n    instructions: |\n      @${agentDir}/learner/WATCHDOG.md\n      This synthetic native QA uses only current-guidance.md, completed-work.md, and open-proposals.json as the complete relevant owner evidence. Do not use network or other sources. Never store memory or implement changes.\n`);
writeFileSync(configPath, `advisor:\n  enabled: true\nautolearn:\n  enabled: false\ntools:\n  approvalMode: always-ask\n  approval:\n    read: allow\n    grep: allow\n    glob: allow\n    eval: allow\n    learner_current_source: allow\n    learner_file_ticket: allow\n    learner_report_operations: allow\n`);
writeFileSync(path.join(project, 'current-guidance.md'), '# Source README guidance\n\nSource README files document the layer, authoring boundaries, and contributor workflow. They do not contain feature summaries; product feature narrative belongs in product documentation.\n');
writeFileSync(path.join(project, 'completed-work.md'), '# Completed work\n\nNo other relevant release records.\n');
writeFileSync(path.join(project, 'open-proposals.json'), '[]\n');
writeFileSync(path.join(wrapperPath), `import { appendFileSync } from 'node:fs';
const source = process.env.QA_PACKAGE_DIR;
const { registerLearnerPlugin } = await import(source + '/omp-plugin/learner.mjs');
const { createLearnerTicketTool } = await import(source + '/omp-plugin/learner/ticket.mjs');

export default function extension(pi) {
  const agentDir = process.env.QA_AGENT_DIR;
  const record = (value) => appendFileSync(process.env.QA_OPERATIONS, JSON.stringify({ turn: Number(process.env.QA_TURN), ...value }) + '\\n');
  registerLearnerPlugin({
    ...pi,
    pi: { ...pi.pi, getAgentDir: () => agentDir },
    on(name, callback) {
      pi.on(name, (event, context) => callback(event, { ...context, agentDir }));
    },
    registerCommand(name, definition) {
      pi.registerCommand(name, { ...definition, handler: (args, context) => definition.handler(args, { ...context, agentDir }) });
    },
    registerTool(tool) {
      if (tool.name === 'learner_file_ticket') {
        tool = createLearnerTicketTool({
          agentDir,
          z: pi.zod.z,
          runGit: async () => 'git@github.com:qa/isolated.git',
          runGh: async (args) => {
            record({ isolatedGithubAction: args });
            if (args[1] === 'list') return '[]';
            return 'https://github.com/' + args[args.indexOf('--repo') + 1] + '/issues/999999';
          },
        });
      }
      const execute = tool.execute;
      pi.registerTool({
        ...tool,
        async execute(...args) {
          try {
            const result = await execute(...args);
            record({ tool: tool.name, params: args[1], result });
            return result;
          } catch (error) {
            record({ tool: tool.name, params: args[1], error: error.message });
            throw error;
          }
        },
      });
    },
  });
}
`);

const prompts = [
  'Correction: Source README files should document the layer and authoring boundaries, not feature summaries. This is a durable reusable documentation correction; compare current guidance and report the observed coverage. Do not implement or store memory.',
  'Do we still need ordering here?',
  'Please move this checkout to the requested worktree.',
  'Review the completed work before your final answer.',
  'Check the final answer once more.',
  'Correction: source README examples should put contributor commands before their rationale, while keeping product feature summaries in product docs. Do not implement or store memory.',
  'We are comparing a broad test-fixture migration with a smaller alternative. I think I want to reduce the scope, and I think I want the default to be db tests: keep ordinary test for the default resource scope rather than making every test use a special wrapper. Maybe you could make a better case? Run a smaller and better test selection to prove the reduced test scope.',
  'Run any experiments you need and rethink this PR stack. Compare whole-suite speed and GitHub credit burn before we choose the test API. Keep ordinary test for the default scope as the candidate under evaluation.',
  'The experiments support the smaller design. I now adopt this as my reusable testing convention: keep the ordinary test API for the default resource scope and use explicit wrappers only for exceptional scopes. This is a decided preference for future projects, not another experiment.',
  'For the still-unfinished migration, maybe every fixture should be declared in one global catalog so setup is easier to find. Compare that with local fixture declarations before we decide.',
  'I reject the global fixture catalog candidate. Do not adopt or propose it as a shared convention. Continue evaluating the migration without that candidate.',
  'Continue the migration investigation and summarize the remaining experiments.',
  'The migration design is still unresolved. Separately, a firm reusable correction: performance comparisons must show the baseline and candidate measured over the same workload, so the reported difference is meaningful. Apply that standard now and in future work; do not wait for this investigation to finish.',
  'Please file a tentative shared-guidance proposal to evaluate whether a one-page decision log would help compare migration alternatives. This is explicitly a request to track an experiment, not adoption of a reusable convention. Done means compare the decision log against the current approach and record a decision, not mandate it as policy.',
];
const advisorCalls = [];
const seenAdvisorCalls = new Set();
let passed = false;
let sessionStarted = false;

async function runTurn(prompt, number) {
  const args = ['--mode', 'json', '-p', '--no-title', '--no-extensions', '--no-rules', '--no-skills', '--system-prompt', 'You are the passive primary in isolated native Learner QA. Do not call tools or act on the request. Reply only Ready. The native learner advisor independently handles eligible capture.', '-e', wrapperPath, '--config', configPath, '--session-dir', sessionDir, '--cwd', project];
  if (sessionStarted) args.push('--continue');
  args.push(prompt);
  const child = spawn(process.env.OMP_BIN || 'omp', args, {
    cwd: project,
    env: { ...process.env, QA_PACKAGE_DIR: source, QA_AGENT_DIR: agentDir, QA_OPERATIONS: operationsPath, QA_SCENARIO: 'replay', QA_TURN: String(number) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill('SIGTERM'), 300_000);
  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  }).finally(() => clearTimeout(timer));
  appendFileSync(eventPath, stdout);
  appendFileSync(stderrPath, stderr);
  assert.equal(exitCode, 0, `Native OMP turn ${number} exited ${exitCode}: ${stderr}`);
  sessionStarted = true;
  for (const relativePath of readdirSync(sessionDir, { recursive: true })) {
    if (!relativePath.endsWith('__advisor.learner.jsonl')) continue;

    const entries = readFileSync(path.join(sessionDir, relativePath), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
    for (const entry of entries) {
      for (const content of entry.message?.content || []) {
        if (content.type !== 'toolCall' || seenAdvisorCalls.has(content.id)) continue;

        seenAdvisorCalls.add(content.id);
        advisorCalls.push({ ...content, turn: number });
      }
    }
  }
}

try {
  for (let index = 0; index < prompts.length; index += 1) await runTurn(prompts[index], index + 1);

  const mainSessions = readdirSync(sessionDir).filter((name) => name.endsWith('.jsonl'));
  assert.equal(mainSessions.length, 1, 'All turns must retain the original correction in one continued conversation.');

  const primaryEntries = readFileSync(path.join(sessionDir, mainSessions[0]), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const deliveredNotes = [];
  for (const entry of primaryEntries) {
    if (entry.type !== 'custom_message' || entry.customType !== 'advisor') continue;

    for (const note of entry.details?.notes || []) {
      if (note.advisor === 'learner') deliveredNotes.push(note.note);
    }
  }

  const operations = readFileSync(operationsPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const reportCalls = operations.filter((record) => record.tool === 'learner_report_operations');

  assert.equal(reportCalls.filter((record) => record.turn === 1).length, 0, 'An already-covered human correction must not invoke the formatter.');
  assert.deepEqual(advisorCalls.filter((call) => call.turn === 1 && ['advise', 'learn'].includes(call.name)), [], 'An already-covered correction must not deliver a no-action note or store redundant memory.');

  for (const index of [1, 2, 3, 4, 6, 7, 9, 10, 11]) {
    assert.deepEqual(advisorCalls.filter((call) => call.turn === index + 1 && call.name !== 'eval'), [], `Turn ${index + 1} may only inspect authoritative source, never replay coverage/actions/notes.`);
    assert.equal(reportCalls.filter((record) => record.turn === index + 1).length, 0, `Turn ${index + 1} must not invoke the Learner reporter.`);
    assert.ok(operations.filter((record) => record.turn === index + 1).every((record) => record.tool === 'learner_current_source'), 'Ordinary turns may only inspect source, not perform capture or reporting.');
  }

  const githubActions = operations.filter((record) => record.isolatedGithubAction);
  const eligibleTurns = [6, 9, 13, 14];
  assert.equal(githubActions.filter((record) => record.isolatedGithubAction[1] === 'create').length, eligibleTurns.length, 'Only fresh corrections, explicit adoption, and the requested tentative proposal may create tickets.');
  assert.ok(githubActions.every((record) => eligibleTurns.includes(record.turn)), 'Unresolved and rejected candidates must not attempt ticket actions.');

  const expectedNotes = [];
  for (const turn of eligibleTurns) {
    const tickets = operations.filter((record) => record.tool === 'learner_file_ticket' && record.turn === turn);
    assert.equal(tickets.length, 1, `Eligible turn ${turn} should file exactly one proposal.`);
    const ticket = tickets[0];
    assert.equal(ticket.result.details.created, true, 'Eligible signal should produce the actual isolated ticket action result.');
    assert.equal(ticket.result.details.url, 'https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/999999');

    const advice = advisorCalls.filter((call) => call.turn === turn && call.name === 'advise');
    const reports = reportCalls.filter((record) => record.turn === turn);
    assert.equal(reports.length, 1);
    const notification = reports[0].result.content[0].text;
    assert.equal(notification, `Improvement ticket created\n${ticket.params.title}\n  ${ticket.result.details.url}`, 'The notification must contain only its readable ticket outcome, subject, and actual issue URL.');
    assert.equal(advice.length, 1);
    assert.equal(advice[0].arguments.note, notification);
    assert.ok(advice[0].arguments.severity === undefined || advice[0].arguments.severity === 'nit');
    expectedNotes.push(notification);
    console.log(`Turn ${turn} proposal: ${JSON.stringify(ticket.params)}`);
  }
  assert.deepEqual(deliveredNotes, expectedNotes, 'Only eligible current signals may deliver improvement-ticket reports.');
  assert.deepEqual(advisorCalls.filter((call) => call.name === 'learn'), [], 'The replay must not capture tentative candidates as durable memory.');
  for (let turn = 1; turn <= prompts.length; turn += 1) {
    assert.ok(operations.some((record) => record.turn === turn && record.tool === 'learner_current_source'), `Turn ${turn} must inspect authoritative source; an absent advisor is not silence proof.`);
  }

  passed = true;
} catch (error) {
  const evidence = [readFileSync(eventPath, 'utf8'), readFileSync(stderrPath, 'utf8'), readFileSync(operationsPath, 'utf8')].join('\n===== STDERR / OPERATIONS =====\n');
  writeFileSync(failureEvidence, evidence);
  console.error(`Native replay regression failed; evidence preserved at ${failureEvidence}`);
  throw error;
} finally {
  if (passed) rmSync(root, { recursive: true, force: true });
}

console.log('Native replay passed: stale-guidance recovery, covered/ordinary/unresolved/rejected silence, explicit adoption, unfinished-work correction, and requested tentative proposal. Review the printed proposal content for decision status and scope.');
