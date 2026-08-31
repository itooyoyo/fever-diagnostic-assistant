import { CANDIDATE_REGISTRY, CANDIDATE_STATUS, CANDIDATE_TIERS } from './candidateRegistry.js'
import { FINDING_STATES, normalizeClinicalContext } from './clinicalContext.js'
import { buildAdaptiveContext, getFindingState } from './feverAdaptiveContext.js'
import { ADAPTIVE_QUESTION_REGISTRY, PRIORITY_CLASS, RELEVANCE } from './feverQuestionRegistry.js'

export const PROGRESSIVE_CANDIDATE_STATES = Object.freeze({
  UNASSESSED: 'unassessed',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL_WATCH: 'critical_watch',
})

export const EVIDENCE_EFFECTS = Object.freeze({
  STRONG_SUPPORT: 'strongSupport',
  SUPPORT: 'support',
  WEAK_SUPPORT: 'weakSupport',
  NEUTRAL: 'neutral',
  WEAK_CONTRADICTION: 'weakContradiction',
  STRONG_CONTRADICTION: 'strongContradiction',
})

export const PRIOR_MODEL = Object.freeze({
  COMMON: 'common',
  CONTEXTUAL: 'contextual',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  MAJOR_WATCH: 'major_watch',
})

const SHADOW_ONLY_CANDIDATES = Object.freeze([
  shadowCandidate('pericarditis', '心膜炎', 'chest', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.cardiopulmonary.chestPain', 'physicalFindings.ecgAbnormality', 'physicalFindings.troponinElevation'],
    suggestedTests: ['心電図', '心エコー', 'トロポニン', '炎症反応'],
    safetyNotes: ['胸痛を伴う炎症では心膜炎を鑑別に保持する。'],
  }),
  shadowCandidate('viral_infection', 'ウイルス感染症', 'viral', CANDIDATE_TIERS.SUPPORTING, {
    supportingFindings: ['vitals.fever', 'symptomDomains.constitutional.malaise', 'hematology.leukopenia'],
    suggestedTests: ['流行状況確認', '必要に応じて抗原/PCR検査', '経時的評価'],
    safetyNotes: ['ウイルス感染症候補があっても重症感染症や非感染症の評価を隠さない。'],
  }),
])

const SCORE_DELTA = Object.freeze({
  [EVIDENCE_EFFECTS.STRONG_SUPPORT]: 34,
  [EVIDENCE_EFFECTS.SUPPORT]: 22,
  [EVIDENCE_EFFECTS.WEAK_SUPPORT]: 10,
  [EVIDENCE_EFFECTS.NEUTRAL]: 0,
  [EVIDENCE_EFFECTS.WEAK_CONTRADICTION]: -8,
  [EVIDENCE_EFFECTS.STRONG_CONTRADICTION]: -18,
})

const PRIOR_SCORE = Object.freeze({
  [PRIOR_MODEL.COMMON]: 18,
  [PRIOR_MODEL.CONTEXTUAL]: 18,
  [PRIOR_MODEL.UNCOMMON]: 10,
  [PRIOR_MODEL.RARE]: 4,
  [PRIOR_MODEL.MAJOR_WATCH]: 8,
})

const TIER_BONUS = Object.freeze({
  [CANDIDATE_TIERS.CRITICAL]: 10,
  [CANDIDATE_TIERS.HIGH]: 6,
  [CANDIDATE_TIERS.MODERATE]: 2,
  [CANDIDATE_TIERS.SUPPORTING]: 0,
})

