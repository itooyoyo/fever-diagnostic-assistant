export type Tone = 'danger' | 'caution' | 'info' | 'clear' | 'neutral' | 'brady' | 'urgent' | 'stable'

export type ClinicalBlock = {
  title: string
  items: string[]
}

export type ClinicalCard = {
  tone: Tone
  label: string
  title: string
  message?: string
  reasons?: string[]
  evidence?: string[]
  items?: string[]
  tests?: string[]
  recommendedTests?: string[]
  misses?: string[] | string
  blocks?: ClinicalBlock[]
}

export type StepAssessment = {
  cards?: ClinicalCard[]
  hasEmergency?: boolean
  suggestsInfection?: boolean
  hasRelativeBradycardia?: boolean
  considerations?: string[]
}

export type DiagnosticSummaryItem = {
  name: string
  tone: Tone
  category: string
  matchedFindings: string[]
  reasons: string[]
  nextActions: string[]
  score: number
  matchCount: number
  isCritical: boolean
}

export type DiagnosticSummary = {
  redFlags: string[]
  inputWarnings: string[]
  mustNotMiss: DiagnosticSummaryItem[]
  ranking: DiagnosticSummaryItem[]
  notYetExcluded: string[]
  clinicalPearl: { title: string; message: string }
  todayChecklist: string[]
}

export type FeverForm = Record<string, string | number | boolean | string[] | undefined>