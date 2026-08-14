import type { AnswerProvenance } from './api'

export interface ProvenanceIndicator {
  color: string
  label: string
}

const PROVENANCE_INDICATORS: Record<AnswerProvenance, ProvenanceIndicator> = {
  earnn_grounded: { color: '#176B3A', label: 'Earnnn data supported' },
  earnn_interpreted: { color: '#55A86A', label: 'Earnnn data with AI interpretation' },
  web_grounded: { color: '#D1A400', label: 'External web evidence' },
  llm_unverified: { color: '#D98700', label: 'Unverified AI response' },
  technical_failure: { color: '#C0392B', label: 'Technical failure' },
}

const UNKNOWN_PROVENANCE_INDICATOR: ProvenanceIndicator = {
  color: '#5A6A85',
  label: 'Unknown answer provenance',
}

export function provenanceIndicator(value: unknown): ProvenanceIndicator {
  return typeof value === 'string'
    ? PROVENANCE_INDICATORS[value as AnswerProvenance] ?? UNKNOWN_PROVENANCE_INDICATOR
    : UNKNOWN_PROVENANCE_INDICATOR
}
