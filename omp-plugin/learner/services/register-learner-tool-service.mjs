import { CATEGORIES, NON_RECORDING_CATEGORIES, RECORD_TOOL_NAME } from '../constants.mjs';
import BaseService from '../lib/base-service.mjs';
import { normalizeCategory } from '../lib/normalize-category.mjs';
import AddCandidateService from './add-candidate-service.mjs';

export class RegisterLearnerToolService extends BaseService {
  constructor(pi, storeRepository) {
    super();
    this.pi = pi;
    this.storeRepository = storeRepository;
  }

  perform() {
    this.pi.registerTool?.({
      name: RECORD_TOOL_NAME,
      label: 'Record Learner Candidate',
      description: 'Record one human-reviewed learner candidate from enabled automatic feedback triage. Use only for high-confidence durable guidance; never for verifier evidence review or one-off wording nits.',
      defaultInactive: true,
      approval: 'write',
      parameters: this.#toolSchema(),
      execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => this.#executeRecordCandidate(params, ctx),
    });
  }

  async #executeRecordCandidate(params, ctx) {
    const category = normalizeCategory(params.category);
    if (NON_RECORDING_CATEGORIES.has(category)) return this.#skippedCandidateResult(category);

    const filePath = this.#storePathFor(ctx);
    const store = this.storeRepository.read(filePath);
    const candidate = AddCandidateService.perform(store, this.#candidateParams(params));
    this.storeRepository.write(store, filePath);

    return {
      content: [{ type: 'text', text: `Stored pending learner candidate ${candidate.id} for human review.` }],
      details: { id: candidate.id, category: candidate.category },
    };
  }

  #candidateParams(params) {
    return {
      ...params,
      evidence: params.evidence || params.promptExcerpt || params.proposedRule,
      provenance: params.provenance || { kind: 'observed_user_feedback', reference: 'enabled learner observation' },
    };
  }

  #toolSchema() {
    const z = this.pi.zod?.z;
    if (!z) return {};

    return z.object({
      category: z.enum([...CATEGORIES]).describe('Learner category'),
      proposedRule: z.string().describe('Durable rule or guidance to remember'),
      scope: z.string().optional().describe('Scope where the guidance applies'),
      rationale: z.string().optional().describe('Why this is durable feedback'),
      suggestedDestination: z.string().optional().describe('Likely memory, workflow, or rule destination'),
      evidence: z.string().optional().describe('Redacted bounded user feedback excerpt'),
      provenance: z.object({
        kind: z.string().describe('diff, staged_files, commit_hash, local_committing_doc, or observed_user_feedback'),
        reference: z.string().describe('Visible source reference'),
      }).optional(),
      confidence: z.string().optional(),
      whenNotToApply: z.string().optional(),
      relationshipToExistingGuidance: z.string().optional(),
    });
  }

  #skippedCandidateResult(category) {
    return {
      content: [{ type: 'text', text: `No learner candidate recorded for ${category}.` }],
      details: { recorded: false, category },
    };
  }

  #storePathFor(ctx) {
    return this.storeRepository.path(process.env, ctx?.agentDir || this.pi.pi?.getAgentDir?.());
  }
}

export default RegisterLearnerToolService;
