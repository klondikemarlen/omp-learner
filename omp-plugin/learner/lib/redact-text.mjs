import { MAX_EXCERPT } from '../constants.mjs';

export function redactText(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:ghp|github_pat|sk|xox[baprs])[-_][-A-Za-z0-9_]{12,}\b/g, '[redacted-token]')
    .replace(/\b[A-Za-z0-9+/]{32,}={0,2}\b/g, '[redacted-secret]')
    .slice(0, MAX_EXCERPT);
}

export default redactText;
