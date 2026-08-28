import { FINDING_STATES } from './clinicalContext.js'
import { CANDIDATE_STATUS } from './candidateRegistry.js'
import { buildAdaptiveContext, getFindingState } from './feverAdaptiveContext.js'
import { ADAPTIVE_QUESTION_REGISTRY, PRIORITY_CLASS, RELEVANCE } from './feverQuestionRegistry.js'

const PRIORITY_WEIGHT = {
  [PRIORITY_CLASS.CRITICAL]: 500,
  [PRIORITY_CLASS.CURRENT_CONTEXT_HIGH]: 400,
  [PRIORITY_CLASS.DISCRIMINATION_HIGH]: 300,
  [PRIORITY_CLASS.MODERATE]: 200,
  [PRIORITY_CLASS.LOW]: 100,
}

const RELEVANCE_WEIGHT = {
  [RELEVANCE.HIGH]: 80,
  [RELEVANCE.MEDIUM]: 40,
  [RELEVANCE.LOW]: 10,
  [RELEVANCE.NONE]: -1000,
}

const ANSWERED_STATES = new Set([
  FINDING_STATES.PRESENT,
  FINDING_STATES.ABSENT,
  FINDING_STATES.UNKNOWN,
  FINDING_STATES.INDETERMINATE,
])

export function selectAdaptiveQuestions(normalizedClinicalContext, options = {}) {
  const adaptiveContext = buildAdaptiveContext(normalizedClinicalContext)
  const limit = Math.min(3, Math.max(0, Number(options.limit) || 3))
  const allowFuturePhase = Boolean(options.allowFuturePhaseQuestions)
  const scored = ADAPTIVE_QUESTION_REGISTRY
    .map((question) => scoreQuestion(question, adaptiveContext, { allowFuturePhase }))
    .filter((item) => item.eligible)
    .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id))

  const selected = applyDiversity(scored, limit).map((item, index) => ({
    ...item.question,
    round: options.round || 1,
    lockedAtSelection: true,
    rank: index + 1,
    relevance: item.relevance,
    score: item.score,
    selectionReasons: item.reasons,
  }))

  return {
    round: options.round || 1,
    maxQuestions: 3,
    roundQuestions: selected,
    shadowQuestionTrace: scored.map((item) => ({
      id: item.question.id,
      domain: item.question.domain,
      priorityClass: item.question.priorityClass,
      relevance: item.relevance,
      score: item.score,
      eligible: item.eligible,
      reasons: item.reasons,
    })),
    activeDomains: adaptiveContext.activeDomains,
    candidateContext: adaptiveContext.candidateContext,
  }
}

export function freezeRoundQuestions(selection) {
  return {
    ...selection,
    roundQuestions: selection.roundQuestions.slice(0, 3).map((question) => ({
      ...question,
      lockedAtSelection: true,
    })),
    frozen: true,
  }
}

export function scoreQuestion(question, adaptiveContext, options = {}) {
  const { normalizedClinicalContext, activeDomains } = adaptiveContext
  const candidateStatus = question.activationRequirements?.candidateStatus || CANDIDATE_STATUS.ACTIVE
  const state = getFindingState(normalizedClinicalContext, question.findingId)
  const relevance = deriveQuestionRelevance(question, adaptiveContext)
  const reasons = []

  if (candidateStatus !== CANDIDATE_STATUS.ACTIVE && !options.allowFuturePhase) {
    return ineligible(question, relevance, ['inactive candidate question suppressed'])
  }
  if (ANSWERED_STATES.has(state)) {
    return ineligible(question, relevance, [`finding already answered as ${state}`])
  }
  if (relevance === RELEVANCE.NONE) {
    return ineligible(question, relevance, ['no current context relevance'])
  }

  if (activeDomains.includes(question.domain)) reasons.push('active domain')
  if (question.priorityClass === PRIORITY_CLASS.CRITICAL) reasons.push('critical priority')
  if (question.safetyRole) reasons.push(`safety role: ${question.safetyRole}`)

  const score = (PRIORITY_WEIGHT[question.priorityClass] || 0) + (RELEVANCE_WEIGHT[relevance] || 0)
  return { question, eligible: true, relevance, score, reasons }
}

export function deriveQuestionRelevance(question, adaptiveContext) {
  const { activeDomains, candidateContext } = adaptiveContext
  if (activeDomains.includes(question.domain)) return RELEVANCE.HIGH
  if (candidateContext.hasCriticalContext && question.priorityClass === PRIORITY_CLASS.CRITICAL) return RELEVANCE.MEDIUM
  if (activeDomains.includes('systemicNoFocus') && ['bloodstream', 'nonInfectious', 'exposure', 'internationalTravel'].includes(question.domain)) return RELEVANCE.MEDIUM
  if (activeDomains.includes('backSpine') && ['bloodstream', 'boneJoint'].includes(question.domain)) return RELEVANCE.MEDIUM
  if (activeDomains.includes('neurologic') && question.domain === 'neck') return RELEVANCE.MEDIUM
  return RELEVANCE.NONE
}

function applyDiversity(scoredQuestions, limit) {
  const selected = []
  const domainCounts = new Map()
  const candidateCounts = new Map()

  for (const item of scoredQuestions) {
    if (selected.length >= limit) break
    const domainCount = domainCounts.get(item.question.domain) || 0
    const wouldExceedDomain = domainCount >= 2
    const wouldExceedCandidate = item.question.sourceCandidates.some((candidate) => (candidateCounts.get(candidate) || 0) >= 2)
    const safetyException = item.question.priorityClass === PRIORITY_CLASS.CRITICAL && selected.length < limit && selected.length < 2

    if ((wouldExceedDomain || wouldExceedCandidate) && !safetyException) continue

    selected.push(item)
    domainCounts.set(item.question.domain, domainCount + 1)
    for (const candidate of item.question.sourceCandidates) {
      candidateCounts.set(candidate, (candidateCounts.get(candidate) || 0) + 1)
    }
  }

  if (selected.length < limit) {
    for (const item of scoredQuestions) {
      if (selected.includes(item)) continue
      if (selected.length >= limit) break
      selected.push(item)
    }
  }

  return selected.slice(0, 3)
}

function ineligible(question, relevance, reasons) {
  return { question, eligible: false, relevance, score: -Infinity, reasons }
}
