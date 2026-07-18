import { createLearnerTicketTool } from './learner/ticket.mjs';
import { configurationPath, configureLearner, disableLearner, readConfiguration, resolveAgentDir } from './learner/config.mjs';

const COMMANDS = ['setup', 'off', 'status'];

export function registerLearnerPlugin(pi) {
  const z = pi.zod?.z;
  if (z) pi.registerTool?.(createLearnerTicketTool({ agentDir: (ctx) => agentDir(pi, ctx), z }));
  pi.registerCommand('learner', {
    description: 'Configure the Learner advisor.',
    getArgumentCompletions: completeCommand,
    handler: async (args, ctx) => handleCommand(pi, args, ctx),
  });

  const reconcileAdvisor = (ctx) => {
    const currentAgentDir = agentDir(pi, ctx);
    if (readConfiguration(currentAgentDir).enabled) configureLearner(currentAgentDir);
  };
  reconcileAdvisor();
  pi.on?.('session_start', (_event, ctx) => {
    const reconcile = () => {
      try {
        reconcileAdvisor(ctx);
      } catch (error) {
        ctx?.ui?.notify?.(`Learner advisor setup failed: ${error.message}`, 'warning');
      }
    };
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
      return display(pi, `Learner advisor enabled. High-confidence feedback is stored with OMP's core learn tool. Preferred ticket target: ${configuration.knowledgeBaseRepository}.`);
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
    `knowledge base: ${configuration.knowledgeBaseRepository} (preferred ticket target)`,
    'ticket filing: learner_file_ticket files approved high-confidence improvements',
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
