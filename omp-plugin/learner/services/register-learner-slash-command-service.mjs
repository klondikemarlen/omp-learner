import { RECORD_TOOL_NAME } from '../constants.mjs';
import BaseService from '../lib/base-service.mjs';

const LEARNER_COMMANDS = ['on', 'off', 'status'];

export class RegisterLearnerSlashCommandService extends BaseService {
  constructor(pi, storeRepository) {
    super();
    this.pi = pi;
    this.storeRepository = storeRepository;
  }

  perform() {
    this.pi.registerCommand('learner', {
      description: 'Toggle automatic learner triage.',
      getArgumentCompletions: (argumentPrefix) => this.#completeCommand(argumentPrefix),
      handler: async (args, ctx) => this.#handleCommand(args, ctx),
    });
  }

  async #handleCommand(args, ctx) {
    const tokens = args.trim().split(/\s+/).filter(Boolean);
    const command = tokens[0] || 'status';
    const filePath = this.#storePathFor(ctx);
    const store = this.storeRepository.read(filePath);

    try {
      if (tokens.length > 1) return this.#sendDisplay(`Usage: /learner ${command}\n\n${this.#helpText()}`);

      const handler = this.#commandHandlers(filePath, store)[command];
      if (!handler) return this.#sendDisplay(`Unknown learner command: ${command}\n\n${this.#helpText()}`);

      return this.#sendDisplay(await handler());
    } catch (error) {
      return this.#sendDisplay(`Learner error: ${error.message}`);
    }
  }

  #commandHandlers(filePath, store) {
    return {
      status: () => this.#statusText(store, filePath),
      on: () => this.#turnOn(filePath, store),
      off: () => this.#turnOff(filePath, store),
    };
  }

  async #turnOn(filePath, store) {
    this.#setEnabled(store, true);
    this.storeRepository.write(store, filePath);
    await this.#setToolActive(true);
    return 'Learner automatic triage enabled. New feedback-like user messages will be classified automatically.';
  }

  async #turnOff(filePath, store) {
    this.#setEnabled(store, false);
    this.storeRepository.write(store, filePath);
    await this.#setToolActive(false);
    return 'Learner automatic triage disabled.';
  }

  #setEnabled(store, enabled) {
    store.settings = { ...(store.settings || {}), enabled: Boolean(enabled), updatedAt: new Date().toISOString() };
    return store.settings;
  }

  async #setToolActive(enabled) {
    if (!this.pi.getActiveTools || !this.pi.setActiveTools) return;

    const active = new Set(this.pi.getActiveTools());
    if (enabled) active.add(RECORD_TOOL_NAME);
    else active.delete(RECORD_TOOL_NAME);
    await this.pi.setActiveTools([...active]);
  }

  #completeCommand(argumentPrefix) {
    if (argumentPrefix.includes(' ')) return null;

    const lower = argumentPrefix.toLowerCase();
    const matches = LEARNER_COMMANDS
      .filter((command) => command.startsWith(lower))
      .map((command) => ({ value: `${command} `, label: command }));

    return matches.length ? matches : null;
  }

  #statusText(store, filePath) {
    const activeTools = new Set(this.pi.getActiveTools?.() || []);
    return [
      'Learner status:',
      `automatic triage: ${store.settings?.enabled ? 'on' : 'off'}`,
      `recording tool: ${activeTools.has(RECORD_TOOL_NAME) ? 'active' : 'inactive'}`,
      `pending candidates: ${store.pending.length}`,
      `store: ${filePath}`,
    ].join('\n');
  }

  #helpText() {
    return `Learner commands:\n/learner on\n/learner off\n/learner status`;
  }

  #sendDisplay(content) {
    this.pi.sendMessage({ customType: 'learner', content, display: true, attribution: 'system' }, { deliverAs: 'followUp' });
  }

  #storePathFor(ctx) {
    return this.storeRepository.path(process.env, ctx?.agentDir || this.pi.pi?.getAgentDir?.());
  }
}

export default RegisterLearnerSlashCommandService;
