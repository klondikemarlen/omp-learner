export function formatLearningOperations(records, format) {
  if (format === 'json') {
    return JSON.stringify(records);
  }

  const headings = {
    created: 'Improvement ticket created',
    reused: 'Improvement ticket reused',
    blocked: 'Improvement ticket blocked',
    failed: 'Improvement ticket failed',
  };

  return records.filter((record) => record.operation === 'learner_file_ticket').map((record) => {
    const evidence = record.evidence.split('\n').map((line) => `  ${line}`).join('\n');
    return `${headings[record.outcome]}\n${record.subject}\n${evidence}`;
  }).join('\n\n');
}

export function createLearnerReportTool({ z }) {
  return {
    name: 'learner_report_operations',
    label: 'Report Learner Operations',
    description: 'Render readable ticket outcomes as text, or all supplied operation records as JSON. Coverage and memory records stay in details.records and JSON, not notifications. Pure, read-only formatting; never executes or retries an action.',
    approval: 'read',
    parameters: z.object({
      records: z.array(z.object({
        operation: z.enum(['guidance_coverage', 'learn', 'learner_file_ticket']),
        outcome: z.enum(['covered', 'not_covered', 'incomplete', 'acknowledged', 'created', 'reused', 'blocked', 'failed']),
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
