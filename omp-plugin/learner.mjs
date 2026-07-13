import { configurationPath, configureLearner, disableLearner, readConfiguration, resolveAgentDir } from './learner/config.mjs';

const COMMANDS = ['setup', 'off', 'status'];

export function registerLearnerPlugin(pi) {
  pi.registerCommand('learner', {
    description: 'Configure the persistent learner watchdog.',
    getArgumentCompletions: completeCommand,
    handler: async (args, ctx) => handleCommand(pi, args, ctx),
  });
}

async function handleCommand(pi, args, ctx) {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  const command = tokens[0] || 'status';
  const currentAgentDir = agentDir(pi, ctx);

  try {
    if (command === 'setup') {
      if (tokens.length !== 2) return display(pi, 'Usage: /learner setup https://github.com/owner/repository');
      const result = configureLearner(currentAgentDir, tokens[1]);
      return display(pi, `Learner watchdog configured for ${result.upstream}. Restart OMP to load the independent advisor.`);
    }

    if (command === 'off') {
      if (tokens.length !== 1) return display(pi, 'Usage: /learner off');
      disableLearner(currentAgentDir);
      return display(pi, 'Learner watchdog disabled.');
    }

    if (command === 'status' && tokens.length === 1) return display(pi, statusText(currentAgentDir));
    return display(pi, 'Usage: /learner setup https://github.com/owner/repository | off | status');
  } catch (error) {
    return display(pi, `Learner setup failed: ${error.message}`);
  }
}

function statusText(currentAgentDir) {
  const configuration = readConfiguration(currentAgentDir);
  return [
    'Learner status:',
    `watchdog: ${configuration.enabled ? 'configured' : 'off'}`,
    `upstream: ${configuration.upstream || 'not configured'}`,
    'issue filing: unavailable until OMP supports advisor extension tools',
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
