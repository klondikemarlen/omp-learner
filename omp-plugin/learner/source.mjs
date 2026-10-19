export function createLearnerSourceTool({ z }) {
  return {
    name: 'learner_current_source',
    label: 'Read Current Learner Source',
    description: 'Read the latest real user message and last delivered Learner report from the current primary session branch. Use before interpreting seeded advisor history. Pure read-only snapshot: no capture, reporting, storage, or execution.',
    approval: 'read',
    parameters: z.object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      if (typeof ctx?.sessionManager?.getBranch !== 'function') {
        throw new Error('Current Learner source is unavailable: native session branch access is required.');
      }

      const branch = ctx.sessionManager.getBranch();
      let source = null;
      let lastReport = null;
      for (let index = branch.length - 1; index >= 0; index -= 1) {
        const entry = branch[index];
        if (lastReport === null && entry.type === 'custom_message' && entry.customType === 'advisor') {
          const note = entry.details?.notes?.find((item) => item.advisor === 'learner' && typeof item.note === 'string');
          if (note) {
            lastReport = note.note;
          }
        }

        const message = entry.message;
        if (source === null && entry.type === 'message' && message?.role === 'user' && message.synthetic !== true
          && (message.attribution === undefined || message.attribution === 'user')) {
          const text = typeof message.content === 'string'
            ? message.content
            : message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
          source = { id: entry.id, text };
        }

        if (source !== null && lastReport !== null) break;
      }

      const snapshot = { source, lastReport };
      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot) }],
        details: snapshot,
      };
    },
  };
}
