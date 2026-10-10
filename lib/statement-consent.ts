/**
 * Version of the statement-upload consent wording shown on /analyse (components/wallet-simulator/statement-upload.tsx).
 * The backend (Backend/consent_log.py) keeps the exact text for each version and refuses unknown versions.
 * When the wording on the screen changes: add a NEW version in both places, never edit an old one.
 */
export const STATEMENT_CONSENT_VERSION = '2026-10-v1'
