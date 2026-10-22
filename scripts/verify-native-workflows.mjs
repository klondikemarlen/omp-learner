import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = path.resolve(process.env.QA_PACKAGE_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const root = mkdtempSync(path.join(os.tmpdir(), 'omp-learner-native-workflows-'));
const agentDir = path.join(root, 'agent');
const wrapperPath = path.join(root, 'extension.mjs');
const operationsPath = path.join(root, 'operations.jsonl');
const eventsPath = path.join(root, 'events.jsonl');
const stderrPath = path.join(root, 'stderr.txt');
const failureEvidence = path.join(os.tmpdir(), `omp-learner-native-workflows-${process.pid}.log`);
const { configureLearner } = await import(pathToFileURL(path.join(source, 'omp-plugin/learner/config.mjs')));
const configPath = path.join(root, 'qa.yml');
const scenarios = [
  {
    name: 'one-off',
    prompts: ['Could you organize these meeting notes into decisions, owners, and open questions?'],
  },
  {
    name: 'recurring-missing',
    prompts: [
      'Prepare a concise release update from the changes merged this week, including user impact and anything that still needs attention.',
      'I need a customer-facing summary of this week’s merged changes, with the important impact and remaining risks called out.',
      'Can you turn the work merged this week into a short release update that explains what changed for users and what remains unresolved?',
      'This week’s merged changes need a brief release update for users, including the impact and unresolved risks.',
      'Could you organize these meeting notes into decisions, owners, and open questions?',
    ],
  },
  {
    name: 'recurring-covered',
    prompts: [
      'I keep spending time turning each release’s changes into a useful update. This release needs the same kind of concise summary of merged work, user impact, and remaining risks.',
    ],
  },
  {
    name: 'completed-work-coaching',
    prompts: [
      'The release update is finished. I keep spending effort manually coordinating these updates. For next time, how could I have used existing OMP workflows to achieve the same result with less typing? I only want coaching, not a new skill or guidance change.',
    ],
  },
];

mkdirSync(agentDir, { recursive: true });
writeFileSync(operationsPath, '');
writeFileSync(eventsPath, '');
writeFileSync(stderrPath, '');
configureLearner(agentDir);
writeFileSync(configPath, `advisor:\n  enabled: true\nautolearn:\n  enabled: false\ntools:\n  approvalMode: always-ask\n  approval:\n    read: allow\n    grep: allow\n    glob: allow\n    eval: allow\n    learner_current_source: allow\n    learner_file_ticket: allow\n    learner_report_operations: allow\n`);
writeFileSync(wrapperPath, `import { appendFileSync } from 'node:fs';

const source = process.env.QA_PACKAGE_DIR;
const { registerLearnerPlugin } = await import(source + '/omp-plugin/learner.mjs');
const { createLearnerTicketTool } = await import(source + '/omp-plugin/learner/ticket.mjs');

export default function extension(pi) {
  const agentDir = process.env.QA_AGENT_DIR;
  const record = (value) => appendFileSync(process.env.QA_OPERATIONS, JSON.stringify({ scenario: process.env.QA_SCENARIO, turn: Number(process.env.QA_TURN), ...value }) + '\\n');

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

const skillGuide = '# Available shared skills\n\n## Test fixture setup\n\nInvocation: `/test-factory-traits-and-service-shape`. Use this skill to build persisted relationship fixtures for TypeScript service tests. It does not describe release communication.\n';
const ownerGuidance = '# Current shared guidance\n\n## Available workflow\n\n' + skillGuide + '\n## Workflow gaps\n\nThe reusable workflow for preparing concise release updates from merged work, user impact, and unresolved risks is not documented here.\n';
const coveredGuidance = '# Current shared guidance\n\n## Available shared skills\n\n### Release notes\n\nInvocation: `/release-notes`. Use this skill to prepare release notes from merged work, explain user impact, and call out unresolved risks. It provides the established release-note workflow.\n';
const evidenceFiles = ['current-guidance.md', 'completed-work.md', 'open-proposals.json'];

function prepareScenario(scenario) {
  const project = path.join(root, scenario.name);
  const sessionDir = path.join(project, 'sessions');
  mkdirSync(project, { recursive: true });
  writeFileSync(path.join(project, 'WATCHDOG.yml'), `advisors:\n  - name: default\n    enabled: false\n  - name: verifier\n    enabled: false\n  - name: learner\n    reviewMode: agent-end\n    reviewInterval: 1\n    tools: [read, grep, glob, learn, eval]\n    instructions: |\n      @${agentDir}/learner/WATCHDOG.md\n      Treat ${evidenceFiles.join(', ')} as the complete owner evidence. Do not use network or other sources. Never store memory or implement changes.\n`);
  writeFileSync(path.join(project, 'current-guidance.md'), scenario.name === 'recurring-missing' || scenario.name === 'one-off' ? ownerGuidance : coveredGuidance);
  writeFileSync(path.join(project, 'completed-work.md'), '# Completed work\n\nNo other relevant release records.\n');
  writeFileSync(path.join(project, 'open-proposals.json'), '[]\n');
  return { project, sessionDir };
}

const scenarioEvents = [];
let passed = false;

async function runTurn(scenario, paths, prompt, number, continued) {
  const args = [
    '--mode', 'json', '-p', '--no-title', '--no-extensions', '--no-rules', '--no-skills',
    '--system-prompt', 'You are the passive primary in isolated native Learner QA. Do not call tools or act on the request. Reply only Ready. The native learner advisor independently handles eligible capture.',
    '-e', wrapperPath, '--config', configPath, '--session-dir', paths.sessionDir, '--cwd', paths.project,
  ];
  if (continued) args.push('--continue');
  args.push(prompt);
  const child = spawn(process.env.OMP_BIN || 'omp', args, {
    cwd: paths.project,
    env: {
      ...process.env,
      QA_PACKAGE_DIR: source,
      QA_AGENT_DIR: agentDir,
      QA_OPERATIONS: operationsPath,
      QA_SCENARIO: scenario.name,
      QA_TURN: String(number),
    },
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
  appendFileSync(stderrPath, JSON.stringify({ scenario: scenario.name, turn: number, stderr }) + '\n');
  appendFileSync(eventsPath, JSON.stringify({ scenario: scenario.name, turn: number, prompt, stdout, stderr, exitCode }) + '\n');
  assert.equal(exitCode, 0, `Native OMP ${scenario.name} turn ${number} exited ${exitCode}: ${stderr}`);
}

function readScenarioEvidence(scenario, paths) {
  const scenarioOperations = readFileSync(operationsPath, 'utf8').split('\n').filter(Boolean)
    .map((line) => JSON.parse(line)).filter((record) => record.scenario === scenario.name);
  const advisorCalls = [];
  const transcriptPaths = [];
  const deliveredNotes = [];
  for (const relativePath of readdirSync(paths.sessionDir)) {
    if (!relativePath.endsWith('.jsonl')) continue;

    const entries = readFileSync(path.join(paths.sessionDir, relativePath), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
    for (const entry of entries) {
      if (entry.type !== 'custom_message' || entry.customType !== 'advisor') continue;

      for (const note of entry.details?.notes || []) {
        if (note.advisor === 'learner') deliveredNotes.push(note.note);
      }
    }
  }

  for (const relativePath of readdirSync(paths.sessionDir, { recursive: true })) {
    if (!relativePath.endsWith('__advisor.learner.jsonl')) continue;

    transcriptPaths.push(relativePath);
    const entries = readFileSync(path.join(paths.sessionDir, relativePath), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
    for (const entry of entries) {
      for (const content of entry.message?.content || []) {
        if (content.type === 'toolCall') advisorCalls.push(content);
      }
    }
  }
  return { operations: scenarioOperations, advisorCalls, transcriptPaths, deliveredNotes };
}

async function runScenario(scenario) {
  const paths = prepareScenario(scenario);
  for (let index = 0; index < scenario.prompts.length; index += 1) {
    await runTurn(scenario, paths, scenario.prompts[index], index + 1, index > 0);
  }
  const evidence = readScenarioEvidence(scenario, paths);
  scenarioEvents.push({ name: scenario.name, ...evidence });
  return evidence;
}

function reportsFor(evidence) {
  return evidence.operations.filter((record) => record.tool === 'learner_report_operations');
}

function coverageFor(evidence) {
  return reportsFor(evidence).flatMap((record) => (record.params?.records ?? [])
    .filter((entry) => entry.operation === 'guidance_coverage')
    .map((entry) => ({ ...entry, turn: record.turn })));
}

try {
  const covered = await runScenario(scenarios[2]);
  assert.deepEqual(covered.deliveredNotes, [], 'An ordinary recurring request covered by an existing workflow must not deliver a Learner match or coaching note.');
  assert.equal(reportsFor(covered).length, 0, 'An existing-workflow match must not produce a Learner report.');
  assert.equal(covered.operations.filter((record) => record.tool === 'learner_file_ticket').length, 0, 'An existing equivalent skill must not produce a ticket.');
  assert.equal(covered.advisorCalls.filter((call) => call.name === 'learn').length, 0, 'An existing-workflow match must not create a memory record.');
  assert.equal(covered.advisorCalls.filter((call) => call.name === 'advise').length, 0, 'Existing-workflow coaching belongs to Trainer, not Learner.');

  const coaching = await runScenario(scenarios[3]);
  assert.deepEqual(coaching.deliveredNotes, [], 'A completed-work coaching request must not deliver a Learner note.');
  assert.equal(reportsFor(coaching).length, 0, 'A coaching-only request must not produce a Learner report.');
  assert.equal(coaching.operations.filter((record) => record.tool === 'learner_file_ticket').length, 0, 'A coaching-only request must not create a guidance ticket.');
  assert.ok(coaching.advisorCalls.every((call) => call.name === 'eval'), 'A coaching-only request must stop after source inspection without guidance lookup or memory capture.');

  const oneOff = await runScenario(scenarios[0]);
  assert.equal(reportsFor(oneOff).length, 0, 'A one-off ordinary request must not produce a Learner report.');
  assert.equal(oneOff.operations.filter((record) => record.tool === 'learner_file_ticket').length, 0);
  assert.deepEqual(oneOff.deliveredNotes, [], 'One-off requests must not deliver native Learner notes.');
  assert.ok(oneOff.advisorCalls.every((call) => call.name === 'eval'), 'One-off inspection must not perform coverage lookup or memory capture.');

  const recurring = await runScenario(scenarios[1]);
  const recurringReports = reportsFor(recurring);
  const recurringCoverage = coverageFor(recurring);
  const recurringActions = recurring.operations.filter((record) => record.isolatedGithubAction);
  assert.equal(recurringCoverage.length, 1, `Expected one missing-workflow coverage report, found ${recurringCoverage.length}.`);
  assert.equal(recurringCoverage[0].outcome, 'not_covered');
  assert.match(recurringCoverage[0].evidence, /current-guidance\.md/);
  assert.equal(recurringCoverage[0].turn, 3, 'Recurrence should be established by three distinct real user prompts.');
  const ticket = recurring.operations.find((record) => record.tool === 'learner_file_ticket');
  assert.ok(ticket, 'Missing recurring workflow should create one approved proposal through the registered ticket tool.');
  assert.equal(ticket.result.details.created, true);
  assert.equal(ticket.result.details.url, 'https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/999999');
  assert.equal(recurringActions.filter((record) => record.isolatedGithubAction[1] === 'create').length, 1);
  const ticketText = JSON.stringify(ticket.params);
  assert.match(ticketText, /release/i, 'Proposal should identify the intended release-update workflow.');
  assert.match(ticketText, /merged/i, 'Proposal should identify relevant workflow inputs.');
  assert.match(ticketText, /impact|outcome/i, 'Proposal should identify the intended result.');
  assert.match(ticketText, /approval|review/i, 'Proposal should preserve human approval boundaries.');
  assert.match(reportsFor(recurring)[0].result.content[0].text, /^Improvement ticket created\n/);
  assert.equal(recurring.advisorCalls.filter((call) => call.name === 'advise').length, 1, 'Missing-workflow result should reach the native Learner reporter.');
  assert.equal(recurring.advisorCalls.find((call) => call.name === 'advise').arguments.note, reportsFor(recurring)[0].result.content[0].text);
  assert.deepEqual(recurring.deliveredNotes, [recurringReports[0].result.content[0].text], 'The primary session must receive exactly the observed missing-workflow report.');
  assert.equal(reportsFor(recurring).filter((record) => record.turn === 4).length, 0, 'Repeating a handled pattern must not produce another Learner report.');
  assert.equal(recurring.operations.filter((record) => record.turn === 4 && record.tool === 'learner_file_ticket').length, 0, 'A handled pattern must not produce a duplicate proposal.');
  assert.equal(reportsFor(recurring).filter((record) => record.turn === 5).length, 0, 'An unrelated ordinary current request must remain silent despite historical repetition.');
  assert.equal(recurring.operations.filter((record) => record.turn === 5 && record.tool === 'learner_file_ticket').length, 0);

  for (const scenario of scenarioEvents) {
    assert.ok(scenario.transcriptPaths.length > 0, `${scenario.name} must retain a named Learner transcript.`);
    assert.ok(scenario.advisorCalls.some((call) => call.name === 'eval'), `${scenario.name} must use the native eval transport.`);
    assert.ok(scenario.operations.some((record) => record.tool === 'learner_current_source'), `${scenario.name} must inspect the registered current-source tool.`);
  }
  passed = true;
} catch (error) {
  const transcriptFiles = [];
  for (const scenario of scenarios) {
    const sessionDir = path.join(root, scenario.name, 'sessions');
    if (!existsSync(sessionDir)) continue;

    for (const relativePath of readdirSync(sessionDir, { recursive: true })) {
      if (!relativePath.endsWith('__advisor.learner.jsonl')) continue;

      const transcriptPath = path.join(sessionDir, relativePath);
      transcriptFiles.push(`=== ${transcriptPath} ===\n${readFileSync(transcriptPath, 'utf8')}`);
    }
  }
  const evidence = [
    'Named Learner advisor transcripts:',
    ...transcriptFiles,
    'Registered operation receipts:', readFileSync(operationsPath, 'utf8'),
    'Native OMP events:', readFileSync(eventsPath, 'utf8'),
    'stderr:', readFileSync(stderrPath, 'utf8'),
  ].join('\n');
  writeFileSync(failureEvidence, evidence);
  console.error(`Native workflow QA failed; named advisor transcript and operation receipts preserved at ${failureEvidence}`);
  throw error;
} finally {
  if (passed) rmSync(root, { recursive: true, force: true });
}

console.log('Native workflow QA passed: existing-workflow and coaching-only silence, recurring gap capture, handled replay silence, and unrelated-prompt silence.');
