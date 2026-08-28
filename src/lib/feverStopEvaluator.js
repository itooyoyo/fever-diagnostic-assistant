import { FINDING_STATES } from './clinicalContext.js'
import { getFindingState, hasAnyPresent } from './feverAdaptiveContext.js'

export const STOP_REASONS = Object.freeze({
  CANDIDATE_SUPPORTED: 'candidate_supported',
  TESTING_REQUIRED: 'testing_required',
  PHYSICAL_EXAM_REQUIRED: 'physical_exam_required',
  INSUFFICIENT_INFORMATION: 'insufficient_information',
  CONFLICTING_INFORMATION: 'conflicting_information',
  OUTSIDE_SCOPE: 'outside_scope',
  CONTINUE_QUESTIONS: 'continue_questions',
})

export function evaluateAdaptiveStop(normalizedClinicalContext, selection) {
  const reasons = []
  const nextActions = []
  const dataQuality = normalizedClinicalContext.dataQuality || {}

  if ((dataQuality.conflicts || []).length > 0) {
    reasons.push(STOP_REASONS.CONFLICTING_INFORMATION)
    nextActions.push('入力矛盾を確認')
  }

  if (hasAnyPresent(normalizedClinicalContext, [
    'vitals.shock',
    'vitals.lowSpo2',
    'infectionPatterns.positiveBloodCulture',
    'physicalFindings.meningealSigns',
    'physicalFindings.necrotizingSkinConcern',
  ])) {
    reasons.push(STOP_REASONS.TESTING_REQUIRED)
    nextActions.push('血液培養、乳酸、画像、専門科相談を検討')
  }

  if (hasAnyPresent(normalizedClinicalContext, [
    'symptomDomains.respiratory.domainSelected',
    'symptomDomains.urinary.domainSelected',
    'symptomDomains.abdominal.painDomainSelected',
    'symptomDomains.skinSoftTissue.domainSelected',
    'symptomDomains.boneJoint.domainSelected',
  ])) {
    reasons.push(STOP_REASONS.PHYSICAL_EXAM_REQUIRED)
    nextActions.push('局所身体所見を確認')
  }

  if ((selection?.roundQuestions || []).length === 0) {
    reasons.push(STOP_REASONS.INSUFFICIENT_INFORMATION)
    nextActions.push('主症候domainまたは基本バイタルを確認')
  }

  if (
    getFindingState(normalizedClinicalContext, 'vitals.bt') === FINDING_STATES.NOT_ASSESSED &&
    getFindingState(normalizedClinicalContext, 'inflammation.crp') === FINDING_STATES.NOT_ASSESSED
  ) {
    reasons.push(STOP_REASONS.INSUFFICIENT_INFORMATION)
    nextActions.push('BTまたはCRPなど初期情報を確認')
  }

  if (reasons.length === 0) {
    reasons.push(STOP_REASONS.CONTINUE_QUESTIONS)
    nextActions.push('最大3問の追加質問を提示')
  }

  return {
    shouldStopQuestioning: reasons.some((reason) => reason !== STOP_REASONS.CONTINUE_QUESTIONS),
    reasons: [...new Set(reasons)],
    nextActions: [...new Set(nextActions)],
  }
}