const FEVER_ONLY_PRIMARY = new Set(['bacteremia', 'pneumonia', 'pyelonephritis'])
const FEVER_ONLY_SUPPORTING = new Set(['acute_cholangitis', 'cellulitis', 'drug_fever', 'pmr_gca', 'tumor_fever'])
const AFEBRILE_CRP_PRIORITY = new Set([
  'infective_endocarditis',
  'vertebral_osteomyelitis',
  'deep_infectious_focus',
  'pulmonary_tuberculosis',
  'pmr_gca',
  'intravascular_lymphoma',
  'tumor_fever',
  'drug_fever',
  'dvt_pe',
])
const CRP_BACTERIAL_SUPPORT = new Set([
  'bacteremia',
  'infective_endocarditis',
  'deep_infectious_focus',
  'acute_cholangitis',
  'pyelonephritis',
  'pneumonia',
  'vertebral_osteomyelitis',
  'intra_abdominal_abscess',
  'septic_arthritis',
])
const CHEST_CANDIDATES = new Set(['pericarditis', 'myocarditis', 'pleuritis', 'dvt_pe', 'aortic_disease'])
const TICK_CANDIDATES = new Set(['sfts', 'japanese_spotted_fever', 'scrub_typhus'])
const TRAVEL_CANDIDATES = new Set(['malaria', 'dengue', 'chikungunya'])
const NONSPECIFIC_FINDINGS = new Set(['vitals.fever', 'inflammation.highCrp', 'inflammation.highWbc'])
const CRP_CONTEXT_LIMITED_CANDIDATES = new Set([
  'pneumonia',
  'bacteremia',
  'pyelonephritis',
  'acute_cholangitis',
  'intra_abdominal_abscess',
  'septic_arthritis',
])

export function buildCandidateUniverse() {
  return [...CANDIDATE_REGISTRY, ...SHADOW_ONLY_CANDIDATES]
}

export function buildProgressiveNarrowingShadow(rawAnswers = {}, options = {}) {
  const normalizedClinicalContext = options.normalizedClinicalContext || normalizeClinicalContext(rawAnswers, options)
  const adaptiveContext = buildAdaptiveContext(normalizedClinicalContext)
  const candidates = buildCandidateUniverse().map((candidate) => scoreCandidate(candidate, normalizedClinicalContext))
  const sortedCandidates = candidates.toSorted((a, b) => b.score - a.score || tierRank(b.tier) - tierRank(a.tier) || a.displayName.localeCompare(b.displayName))
  const presentation = mapPresentation(sortedCandidates)
  const discriminationQuestions = buildDiscriminationQuestions(sortedCandidates, normalizedClinicalContext, options)

  return {
    mode: 'progressive-shadow',
    productionChanged: false,
    normalizedClinicalContext,
    activeDomains: adaptiveContext.activeDomains,
    candidateUniverseCount: candidates.length,
    registryCandidateCount: CANDIDATE_REGISTRY.length,
    shadowOnlyCandidateCount: SHADOW_ONLY_CANDIDATES.length,
    candidates: sortedCandidates,
    presentation,
    discriminationQuestions,
    nextQuestions: discriminationQuestions,
    hardExclusions: [],
    noHardExclusionFindings: [
      'afebrile',
      'normal_or_low_crp',
      'normal_wbc',
      'cough_absent',
      'urinary_symptoms_absent',
      'rash_absent',
      'eschar_absent',
      'periodic_fever_absent',
    ],
    insufficientInformationBehavior: 'provisional_result_with_unassessed_candidates',
    invariants: {
      singleNegativeDoesNotRemoveCandidate: true,
      unknownIsNotAbsent: true,
      absentIsNotUnknown: true,
      roundQuestionCap: 3,
      productionRankingUnchanged: true,
    },
  }
}

