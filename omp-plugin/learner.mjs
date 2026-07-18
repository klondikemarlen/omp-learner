import { configurationPath, configureLearner, disableLearner, readConfiguration, resolveAgentDir } from './learner/config.mjs';

const COMMANDS = ['setup', 'off', 'status'];

export function registerLearnerPlugin(pi) {
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
    setTimeout(() => {
      try {
        reconcileAdvisor(ctx);
      } catch (error) {
        ctx?.ui?.notify?.(`Learner advisor setup failed: ${error.message}`, 'warning');
      }
    }, 0);
  });
}

async function handleCommand(pi, args, ctx) {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  const command = tokens[0] || 'status';
  const currentAgentDir = agentDir(pi, ctx);

  try {
    if (command === 'setup') {
      if (tokens.length !== 1) return display(pi, 'Usage: /learner setup');
      configureLearner(currentAgentDir);
      return display(pi, 'Learner advisor enabled. High-confidence feedback is stored with OMP\'s core learn tool.');
    }

    if (command === 'off') {
      if (tokens.length !== 1) return display(pi, 'Usage: /learner off');
      disableLearner(currentAgentDir);
      return display(pi, 'Learner advisor disabled.');
    }

    if (command === 'status' && tokens.length === 1) return display(pi, statusText(currentAgentDir));
    return display(pi, 'Usage: /learner setup | off | status');
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
