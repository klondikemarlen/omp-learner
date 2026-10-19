const HISTORY_PROMPT_LIMIT = 12;
const HISTORY_REPORT_LIMIT = 8;
const HISTORY_TEXT_LIMIT = 2000;

function getMessageText(message) {
  return typeof message.content === 'string'
    ? message.content
    : message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
}

function getMessagePreview(message) {
  const content = message.content;
  if (typeof content === 'string') {
    return { text: content.slice(0, HISTORY_TEXT_LIMIT), truncated: content.length > HISTORY_TEXT_LIMIT };
  }

  let text = '';
  let hasTextPart = false;
  for (const part of content) {
    if (part.type !== 'text') continue;

    if (hasTextPart) {
      if (text.length === HISTORY_TEXT_LIMIT) return { text, truncated: true };
      text += '\n';
    }
    hasTextPart = true;

    const partText = part.text == null ? '' : String(part.text);
    const remaining = HISTORY_TEXT_LIMIT - text.length;
    if (partText.length > remaining) {
      return { text: text + partText.slice(0, remaining), truncated: true };
    }
    text += partText;
  }
  return { text, truncated: false };
}

export function createLearnerSourceTool({ z }) {
  return {
    name: 'learner_current_source',
    label: 'Read Current Learner Source',
    description: 'Read the latest real user message and Learner reports, with bounded recent real prompts and Learner reports from the current primary session branch. Use before interpreting seeded advisor history. Pure read-only snapshot: no capture, reporting, storage, or execution.',
    approval: 'read',
    parameters: z.object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      if (typeof ctx?.sessionManager?.getBranch !== 'function') {
        throw new Error('Current Learner source is unavailable: native session branch access is required.');
      }

      const branch = ctx.sessionManager.getBranch();
      let source = null;
      let lastReport = null;
      let historyTruncated = false;
      let promptsOverflow = false;
      let reportsOverflow = false;
      const recentPrompts = [];
      const recentReports = [];

      for (let index = branch.length - 1; index >= 0; index -= 1) {
        const entry = branch[index];
        if (!reportsOverflow && entry.type === 'custom_message' && entry.customType === 'advisor') {
          const note = entry.details?.notes?.find((item) => item.advisor === 'learner' && typeof item.note === 'string');
          if (note) {
            if (lastReport === null) lastReport = note.note;
            if (recentReports.length === HISTORY_REPORT_LIMIT) {
              reportsOverflow = true;
              historyTruncated = true;
            } else {
              const preview = {
                text: note.note.slice(0, HISTORY_TEXT_LIMIT),
                truncated: note.note.length > HISTORY_TEXT_LIMIT,
              };
              recentReports.push({ id: entry.id, ...preview });
              historyTruncated ||= preview.truncated;
            }
          }
        }

        if (!promptsOverflow) {
          const message = entry.message;
          if (entry.type === 'message' && message?.role === 'user' && message.synthetic !== true
            && (message.attribution === undefined || message.attribution === 'user')) {
            if (recentPrompts.length === HISTORY_PROMPT_LIMIT) {
              promptsOverflow = true;
              historyTruncated = true;
            } else {
              let preview;
              if (source === null) {
                const text = getMessageText(message);
                source = { id: entry.id, text };
                preview = { text: text.slice(0, HISTORY_TEXT_LIMIT), truncated: text.length > HISTORY_TEXT_LIMIT };
              } else {
                preview = getMessagePreview(message);
              }
              recentPrompts.push({ id: entry.id, ...preview });
              historyTruncated ||= preview.truncated;
            }
          }
        }

        if (source !== null && lastReport !== null && promptsOverflow && reportsOverflow) break;
      }

      const snapshot = { source, lastReport, recentPrompts, recentReports, historyTruncated };
      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot) }],
        details: snapshot,
      };
    },
  };
}