function scoreCandidate(candidate, context) {
  const evidence = []
  const baseScore = (PRIOR_SCORE[getPrior(candidate, context)] || 0) + (TIER_BONUS[candidate.tier] || 0)

  for (const findingPath of candidate.supportingFindings || []) {
    const state = getFindingState(context, findingPath)
    const label = labelForFinding(findingPath)
    if (state === FINDING_STATES.PRESENT) {
      const effect = effectForSupport(candidate, findingPath)
      evidence.push(evidenceItem(effect, findingPath, label, state))
    } else if (state === FINDING_STATES.ABSENT) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_CONTRADICTION, findingPath, label, state))
    } else {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.NEUTRAL, findingPath, label, state))
    }
  }

  const contextEvidence = []
  addInitialProblemEvidence(candidate, context, contextEvidence)
  addChestEvidence(candidate, context, contextEvidence)
  addTickEvidence(candidate, context, contextEvidence)
  addTravelEvidence(candidate, context, contextEvidence)

  evidence.push(...contextEvidence)
  const dedupedEvidence = dedupeEvidence(evidence)
  const score = baseScore + dedupedEvidence.reduce((sum, item) => sum + (SCORE_DELTA[item.effect] || 0), 0)
  const positiveCount = dedupedEvidence.filter((item) => supportEffects.has(item.effect)).length
  const evidenceCompleteness = deriveEvidenceCompleteness(candidate, context)

  const state = deriveCandidateState(candidate, score, positiveCount)
  const band = deriveBand(candidate, context, state, score, positiveCount)

  return {
    id: candidate.id,
    displayName: candidate.displayName,
    category: candidate.category,
    tier: candidate.tier,
    status: candidate.status,
    majorCandidate: Boolean(candidate.majorCandidate),
    shadowOnly: Boolean(candidate.shadowOnly),
    prior: getPrior(candidate, context),
    score,
    state,
    band,
    removed: false,
    movement: positiveCount > 0 ? 'up' : score < baseScore ? 'down' : 'unchanged',
    supportingFindings: dedupedEvidence.filter((item) => supportEffects.has(item.effect)),
    weakContradictions: dedupedEvidence.filter((item) => contradictionEffects.has(item.effect)),
    unknownImportantFindings: dedupedEvidence.filter((item) => item.effect === EVIDENCE_EFFECTS.NEUTRAL && isImportantUnknown(candidate, item.path)),
    evidence: dedupedEvidence,
    evidenceCompleteness,
    suggestedTests: candidate.suggestedTests || [],
    safetyNotes: candidate.safetyNotes || [],
    productionConnection: 'shadow_only',
  }
}

const supportEffects = new Set([EVIDENCE_EFFECTS.STRONG_SUPPORT, EVIDENCE_EFFECTS.SUPPORT, EVIDENCE_EFFECTS.WEAK_SUPPORT])
const contradictionEffects = new Set([EVIDENCE_EFFECTS.WEAK_CONTRADICTION, EVIDENCE_EFFECTS.STRONG_CONTRADICTION])

function getPrior(candidate, context) {
  if (candidate.majorCandidate) return PRIOR_MODEL.MAJOR_WATCH
  if (isHighCrp(context) && AFEBRILE_CRP_PRIORITY.has(candidate.id)) return PRIOR_MODEL.CONTEXTUAL
  if (FEVER_ONLY_PRIMARY.has(candidate.id)) return PRIOR_MODEL.COMMON
  if (FEVER_ONLY_SUPPORTING.has(candidate.id)) return PRIOR_MODEL.CONTEXTUAL
  if (candidate.status === CANDIDATE_STATUS.FUTURE_PHASE || candidate.shadowOnly) return PRIOR_MODEL.RARE
  return PRIOR_MODEL.UNCOMMON
}

