export function formatLearningOperations(records, format) {
  if (format === 'json') {
    return JSON.stringify(records);
  }

  return records.map((record) => {
    const evidence = record.evidence.split('\n').map((line) => `  ${line}`).join('\n');
    return `${record.outcome} ${record.operation}: ${record.subject}\n${evidence}`;
  }).join('\n\n');
}

export function createLearnerReportTool({ z }) {
  return {
    name: 'learner_report_operations',
    label: 'Report Learner Operations',
    description: 'Render observed learning/ticket operation records as readable text or JSON. Pure, read-only formatting; never executes or retries an action. Returns the same structured records in details.records.',
    approval: 'read',
    parameters: z.object({
      records: z.array(z.object({
        operation: z.enum(['learn', 'learner_file_ticket']),
        outcome: z.enum(['acknowledged', 'created', 'reused', 'blocked', 'failed']),
        subject: z.string(),
        evidence: z.string(),
      })),
      format: z.enum(['text', 'json']),
    }),
    async execute(_toolCallId, { records, format }) {
      return {
        content: [{ type: 'text', text: formatLearningOperations(records, format) }],
        details: { records },
      };
    },
  };
}
