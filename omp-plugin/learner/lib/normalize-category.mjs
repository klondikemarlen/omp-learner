import { CATEGORIES } from '../constants.mjs';

export function normalizeCategory(category) {
  return CATEGORIES.has(category) ? category : 'ambiguous_needs_review';
}

export default normalizeCategory;