function addInitialProblemEvidence(candidate, context, evidence) {
  if (isFeverPresent(context) && FEVER_ONLY_PRIMARY.has(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱', FINDING_STATES.PRESENT))
  }
  if (isFeverPresent(context) && FEVER_ONLY_SUPPORTING.has(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱', FINDING_STATES.PRESENT))
  }
  if (isHighCrp(context) && CRP_BACTERIAL_SUPPORT.has(candidate.id)) {
    evidence.push(evidenceItem(effectForCrpContext(candidate, context), 'inflammation.highCrp', 'CRP高値', FINDING_STATES.PRESENT))
  }
  if (isHighCrp(context) && ['drug_fever', 'pmr', 'pmr_gca', 'tumor_fever', 'intravascular_lymphoma', 'cppd', 'tafro'].includes(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.highCrp', 'CRP高値', FINDING_STATES.PRESENT))
  }
  if (isAfebrile(context) && AFEBRILE_CRP_PRIORITY.has(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '現在無熱でも保持', FINDING_STATES.ABSENT))
  }
}

function dedupeEvidence(evidence) {
  const strongestByPath = new Map()
  for (const item of evidence) {
    const current = strongestByPath.get(item.path)
    if (!current || evidenceStrength(item.effect) > evidenceStrength(current.effect)) {
      strongestByPath.set(item.path, item)
    }
  }
  return [...strongestByPath.values()]
}

function evidenceStrength(effect) {
  return {
    [EVIDENCE_EFFECTS.STRONG_SUPPORT]: 5,
    [EVIDENCE_EFFECTS.SUPPORT]: 4,
    [EVIDENCE_EFFECTS.WEAK_SUPPORT]: 3,
    [EVIDENCE_EFFECTS.NEUTRAL]: 2,
    [EVIDENCE_EFFECTS.WEAK_CONTRADICTION]: 1,
    [EVIDENCE_EFFECTS.STRONG_CONTRADICTION]: 0,
  }[effect] ?? 2
}

function effectForCrpContext(candidate, context) {
  if (!CRP_CONTEXT_LIMITED_CANDIDATES.has(candidate.id)) return EVIDENCE_EFFECTS.SUPPORT
  return hasSpecificSupport(candidate, context) ? EVIDENCE_EFFECTS.SUPPORT : EVIDENCE_EFFECTS.WEAK_SUPPORT
}

function hasSpecificSupport(candidate, context) {
  return (candidate.supportingFindings || [])
    .filter((findingPath) => !NONSPECIFIC_FINDINGS.has(findingPath))
    .some((findingPath) => getFindingState(context, findingPath) === FINDING_STATES.PRESENT)
}

function deriveEvidenceCompleteness(candidate, context) {
  const discriminatingFindings = (candidate.supportingFindings || []).filter((findingPath) => !NONSPECIFIC_FINDINGS.has(findingPath))
  const counts = { evaluated: 0, supporting: 0, contradictory: 0, notAssessed: 0, unknown: 0 }
  for (const findingPath of discriminatingFindings) {
    const state = getFindingState(context, findingPath)
    if (state === FINDING_STATES.PRESENT) {
      counts.evaluated += 1
      counts.supporting += 1
    } else if (state === FINDING_STATES.ABSENT) {
      counts.evaluated += 1
      counts.contradictory += 1
    } else if (state === FINDING_STATES.UNKNOWN || state === FINDING_STATES.INDETERMINATE) {
      counts.unknown += 1
    } else {
      counts.notAssessed += 1
    }
  }
  const ratio = discriminatingFindings.length === 0 ? 0 : counts.evaluated / discriminatingFindings.length
  const level = ratio >= 0.67 ? 'substantial' : ratio >= 0.34 ? 'partial' : 'minimal'
  return { ...counts, total: discriminatingFindings.length, level }
}

function addChestEvidence(candidate, context, evidence) {
  if (!CHEST_CANDIDATES.has(candidate.id)) return
  if (getFindingState(context, 'symptomDomains.cardiopulmonary.domainSelected') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.cardiopulmonary.domainSelected', '胸部症状domain', FINDING_STATES.PRESENT))
  }
  if (getFindingState(context, 'symptomDomains.cardiopulmonary.chestPain') === FINDING_STATES.PRESENT || getFindingState(context, 'symptomDomains.respiratory.chestPain') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', FINDING_STATES.PRESENT))
  }
  if (getFindingState(context, 'symptomDomains.respiratory.dyspnea') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.respiratory.dyspnea', '呼吸困難', FINDING_STATES.PRESENT))
  }
  if (getFindingState(context, 'symptomDomains.cardiopulmonary.thoracodorsalPain') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'symptomDomains.cardiopulmonary.thoracodorsalPain', '胸背部痛', FINDING_STATES.PRESENT))
  }
}

function addTickEvidence(candidate, context, evidence) {
  if (!TICK_CANDIDATES.has(candidate.id)) return
  for (const path of ['exposures.outdoorExposure', 'exposures.tickExposure', 'exposures.knownTickBite', 'exposures.eschar', 'physicalFindings.rash', 'hematology.thrombocytopenia', 'electrolytes.hyponatremia']) {
    const state = getFindingState(context, path)
    if (state === FINDING_STATES.PRESENT) evidence.push(evidenceItem(effectForTick(path), path, labelForFinding(path), state))
    if (state === FINDING_STATES.ABSENT && ['exposures.knownTickBite', 'exposures.eschar', 'physicalFindings.rash'].includes(path)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_CONTRADICTION, path, `${labelForFinding(path)}なし`, state))
    }
  }
  if (context.rawAnswers?.unknownThrombocytopenia === true) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'hematology.thrombocytopenia', '血小板低下の確認が必要', FINDING_STATES.UNKNOWN))
  }
}

