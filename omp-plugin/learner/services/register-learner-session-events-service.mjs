import { RECORD_TOOL_NAME } from '../constants.mjs';
import BaseService from '../lib/base-service.mjs';
import { buildAutomaticSystemPrompt } from '../lib/build-automatic-system-prompt.mjs';
import { isLearnerWorkflowPrompt } from '../lib/is-learner-workflow-prompt.mjs';

export class RegisterLearnerSessionEventsService extends BaseService {
  constructor(pi, storeRepository) {
    super();
    this.pi = pi;
    this.storeRepository = storeRepository;
  }

  perform() {
    this.#registerSessionStart();
    this.#registerBeforeAgentStart();
  }

  #registerSessionStart() {
    this.pi.on?.('session_start', async (_event, ctx) => {
      const store = this.storeRepository.read(this.#storePathFor(ctx));
      if (!store.settings?.enabled) return;

      await this.#setToolActive(true);
      ctx?.ui?.notify?.('Learner automatic triage enabled', 'info');
    });
  }

  #registerBeforeAgentStart() {
    this.pi.on?.('before_agent_start', async (event, ctx) => {
      const store = this.storeRepository.read(this.#storePathFor(ctx));
      if (!store.settings?.enabled) return {};

      if (isLearnerWorkflowPrompt(event.prompt)) {
        await this.#setToolActive(false);
        return {};
      }

      await this.#setToolActive(true);
      return { systemPromptAppend: buildAutomaticSystemPrompt() };
    });
  }

  async #setToolActive(enabled) {
    if (!this.pi.getActiveTools || !this.pi.setActiveTools) return;

    const active = new Set(this.pi.getActiveTools());
    if (enabled) active.add(RECORD_TOOL_NAME);
    else active.delete(RECORD_TOOL_NAME);
    await this.pi.setActiveTools([...active]);
  }

  #storePathFor(ctx) {
    return this.storeRepository.path(process.env, ctx?.agentDir || this.pi.pi?.getAgentDir?.());
  }
}

export default RegisterLearnerSessionEventsService;
