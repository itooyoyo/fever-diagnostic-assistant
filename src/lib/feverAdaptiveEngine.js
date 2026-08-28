import { normalizeClinicalContext } from './clinicalContext.js'
import { buildAdaptiveContext } from './feverAdaptiveContext.js'
import { freezeRoundQuestions, selectAdaptiveQuestions } from './feverQuestionSelector.js'
import { evaluateAdaptiveStop } from './feverStopEvaluator.js'

export function buildAdaptiveQuestionShadow(rawAnswers = {}, options = {}) {
  const normalizedClinicalContext = normalizeClinicalContext(rawAnswers, options.normalization || {})
  const adaptiveContext = buildAdaptiveContext(normalizedClinicalContext)
  const selection = selectAdaptiveQuestions(normalizedClinicalContext, {
    limit: options.limit,
    round: options.round || 1,
    allowFuturePhaseQuestions: options.allowFuturePhaseQuestions,
  })
  const frozenRound = freezeRoundQuestions(selection)
  const stopEvaluation = evaluateAdaptiveStop(normalizedClinicalContext, frozenRound)

  return {
    mode: 'shadow',
    normalizedClinicalContext,
    adaptiveContext,
    roundQuestions: frozenRound.roundQuestions,
    shadowQuestionTrace: frozenRound.shadowQuestionTrace,
    stopEvaluation,
    invariants: {
      maxQuestionsPerRound: 3,
      roundFixed: Boolean(frozenRound.frozen),
      legacyOutputMutated: false,
      userVisibleUiChanged: false,
    },
  }
}