function addTravelEvidence(candidate, context, evidence) {
  if (!TRAVEL_CANDIDATES.has(candidate.id)) return
  const travelState = getFindingState(context, 'exposures.internationalTravel.state')
  if (travelState === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'exposures.internationalTravel.state', '海外渡航/滞在あり', travelState))
  } else if (travelState === FINDING_STATES.ABSENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_CONTRADICTION, 'exposures.internationalTravel.state', '海外渡航/滞在なし', travelState))
  }

  const riskPaths = {
    malaria: 'exposures.internationalTravel.regionClassifications.malariaRiskArea',
    dengue: 'exposures.internationalTravel.regionClassifications.dengueRiskArea',
    chikungunya: 'exposures.internationalTravel.regionClassifications.chikungunyaRiskArea',
  }
  if (getFindingState(context, riskPaths[candidate.id]) === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, riskPaths[candidate.id], '地域リスク分類あり', FINDING_STATES.PRESENT))
  }
  if (candidate.id === 'malaria' && getFindingState(context, 'infectionPatterns.chills') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'infectionPatterns.chills', '悪寒戦慄', FINDING_STATES.PRESENT))
  }
  if (['malaria', 'dengue'].includes(candidate.id) && getFindingState(context, 'hematology.thrombocytopenia') === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'hematology.thrombocytopenia', '血小板低下', FINDING_STATES.PRESENT))
  }
}

function effectForSupport(candidate, findingPath) {
  if (candidate.tier === CANDIDATE_TIERS.CRITICAL) return EVIDENCE_EFFECTS.SUPPORT
  if (findingPath.includes('positiveBloodCulture') || findingPath.includes('bloodCultureStaphAureus') || findingPath.includes('bloodCultureCandida')) return EVIDENCE_EFFECTS.STRONG_SUPPORT
  return EVIDENCE_EFFECTS.SUPPORT
}

function effectForTick(path) {
  if (['exposures.tickExposure', 'exposures.knownTickBite', 'exposures.eschar'].includes(path)) return EVIDENCE_EFFECTS.SUPPORT
  return EVIDENCE_EFFECTS.WEAK_SUPPORT
}

function deriveCandidateState(candidate, score, positiveCount) {
  if (candidate.majorCandidate && score >= 26) return PROGRESSIVE_CANDIDATE_STATES.CRITICAL_WATCH
  if (score >= 70 || positiveCount >= 3) return PROGRESSIVE_CANDIDATE_STATES.HIGH
  if (score >= 42 || positiveCount >= 2) return PROGRESSIVE_CANDIDATE_STATES.MODERATE
  if (score >= 14 || positiveCount >= 1) return PROGRESSIVE_CANDIDATE_STATES.LOW
  return PROGRESSIVE_CANDIDATE_STATES.UNASSESSED
}

function deriveBand(candidate, context, state, score, positiveCount) {
  if (isFeverPresent(context) && FEVER_ONLY_PRIMARY.has(candidate.id)) return 'primary'
  if (candidate.majorCandidate && state === PROGRESSIVE_CANDIDATE_STATES.CRITICAL_WATCH) return 'importantCompeting'
  if (score >= 42 || positiveCount >= 3) return 'primary'
  if (score >= 30 || positiveCount >= 1) return 'supporting'
  if (candidate.majorCandidate) return 'importantCompeting'
  if (state === PROGRESSIVE_CANDIDATE_STATES.UNASSESSED) return 'other'
  return 'lowerPriority'
}

function mapPresentation(candidates) {
  return {
    primary: candidates.filter((item) => item.band === 'primary').slice(0, 5),
    supporting: candidates.filter((item) => item.band === 'supporting').slice(0, 7),
    importantCompeting: candidates.filter((item) => item.band === 'importantCompeting').slice(0, 10),
    lowerPriority: candidates.filter((item) => item.band === 'lowerPriority').slice(0, 10),
    other: candidates.filter((item) => item.band === 'other'),
  }
}

function buildDiscriminationQuestions(candidates, context, options) {
  const limit = Math.min(3, Math.max(0, Number(options.limit) || 3))
  const topCandidateIds = new Set(candidates.slice(0, 14).map((candidate) => candidate.id))

  const registryQuestions = ADAPTIVE_QUESTION_REGISTRY
    .map((question) => scoreDiscriminationQuestion(question, context, topCandidateIds, options))
    .filter((item) => item.eligible)
  const productionQuestions = [
    ...buildTravelGateQuestions(context),
    ...buildTravelDetailQuestions(context, topCandidateIds),
    ...buildChestDetailQuestions(context, topCandidateIds),
  ]

  return uniqueQuestionsById([...productionQuestions, ...registryQuestions])
    .toSorted((a, b) => b.informationValue - a.informationValue || a.id.localeCompare(b.id))
    .slice(0, limit)
}

