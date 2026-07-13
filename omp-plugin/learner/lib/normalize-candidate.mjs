import { COMMIT_CONTEXT_KINDS } from '../constants.mjs';
import { normalizeCategory } from './normalize-category.mjs';
import { redactText } from './redact-text.mjs';

export function normalizeCandidate(candidate) {
  const provenance = normalizeProvenance(candidate);
  const normalized = {
    category: normalizeCategory(candidate.category),
    proposedRule: fieldText(candidate.proposedRule || candidate.rule),
    scope: fieldText(candidate.scope),
    rationale: fieldText(candidate.rationale),
    suggestedDestination: fieldText(candidate.suggestedDestination),
    provenance,
    evidence: provenance.promptExcerpt,
    confidence: fieldText(candidate.confidence),
    whenNotToApply: fieldText(candidate.whenNotToApply),
    relationshipToExistingGuidance: fieldText(candidate.relationshipToExistingGuidance),
  };

  if (normalized.category === 'commit_file_grouping' && !hasVisibleCommitContext(provenance)) {
    normalized.category = 'insufficient_context';
    normalized.rationale = fieldText([
      normalized.rationale,
      'Commit file grouping needs structured provenance.kind of diff, staged_files, commit_hash, or local_committing_doc plus a reference.',
    ].filter(Boolean).join(' '));
  }

  return normalized;
}

function fieldText(value) {
  return redactText(String(value || '').trim());
}

function normalizeProvenance(candidate) {
  const raw = candidate.provenance && typeof candidate.provenance === 'object' ? candidate.provenance : {};
  const kind = String(raw.kind || '').trim();
  const reference = redactText(raw.reference || raw.path || raw.commit || '');
  const promptExcerpt = redactText(candidate.evidence || candidate.promptExcerpt || '');

  return { kind, reference, promptExcerpt };
}

function hasVisibleCommitContext(provenance) {
  return COMMIT_CONTEXT_KINDS.has(provenance.kind) && provenance.reference.length > 0;
}

export default normalizeCandidate;
