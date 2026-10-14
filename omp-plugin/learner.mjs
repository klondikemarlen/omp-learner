import { createLearnerTicketTool } from './learner/ticket.mjs';
import { configurationPath, configureLearner, disableLearner, readConfiguration, resolveAgentDir } from './learner/config.mjs';
import { createLearnerReportTool } from './learner/report.mjs';

const COMMANDS = ['setup', 'off', 'status'];
const NO_CHANGE_PATTERN = /\b(?:no changes?|unchanged|nothing to (?:change|do)|already up[- ]to[- ]date|did not change|stale anchor|anchor.*(?:mismatch|invalid|not found)|hash.*mismatch)\b/i;
const STATE_CHANGING_TOOLS = new Set(['ast_edit', 'edit', 'write']);

export function registerLearnerPlugin(pi) {
  const loopGuard = createToolLoopGuard();
  const z = pi.zod?.z;
  if (z) {
    pi.registerTool?.(createLearnerTicketTool({ agentDir: (ctx) => agentDir(pi, ctx), z }));
    pi.registerTool?.(createLearnerReportTool({ z }));
  }

  pi.registerCommand('learner', {
    description: 'Configure the Learner advisor.',
    getArgumentCompletions: completeCommand,
    handler: async (args, ctx) => handleCommand(pi, args, ctx),
  });

  const reconcileAdvisor = (ctx) => {
    const currentAgentDir = agentDir(pi, ctx);
    if (readConfiguration(currentAgentDir).enabled) configureLearner(currentAgentDir);
  };
  const safeReconcile = (ctx) => {
    try {
      reconcileAdvisor(ctx);
    } catch (error) {
      ctx?.ui?.notify?.(`Learner advisor setup failed: ${error.message}`, 'warning');
    }
  };
  safeReconcile();
  pi.on?.('tool_call', (event, ctx) => {
    if (learnerEnabled(pi, ctx)) return loopGuard.onToolCall(event);
  });
  pi.on?.('tool_result', (event, ctx) => {
    if (learnerEnabled(pi, ctx)) return loopGuard.onToolResult(event);
  });
  pi.on?.('session_start', (_event, ctx) => {
    loopGuard.reset();
    const reconcile = () => safeReconcile(ctx);
    if (ctx?.setTimeout) ctx.setTimeout(reconcile, 0);
    else setTimeout(reconcile, 0);
  });
}

async function handleCommand(pi, args, ctx) {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  const command = tokens[0] || 'status';
  const currentAgentDir = agentDir(pi, ctx);

  try {
    if (command === 'setup') {
      if (tokens.length > 2) return display(pi, 'Usage: /learner setup [owner/repository]');
      const configuration = configureLearner(currentAgentDir, { knowledgeBaseRepository: tokens[1] });
      const setupMessage = [
        'Learner advisor enabled. High-confidence actionable corrections are filed as deduplicated, evidence-backed issues before optional learning.',
        'Destinations are limited to the active GitHub origin or klondikemarlen-owned repositories; related targets require evidence, and upstream or external issues are blocked.',
        `Configured shared-guidance target: ${configuration.knowledgeBaseRepository}.`,
      ].join(' ');
      return display(pi, setupMessage);
    }

    if (command === 'off') {
      if (tokens.length !== 1) return display(pi, 'Usage: /learner off');
      disableLearner(currentAgentDir);
      return display(pi, 'Learner advisor disabled.');
    }

    if (command === 'status' && tokens.length === 1) return display(pi, statusText(currentAgentDir));
    return display(pi, 'Usage: /learner setup [owner/repository] | off | status');
  } catch (error) {
    return display(pi, `Learner setup failed: ${error.message}`);
  }
}

function statusText(currentAgentDir) {
  const configuration = readConfiguration(currentAgentDir);
  return [
    'Learner status:',
    `advisor: ${configuration.enabled ? 'on' : 'off'}`,
    'core learning: uses OMP\'s learn tool when autolearn.enabled and a supported memory backend are configured',
    'feedback handling: actionable high-confidence corrections are filed as deduplicated evidence-backed issues before optional learning',
    'ticket boundary: active GitHub origin or klondikemarlen-owned repositories; related targets require evidence; no upstream or external issues',
    `shared guidance target: ${configuration.knowledgeBaseRepository}`,
    `configuration: ${configurationPath(currentAgentDir)}`,
  ].join('\n');
}

function completeCommand(argumentPrefix) {
  if (argumentPrefix.includes(' ')) return null;
  return COMMANDS.filter((command) => command.startsWith(argumentPrefix.toLowerCase())).map((command) => ({ value: `${command} `, label: command }));
}

function display(pi, content) {
  return pi.sendMessage?.({ customType: 'learner', content, display: true, attribution: 'system' }, { deliverAs: 'followUp' });
}

function agentDir(pi, ctx) {
  return resolveAgentDir(process.env, ctx?.agentDir || pi.pi?.getAgentDir?.());
}

function isStateChangingTool(toolName) {
  return STATE_CHANGING_TOOLS.has(toolName);
}

export function createToolLoopGuard() {
  const pending = new Map();
  const failed = new Map();

  return {
    onToolCall(event = {}) {
      const fingerprint = canonicalizeToolCall(event);
      if (!fingerprint) return;
      const failedToolName = failed.get(fingerprint);
      if (failedToolName) {
        return {
          block: true,
          reason: `Repeated ${failedToolName} call blocked after no state change. Re-read the current state and retry with a fresh anchor.`,
        };
      }
      pending.set(event.toolCallId, { fingerprint, toolName: event.toolName });
    },
    onToolResult(event = {}) {
      const call = pending.get(event.toolCallId);
      pending.delete(event.toolCallId);
      if (!call) return;
      const result = safeStringify({ content: event.content, details: event.details });
      if (isStateChangingTool(call.toolName) && (event.isError || NO_CHANGE_PATTERN.test(result))) {
        failed.set(call.fingerprint, call.toolName);
      } else {
        failed.delete(call.fingerprint);
      }
    },
    reset() {
      pending.clear();
      failed.clear();
    },
  };
}

function learnerEnabled(pi, ctx) {
  try {
    return readConfiguration(agentDir(pi, ctx)).enabled;
  } catch {
    return false;
  }
}

function canonicalizeToolCall(event) {
  try {
    const fingerprint = safeStringify({ toolName: event.toolName, input: sortValue(event.input) });
    return fingerprint || null;
  } catch {
    return null;
  }
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