function uniqueQuestionsById(questions) {
  const seen = new Set()
  return questions.filter((question) => {
    if (seen.has(question.id)) return false
    seen.add(question.id)
    return true
  })
}

function buildTravelGateQuestions(context) {
  if (getFindingState(context, 'exposures.internationalTravel.state') !== FINDING_STATES.NOT_ASSESSED) return []
  return [
    {
      id: 'q_travel_recent',
      label: '最近、海外への渡航・滞在がありましたか？',
      domain: 'internationalTravel',
      findingId: 'exposures.internationalTravel.state',
      answerType: 'findingState',
      options: findingStateOptions(),
      sourceCandidates: ['malaria', 'dengue', 'chikungunya'],
      informationValue: 120,
      candidateEffects: { malaria: EVIDENCE_EFFECTS.WEAK_SUPPORT, dengue: EVIDENCE_EFFECTS.WEAK_SUPPORT, chikungunya: EVIDENCE_EFFECTS.WEAK_SUPPORT },
      selectionReasons: ['渡航関連感染症の入口確認'],
      eligible: true,
    },
  ]
}

function buildTravelDetailQuestions(context, topCandidateIds) {
  if (getFindingState(context, 'exposures.internationalTravel.state') !== FINDING_STATES.PRESENT) return []
  const travelCandidateVisible = ['malaria', 'dengue', 'chikungunya'].some((id) => topCandidateIds.has(id))
  if (!travelCandidateVisible) return []
  const travel = context.exposures.internationalTravel
  const questions = []
  if (travel.countryText.state !== FINDING_STATES.PRESENT) {
    questions.push({
      id: 'q_travel_country_region',
      label: 'どの国・地域に滞在しましたか？',
      domain: 'internationalTravel',
      findingId: 'exposures.internationalTravel.countryText',
      answerType: 'text',
      sourceCandidates: ['malaria', 'dengue', 'chikungunya'],
      informationValue: 119,
      candidateEffects: { malaria: EVIDENCE_EFFECTS.NEUTRAL, dengue: EVIDENCE_EFFECTS.NEUTRAL, chikungunya: EVIDENCE_EFFECTS.NEUTRAL },
      selectionReasons: ['渡航関連感染症の地域分類を確認'],
      eligible: true,
    })
  }
  if (travel.returnDate.state !== FINDING_STATES.PRESENT) {
    questions.push({
      id: 'q_travel_return_timing',
      label: 'いつ頃滞在・帰国しましたか？',
      domain: 'internationalTravel',
      findingId: 'exposures.internationalTravel.returnDate',
      answerType: 'date',
      sourceCandidates: ['malaria', 'dengue', 'chikungunya'],
      informationValue: 118,
      candidateEffects: { malaria: EVIDENCE_EFFECTS.WEAK_SUPPORT, dengue: EVIDENCE_EFFECTS.WEAK_SUPPORT, chikungunya: EVIDENCE_EFFECTS.WEAK_SUPPORT },
      selectionReasons: ['帰国時期から検査タイミングを整理'],
      eligible: true,
    })
  }
  return questions
}

function buildChestDetailQuestions(context, topCandidateIds) {
  if (getFindingState(context, 'symptomDomains.cardiopulmonary.domainSelected') !== FINDING_STATES.PRESENT) return []
  const chestCandidateVisible = ['pericarditis', 'myocarditis', 'pleuritis', 'dvt_pe', 'aortic_disease'].some((id) => topCandidateIds.has(id))
  if (!chestCandidateVisible) return []
  const questions = []
  if (getFindingState(context, 'symptomDomains.cardiopulmonary.chestPain') === FINDING_STATES.NOT_ASSESSED) {
    questions.push({
      id: 'q_chest_pain_character',
      label: '胸痛、胸背部痛、呼吸困難がありますか？',
      domain: 'chest',
      findingId: 'symptomDomains.cardiopulmonary.chestPain',
      answerType: 'findingState',
      options: findingStateOptions(),
      sourceCandidates: ['pericarditis', 'myocarditis', 'pleuritis', 'dvt_pe', 'aortic_disease'],
      informationValue: 92,
      candidateEffects: { pericarditis: EVIDENCE_EFFECTS.SUPPORT, myocarditis: EVIDENCE_EFFECTS.SUPPORT, pleuritis: EVIDENCE_EFFECTS.SUPPORT, dvt_pe: EVIDENCE_EFFECTS.SUPPORT, aortic_disease: EVIDENCE_EFFECTS.SUPPORT },
      selectionReasons: ['胸部domainの重要候補を分離'],
      eligible: true,
    })
  }
  if (getFindingState(context, 'physicalFindings.ecgAbnormality') === FINDING_STATES.NOT_ASSESSED) {
    questions.push({
      id: 'q_chest_ecg_troponin',
      label: '心電図異常またはトロポニン上昇がありますか？',
      domain: 'chest',
      findingId: 'physicalFindings.ecgAbnormality',
      answerType: 'findingState',
      options: findingStateOptions(),
      sourceCandidates: ['pericarditis', 'myocarditis'],
      informationValue: 88,
      candidateEffects: { pericarditis: EVIDENCE_EFFECTS.SUPPORT, myocarditis: EVIDENCE_EFFECTS.SUPPORT },
      selectionReasons: ['心膜炎・心筋炎を分離'],
      eligible: true,
    })
  }
  return questions
}

function findingStateOptions() {
  return [
    { value: 'present', label: 'あり' },
    { value: 'absent', label: 'なし' },
    { value: 'unknown', label: '不明' },
    { value: 'not_assessed', label: '未評価' },
    { value: 'indeterminate', label: '判定困難' },
  ]
}

function scoreDiscriminationQuestion(question, context, topCandidateIds, options) {
  const candidateStatus = question.activationRequirements?.candidateStatus || CANDIDATE_STATUS.ACTIVE
  if (candidateStatus !== CANDIDATE_STATUS.ACTIVE && !options.allowFuturePhaseQuestions) return { ...question, eligible: false }
  if (question.id === 'q_travel_region_timing') {
    return {
      ...question,
      answerType: 'travelRegionTiming',
      shadowSchema: { state: 'findingState', travelRegion: 'controlledClassification', travelTiming: 'daysSinceReturn' },
      eligible: false,
      ineligibleReason: 'not a yes/no finding-state question in shadow schema',
    }
  }
  if ([FINDING_STATES.PRESENT, FINDING_STATES.ABSENT, FINDING_STATES.UNKNOWN, FINDING_STATES.INDETERMINATE].includes(getFindingState(context, question.findingId))) {
    return { ...question, eligible: false }
  }

  const matchedCandidates = question.sourceCandidates.filter((id) => topCandidateIds.has(id))
  const candidateEffects = Object.fromEntries(question.sourceCandidates.map((id) => [id, matchedCandidates.includes(id) ? EVIDENCE_EFFECTS.SUPPORT : EVIDENCE_EFFECTS.NEUTRAL]))
  const priorityValue = {
    [PRIORITY_CLASS.CRITICAL]: 80,
    [PRIORITY_CLASS.DISCRIMINATION_HIGH]: 60,
    [PRIORITY_CLASS.CURRENT_CONTEXT_HIGH]: 50,
    [PRIORITY_CLASS.MODERATE]: 35,
    [PRIORITY_CLASS.LOW]: 20,
  }[question.priorityClass] || 0
  const informationValue = priorityValue + matchedCandidates.length * 12 + (question.safetyRole ? 10 : 0)

  return {
    ...question,
    eligible: matchedCandidates.length > 0 || question.priorityClass === PRIORITY_CLASS.CRITICAL,
    relevance: matchedCandidates.length > 0 ? RELEVANCE.HIGH : RELEVANCE.MEDIUM,
    informationValue,
    candidateEffects,
    selectionReasons: [
      matchedCandidates.length > 0 ? `上位候補 ${matchedCandidates.join(', ')} の順位を分離` : 'critical safety question',
      question.safetyRole ? `safety role: ${question.safetyRole}` : null,
    ].filter(Boolean),
  }
}

function isImportantUnknown(candidate, path) {
  return candidate.majorCandidate || path.includes('positiveBloodCulture') || path.includes('immunosuppression') || path.includes('Travel')
}

function isFeverPresent(context) {
  return getFindingState(context, 'vitals.fever') === FINDING_STATES.PRESENT
}

function isAfebrile(context) {
  return getFindingState(context, 'vitals.fever') === FINDING_STATES.ABSENT
}

function isHighCrp(context) {
  return getFindingState(context, 'inflammation.highCrp') === FINDING_STATES.PRESENT
}

function evidenceItem(effect, path, label, state) {
  return { effect, path, label, state }
}

function labelForFinding(path) {
  const labels = {
    'vitals.fever': '発熱',
    'vitals.lowSpo2': 'SpO2低下',
    'vitals.hypotension': '低血圧',
    'inflammation.highCrp': 'CRP高値',
    'infectionPatterns.chills': '悪寒戦慄',
    'infectionPatterns.positiveBloodCulture': '血液培養陽性',
    'infectionPatterns.bloodCultureStaphAureus': 'Staphylococcus aureus',
    'infectionPatterns.bloodCultureCandida': 'Candida',
    'symptomDomains.respiratory.cough': '咳',
    'symptomDomains.respiratory.sputum': '痰',
    'symptomDomains.respiratory.dyspnea': '呼吸困難',
    'symptomDomains.respiratory.chestPain': '胸痛',
    'symptomDomains.cardiopulmonary.chestPain': '胸痛',
    'symptomDomains.cardiopulmonary.thoracodorsalPain': '胸背部痛',
    'physicalFindings.respiratoryImagingAbnormality': '胸部画像異常',
    'physicalFindings.cvaTenderness': 'CVA叩打痛',
    'symptomDomains.backSpine.backPain': '腰背部痛',
    'symptomDomains.neurologic.headache': '頭痛',
    'symptomDomains.neurologic.alteredMentalStatus': '意識障害',
    'physicalFindings.neckStiffness': '項部硬直',
    'physicalFindings.meningealSigns': '髄膜刺激徴候',
    'physicalFindings.rash': '発疹',
    'physicalFindings.severePain': '強い疼痛',
    'physicalFindings.skinNecrosis': '皮膚壊死',
    'symptomDomains.skinSoftTissue.painOutOfProportion': '皮膚所見に比して強い疼痛',
    'hematology.thrombocytopenia': '血小板低下',
    'hematology.leukopenia': '白血球低下',
    'electrolytes.hyponatremia': '低Na',
    'exposures.outdoorExposure': '国内屋外曝露',
    'exposures.tickExposure': 'マダニ曝露',
    'exposures.knownTickBite': 'マダニ刺咬',
    'exposures.eschar': '刺し口/痂皮',
    'exposures.internationalTravel.state': '海外渡航/滞在',
    'exposures.internationalTravel.regionClassifications.malariaRiskArea': 'マラリア流行地域',
    'exposures.internationalTravel.regionClassifications.dengueRiskArea': 'デング流行地域',
    'exposures.internationalTravel.regionClassifications.chikungunyaRiskArea': 'チクングニア流行地域',
  }
  return labels[path] || path.split('.').at(-1)
}

function tierRank(tier) {
  return {
    [CANDIDATE_TIERS.CRITICAL]: 4,
    [CANDIDATE_TIERS.HIGH]: 3,
    [CANDIDATE_TIERS.MODERATE]: 2,
    [CANDIDATE_TIERS.SUPPORTING]: 1,
  }[tier] || 0
}

function shadowCandidate(id, displayName, category, tier, config = {}) {
  return {
    id,
    displayName,
    category,
    tier,
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    majorCandidate: Boolean(config.majorCandidate),
    shadowOnly: true,
    supportingFindings: config.supportingFindings || [],
    contextualFindings: [],
    weakContradictions: [],
    doNotExclude: config.doNotExclude || [],
    nextQuestions: [],
    examinationHints: [],
    suggestedTests: config.suggestedTests || [],
    safetyNotes: config.safetyNotes || [],
    medicalMetadata: { shadowOnly: true, productionConnection: 'none' },
    legacyDependencies: [],
  }
}
