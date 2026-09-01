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
  shadowCandidate('heart_failure', '心不全', 'cardiac', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.respiratory.dyspnea', 'vitals.lowSpo2', 'physicalFindings.edema'],
    suggestedTests: ['身体所見', '胸部画像', '心機能評価'],
    safetyNotes: ['CRP上昇があっても心不全を鑑別から消さない。'],
  }),
  shadowCandidate('deep_neck_infection', '深頸部感染症', 'centralNervous', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.neck.acutePain', 'symptomDomains.neck.severePain', 'physicalFindings.limitedNeckRotation', 'infectionPatterns.chills'],
    suggestedTests: ['頸部診察', '頸部画像評価', '感染巣評価'],
    safetyNotes: ['頸部痛のみで上位固定せず、全身炎症や可動域制限と合わせて評価する。'],
  }),
  shadowCandidate('infectious_gastroenteritis', '感染性胃腸炎', 'abdominal', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.abdominal.diarrhea', 'symptomDomains.abdominal.vomiting', 'symptomDomains.abdominal.pain'],
    suggestedTests: ['便検査', '脱水評価', '経時的評価'],
    safetyNotes: ['血便や強い腹痛がある場合は虚血性腸炎なども同時に保持する。'],
  }),
  shadowCandidate('pancreatitis', '膵炎', 'abdominal', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.abdominal.epigastricPain', 'symptomDomains.abdominal.backRadiation', 'symptomDomains.abdominal.vomiting'],
    suggestedTests: ['膵酵素', '腹部画像', '胆石/アルコール背景確認'],
    safetyNotes: ['腹痛が乏しいことだけで完全除外しない。'],
  }),
  shadowCandidate('mesenteric_ischemia', '腸管虚血/腸間膜虚血', 'vascular', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.abdominal.severePain', 'symptomDomains.abdominal.painOutOfProportion', 'symptomDomains.abdominal.bloodyStool', 'vitals.hypotension'],
    suggestedTests: ['乳酸', '造影CT', '外科/血管評価'],
    safetyNotes: ['発熱なし、WBC正常、血便なしだけで腸管虚血を除外しない。'],
  }),
  shadowCandidate('abdominal_vasculitis', '腹部血管炎/炎症性疾患', 'nonInfectiousInflammation', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.abdominal.pain', 'physicalFindings.rash', 'physicalFindings.renalDysfunction', 'symptomDomains.boneJoint.acuteJointPain'],
    suggestedTests: ['尿所見', '腎機能', '自己免疫関連評価'],
    safetyNotes: ['感染症候補と並列に保持し、腹痛＋皮疹＋腎障害を見逃さない。'],
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
  'pericarditis',
  'myocarditis',
  'infective_endocarditis',
  'vertebral_osteomyelitis',
  'deep_infectious_focus',
  'pulmonary_tuberculosis',
  'pmr_gca',
  'cppd',
  'intravascular_lymphoma',
  'tumor_fever',
  'drug_fever',
  'tafro',
  'dvt_pe',
  'aortic_disease',
  'sfts',
  'japanese_spotted_fever',
  'scrub_typhus',
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
const CRP_ONLY_CARDIAC_CANDIDATES = new Set(['pericarditis', 'myocarditis'])
const CRP_ONLY_THROMBOSIS_CANDIDATES = new Set(['dvt_pe'])
const CRP_ONLY_DEEP_SUBACUTE_CANDIDATES = new Set(['deep_infectious_focus', 'infective_endocarditis', 'vertebral_osteomyelitis', 'pulmonary_tuberculosis', 'intra_abdominal_abscess'])
const CRP_ONLY_RHEUM_CANDIDATES = new Set(['pmr', 'pmr_gca', 'noninfectious_lung_disease'])
const CRP_ONLY_MALIGNANCY_CANDIDATES = new Set(['tumor_fever', 'intravascular_lymphoma'])
const CRP_ONLY_DRUG_CANDIDATES = new Set(['drug_fever', 'noninfectious_lung_disease'])
const NO_LOCALIZING_BROAD_CANDIDATES = new Set([
  'bacteremia',
  'infective_endocarditis',
  'deep_infectious_focus',
  'vertebral_osteomyelitis',
  'intra_abdominal_abscess',
  'pulmonary_tuberculosis',
  'sfts',
  'japanese_spotted_fever',
  'scrub_typhus',
  'pmr',
  'pmr_gca',
  'noninfectious_lung_disease',
  'tumor_fever',
  'intravascular_lymphoma',
  'tafro',
  'drug_fever',
  'dvt_pe',
  'pericarditis',
  'myocarditis',
  'aortic_disease',
  'cppd',
])
const RESPIRATORY_BROAD_CANDIDATES = new Set([
  'pneumonia',
  'viral_infection',
  'pleuritis',
  'deep_infectious_focus',
  'pulmonary_tuberculosis',
  'dvt_pe',
  'pericarditis',
  'myocarditis',
  'heart_failure',
  'aortic_disease',
  'noninfectious_lung_disease',
])
const RESPIRATORY_INFECTION_CANDIDATES = new Set(['pneumonia', 'viral_infection', 'pleuritis', 'deep_infectious_focus'])
const ABDOMINAL_BROAD_CANDIDATES = new Set([
  'infectious_gastroenteritis',
  'cdi',
  'acute_cholangitis',
  'acute_cholecystitis',
  'intra_abdominal_abscess',
  'deep_infectious_focus',
  'appendicitis',
  'diverticulitis',
  'pancreatitis',
  'mesenteric_ischemia',
  'aortic_disease',
  'abdominal_vasculitis',
  'pmr_gca',
  'drug_fever',
  'tumor_fever',
  'intravascular_lymphoma',
])
const ABDOMINAL_INFECTION_CANDIDATES = new Set(['infectious_gastroenteritis', 'cdi', 'acute_cholangitis', 'acute_cholecystitis', 'intra_abdominal_abscess', 'deep_infectious_focus', 'appendicitis', 'diverticulitis'])
const BACK_BROAD_CANDIDATES = new Set([
  'vertebral_osteomyelitis',
  'deep_infectious_focus',
  'iliopsoas_abscess',
  'pyelonephritis',
  'infective_endocarditis',
  'aortic_disease',
  'pmr_gca',
  'tumor_fever',
  'intravascular_lymphoma',
])
const JOINT_BROAD_CANDIDATES = new Set([
  'septic_arthritis',
  'cppd',
  'pmr',
  'pmr_gca',
  'abdominal_vasculitis',
  'infective_endocarditis',
  'sfts',
  'japanese_spotted_fever',
  'scrub_typhus',
])
const SKIN_BROAD_CANDIDATES = new Set([
  'cellulitis',
  'necrotizing_fasciitis',
  'diabetic_foot_infection',
  'pressure_ulcer_infection',
  'ssss_tss',
  'sfts',
  'japanese_spotted_fever',
  'scrub_typhus',
  'abdominal_vasculitis',
  'drug_fever',
  'infective_endocarditis',
  'tafro',
  'pmr_gca',
])
const CNS_NECK_BROAD_CANDIDATES = new Set([
  'meningitis',
  'encephalitis',
  'deep_neck_infection',
  'vertebral_osteomyelitis',
  'deep_infectious_focus',
  'infective_endocarditis',
  'bacteremia',
  'pmr',
  'pmr_gca',
  'cppd',
  'crowned_dens_syndrome',
  'abdominal_vasculitis',
  'sfts',
  'japanese_spotted_fever',
  'scrub_typhus',
])
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
      const effect = effectForSupport(candidate, findingPath, context)
      evidence.push(evidenceItem(effect, findingPath, label, state))
    } else if (state === FINDING_STATES.ABSENT) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_CONTRADICTION, findingPath, label, state))
    } else {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.NEUTRAL, findingPath, label, state))
    }
  }

  const contextEvidence = []
  addInitialProblemEvidence(candidate, context, contextEvidence)
  addCrpOnlyRankingEvidence(candidate, context, contextEvidence)
  addNoLocalizingRankingEvidence(candidate, context, contextEvidence)
  addRespiratoryRankingEvidence(candidate, context, contextEvidence)
  addAbdominalRankingEvidence(candidate, context, contextEvidence)
  addBackJointSkinRankingEvidence(candidate, context, contextEvidence)
  addCnsNeckRankingEvidence(candidate, context, contextEvidence)
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
  if ((isHighCrp(context) || isCrpOnlyPattern(context)) && AFEBRILE_CRP_PRIORITY.has(candidate.id)) return PRIOR_MODEL.CONTEXTUAL
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
  if (isAfebrile(context) && AFEBRILE_CRP_PRIORITY.has(candidate.id) && !TICK_CANDIDATES.has(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '現在無熱でも保持', FINDING_STATES.ABSENT))
  }
  if (isCrpOnlyPattern(context) && AFEBRILE_CRP_PRIORITY.has(candidate.id)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'derivedInflammationPattern.crpOnlyPattern', 'CRP-only pattern', FINDING_STATES.PRESENT))
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
  if (isFeverPresent(context) && hasTickSpecificSupport(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱', FINDING_STATES.PRESENT))
  } else if (isAfebrile(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_CONTRADICTION, 'vitals.fever', '発熱なし', FINDING_STATES.ABSENT))
  }
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
  if (candidate.id === 'sfts') {
    addPresentEvidence(context, evidence, 'hematology.leukopenia', '白血球低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.diarrhea', '消化器症状', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.nauseaVomiting', '消化器症状', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.alteredMentalStatus', '意識障害', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', 'AST/ALT上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ldhHigh', 'LDH上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }
  if (['japanese_spotted_fever', 'scrub_typhus'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', 'AST/ALT上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }
}

function addCrpOnlyRankingEvidence(candidate, context, evidence) {
  if (!isCrpOnlyPattern(context)) return
  if (AFEBRILE_CRP_PRIORITY.has(candidate.id)) {
    const severityEffect = crpSeverityEffect(context.derivedInflammationPattern?.crp)
    evidence.push(evidenceItem(severityEffect, 'derivedInflammationPattern.crpSeverity', crpSeverityLabel(context.derivedInflammationPattern?.crp), FINDING_STATES.PRESENT))
  }

  if (CRP_ONLY_CARDIAC_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.palpitations', '動悸', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ecgAbnormality', 'ECG異常', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.troponinElevation', 'トロポニン上昇', EVIDENCE_EFFECTS.STRONG_SUPPORT)
  }

  if (CRP_ONLY_THROMBOSIS_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.legSwelling', '下肢腫脹', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'nonInfectiousPatterns.thrombosisContext', 'DVT/PE疑い所見', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.tachycardia', '頻脈', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.malignancyHistory', '悪性腫瘍既往', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.postoperative', '手術後', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (TICK_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'derivedInflammationPattern.crpOnlyPattern', 'CRP-only patternでも保持', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (CRP_ONLY_DEEP_SUBACUTE_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', candidate.id === 'vertebral_osteomyelitis' ? EVIDENCE_EFFECTS.WEAK_SUPPORT : EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.severePain', '局在する強い疼痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticValve', '人工弁', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.pacemaker', 'ペースメーカー', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticJoint', '人工関節', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.diabetes', '糖尿病', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.heartMurmur', '心雑音', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.cerebralEmbolicSymptoms', '塞栓症状', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (CRP_ONLY_RHEUM_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'hostFactors.collagenDiseaseHistory', '膠原病既往', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '関節痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.temporalArteryTenderness', '側頭動脈圧痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.shoulderThighPain', '肩・大腿痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.renalDysfunction', '腎機能障害', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (CRP_ONLY_MALIGNANCY_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'hostFactors.malignancyHistory', '悪性腫瘍既往', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ldhHigh', 'LDH上昇', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.organomegaly', '臓器腫大', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (CRP_ONLY_DRUG_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'medications.recentDrugStart', '最近開始した薬剤', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', '肝障害所見', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }
}

function addNoLocalizingRankingEvidence(candidate, context, evidence) {
  if (!hasNoLocalizingPhenotype(context)) return
  if (NO_LOCALIZING_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.localizing.noneSelected', '局所症状なし/感染巣不明では広く保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'infective_endocarditis') {
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.cerebralEmbolicSymptoms', '塞栓症状', EVIDENCE_EFFECTS.SUPPORT)
  }

  if (['deep_infectious_focus', 'vertebral_osteomyelitis'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'physicalFindings.lumbarTenderness', '腰椎叩打痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.walkingDifficulty', '歩行困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
  }

  if (candidate.id === 'intra_abdominal_abscess') {
    addPresentEvidence(context, evidence, 'hostFactors.malignancyHistory', '悪性腫瘍背景', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '菌血症文脈', EVIDENCE_EFFECTS.SUPPORT)
  }

  if (candidate.id === 'pulmonary_tuberculosis') {
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'medications.biologicsUse', '生物学的製剤使用', EVIDENCE_EFFECTS.SUPPORT)
  }

  if (candidate.id === 'pmr_gca') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'tafro') {
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'aortic_disease') {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.thoracodorsalPain', '胸背部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.severePain', '強い疼痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'cppd') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.kneeJointPain', '膝関節痛', EVIDENCE_EFFECTS.SUPPORT)
  }
}

function addRespiratoryRankingEvidence(candidate, context, evidence) {
  if (!hasRespiratoryPhenotype(context)) return

  if (RESPIRATORY_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.respiratory.domainSelected', '呼吸器/胸部症状では鑑別を並列保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'pneumonia') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.cough', '咳', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.sputum', '痰', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highWbc', 'WBC高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', 'CRP高値', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.respiratoryImagingAbnormality', '胸部画像異常', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasRespiratorySputumAndImaging(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'respiratoryPatterns.sputumWithImaging', '痰＋画像異常', FINDING_STATES.PRESENT))
    }
    if (hasHypoxemiaWithRespiratorySymptoms(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'respiratoryPatterns.hypoxemiaWithSymptoms', '低酸素＋呼吸器症状', FINDING_STATES.PRESENT))
    }
    if (isAfebrile(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '現在無熱でも保持', FINDING_STATES.ABSENT))
    }
    if (isNormalOrLowWbc(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'viral_infection') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.cough', '咳', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸器症状', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.myalgiaArthralgia', '筋痛/関節痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (isNormalOrLowWbc(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値', FINDING_STATES.PRESENT))
    }
    if (hasNoFocalBacterialRespiratoryPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'respiratoryPatterns.noFocalBacterialFeatures', '細菌性肺炎を強く示す所見に乏しい', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'pleuritis') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.respiratoryImagingAbnormality', '胸部画像異常', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'deep_infectious_focus') {
    addPresentEvidence(context, evidence, 'physicalFindings.respiratoryImagingAbnormality', '胸部画像異常', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '菌血症文脈', EVIDENCE_EFFECTS.SUPPORT)
    if (isMarkedCrp(context) && hasRespiratoryImagingOrChestPain(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'respiratoryPatterns.complicatedPulmonaryInfection', '高い炎症反応＋胸部所見', FINDING_STATES.PRESENT))
    }
    if (hasProlongedCourse(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'pulmonary_tuberculosis') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.cough', '咳', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'medications.biologicsUse', '生物学的製剤使用', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.respiratoryImagingAbnormality', '胸部画像異常', EVIDENCE_EFFECTS.SUPPORT)
    if (hasProlongedCourse(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
    }
    if (isAfebrile(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '現在無熱でも保持', FINDING_STATES.ABSENT))
    }
  }

  if (candidate.id === 'dvt_pe') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.legSwelling', '片脚腫脹', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'nonInfectiousPatterns.thrombosisContext', 'DVT/PE疑い所見', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.tachycardia', '頻脈', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.malignancyHistory', '悪性腫瘍既往', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.postoperative', '手術後', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasSpecificPeSupport(context) && isAfebrile(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '現在無熱はPEを妨げない', FINDING_STATES.ABSENT))
    }
    if (hasSpecificPeSupport(context) && isNormalOrLowWbc(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'myocarditis') {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.palpitations', '動悸', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ecgAbnormality', 'ECG異常', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.troponinElevation', 'トロポニン上昇', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'pericarditis') {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.chestPain', '胸痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ecgAbnormality', 'ECG異常', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.troponinElevation', 'トロポニン上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'heart_failure') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.edema', '浮腫', EVIDENCE_EFFECTS.SUPPORT)
    if (hasNoFocalBacterialRespiratoryPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'respiratoryPatterns.noFocalBacterialFeatures', '感染所見に乏しい', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'aortic_disease') {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.thoracodorsalPain', '胸背部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.severePain', '激しい疼痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasNoFocalBacterialRespiratoryPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'respiratoryPatterns.noFocalBacterialFeatures', '明確な感染巣に乏しい', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'noninfectious_lung_disease') {
    addPresentEvidence(context, evidence, 'symptomDomains.respiratory.dyspnea', '呼吸困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.lowSpo2', 'SpO2低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.respiratoryImagingAbnormality', '胸部画像異常', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.collagenDiseaseHistory', '膠原病既往', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'medications.recentDrugStart', '薬剤曝露', EVIDENCE_EFFECTS.SUPPORT)
    if (hasNoFocalBacterialRespiratoryPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'respiratoryPatterns.noFocalBacterialFeatures', '感染所見に乏しい', FINDING_STATES.PRESENT))
    }
    if (hasProlongedCourse(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
    }
  }

  if (RESPIRATORY_INFECTION_CANDIDATES.has(candidate.id) && isAfebrile(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも完全除外しない', FINDING_STATES.ABSENT))
  }
}

function addAbdominalRankingEvidence(candidate, context, evidence) {
  if (!hasAbdominalPhenotype(context)) return

  if (ABDOMINAL_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.abdominal.domainSelected', '腹痛/下痢/肝胆道症状では鑑別を並列保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'infectious_gastroenteritis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.diarrhea', '下痢', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.vomiting', '嘔吐', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.nauseaVomiting', '悪心/嘔吐', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highWbc', 'WBC高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.sickContact', '周囲の流行/接触', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.food', '食事曝露', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.internationalTravel.state', '海外渡航/滞在', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (getFindingState(context, 'symptomDomains.abdominal.bloodyStool') === FINDING_STATES.PRESENT) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.abdominal.bloodyStool', '血便', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'cdi') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.diarrhea', '下痢', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'medications.recentAntibiotics', '最近の抗菌薬使用', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.recentHospitalization', '最近の入院歴', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.healthcare', '医療曝露', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'acute_cholangitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.rightUpperQuadrantPain', '右季肋部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.jaundice', '黄疸', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', '肝胆道系酵素上昇', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.hepatobiliaryHistory', '肝胆道疾患背景', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.biliaryInstrumentation', '胆道処置歴', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasCholangitisTriadSupport(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'abdominalPatterns.cholangitisTriadSupport', '右季肋部痛＋黄疸/胆道系上昇＋全身炎症', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'acute_cholecystitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.rightUpperQuadrantPain', '右季肋部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (['intra_abdominal_abscess', 'deep_infectious_focus'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.rightUpperQuadrantPain', '右季肋部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '菌血症文脈', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.malignancyHistory', '悪性腫瘍背景', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.diabetes', '糖尿病', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.abdominalSurgeryHistory', '腹部手術歴', EVIDENCE_EFFECTS.SUPPORT)
    if (hasProlongedCourse(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
    }
    if (isMarkedCrp(context) && hasAbdominalSpecificSymptom(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'abdominalPatterns.deepAbscessContext', '高い炎症反応＋腹部所見', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'appendicitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.rightLowerQuadrantPain', '右下腹部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.nauseaVomiting', '悪心/嘔吐', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.vomiting', '嘔吐', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highWbc', 'WBC高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'diverticulitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.leftLowerQuadrantPain', '左下腹部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highWbc', 'WBC高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.bowelHabitChange', '便通変化', EVIDENCE_EFFECTS.SUPPORT)
  }

  if (candidate.id === 'pancreatitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.epigastricPain', '心窩部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.backRadiation', '背部放散', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.vomiting', '嘔吐', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.nauseaVomiting', '悪心/嘔吐', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', '胆石/胆道系文脈', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'mesenteric_ischemia') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.severePain', '激しい腹痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.painOutOfProportion', '所見に比して強い腹痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.suddenPain', '突然の腹痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.atrialFibrillation', '心房細動', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.vascularDisease', '血管疾患背景', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.hypotension', '低血圧', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.bloodyStool', '血便', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.lactateElevation', '乳酸高値', EVIDENCE_EFFECTS.SUPPORT)
    if (isAfebrile(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    }
    if (isNormalOrLowWbc(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'aortic_disease') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.severePain', '激しい腹痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.suddenPain', '突然の腹痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.hypotension', '低血圧', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'abdominal_vasculitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.pain', '腹痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.renalDysfunction', '腎機能障害', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.collagenDiseaseHistory', '膠原病既往', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'drug_fever') {
    addPresentEvidence(context, evidence, 'medications.recentDrugStart', '最近開始した薬剤', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.abdominal.diarrhea', '下痢', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', '肝障害所見', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (['tumor_fever', 'intravascular_lymphoma'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ldhHigh', 'LDH上昇', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.organomegaly', '臓器腫大', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasProlongedCourse(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
    }
    if (hasAbdominalSpecificSymptom(context) && hasNoFocalAbdominalInfectionPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'abdominalPatterns.noClearInfectionSupport', '腹部症状＋明確な感染所見に乏しい', FINDING_STATES.PRESENT))
    }
  }

  if (ABDOMINAL_INFECTION_CANDIDATES.has(candidate.id) && isAfebrile(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも完全除外しない', FINDING_STATES.ABSENT))
  }
}

function addBackJointSkinRankingEvidence(candidate, context, evidence) {
  const hasBack = hasBackPhenotype(context)
  const hasJoint = hasJointPhenotype(context)
  const hasSkin = hasSkinPhenotype(context)
  if (!hasBack && !hasJoint && !hasSkin) return

  if (hasBack && BACK_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.backSpine.domainSelected', '腰背部痛では鑑別を並列保持', FINDING_STATES.PRESENT))
  }
  if (hasJoint && JOINT_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.boneJoint.domainSelected', '関節痛では鑑別を並列保持', FINDING_STATES.PRESENT))
  }
  if (hasSkin && SKIN_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.skinSoftTissue.domainSelected', '皮膚所見では鑑別を並列保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'vertebral_osteomyelitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.lumbarTenderness', '腰椎叩打痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.bloodCultureStaphAureus', 'Staphylococcus aureus', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.walkingDifficulty', '歩行困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.movementDifficulty', '体動困難', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticValve', '人工弁/血管内デバイス', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.pacemaker', 'ペースメーカー', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasSpecificSpineInfectionSupport(context) && isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    if (hasSpecificSpineInfectionSupport(context) && isNormalOrLowWbc(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'deep_infectious_focus' || candidate.id === 'iliopsoas_abscess') {
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '菌血症文脈', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.bloodCultureStaphAureus', 'Staphylococcus aureus', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasProlongedCourse(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '遷延経過', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'pyelonephritis') {
    addPresentEvidence(context, evidence, 'physicalFindings.cvaTenderness', 'CVA叩打痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.urinary.dysuria', '排尿痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.urinary.frequency', '頻尿', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasCvaWithUrinarySymptoms(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'urinaryPatterns.cvaWithUrinarySymptoms', 'CVA叩打痛＋尿路症状', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'infective_endocarditis') {
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticValve', '人工弁', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.pacemaker', 'ペースメーカー', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.findings', '皮膚所見', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '皮疹', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'aortic_disease') {
    addPresentEvidence(context, evidence, 'symptomDomains.cardiopulmonary.thoracodorsalPain', '胸背部痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.severePain', '激しい腰背部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.severePain', '強い疼痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.hypotension', '低血圧', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    if (isNormalOrLowWbc(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
  }

  if (['tumor_fever', 'intravascular_lymphoma'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.weightLoss', '体重減少', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.nightSweats', '夜間発汗', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ldhHigh', 'LDH上昇', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'septic_arthritis') {
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.monoarthritis', '単関節炎', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.severePain', '強い関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.jointSwelling', '関節腫脹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.warmth', '熱感', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.redness', '発赤', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.limitedRangeOfMotion', '可動域制限', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '菌血症文脈', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticJoint', '人工関節', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'cppd') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '急性関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.kneeJointPain', '膝関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.jointSwelling', '関節腫脹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (['pmr', 'pmr_gca'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.shoulderThighPain', '肩・大腿痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.temporalArteryTenderness', '側頭動脈圧痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasProlongedCourse(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'patient.prolongedCourse', '亜急性/遷延経過', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'abdominal_vasculitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.polyarthralgia', '多関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '皮疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.renalDysfunction', '腎機能障害', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.anemia', '貧血', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.collagenDiseaseHistory', '膠原病既往', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasRashJointRenalPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'inflammatoryPatterns.rashJointRenal', '皮疹＋関節痛＋腎障害', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'cellulitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.redness', '発赤', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.swelling', '腫脹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.warmth', '熱感', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.severePain', '疼痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'necrotizing_fasciitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.severePain', '強い疼痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.skinSoftTissue.painOutOfProportion', '所見に比して強い疼痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.skinBlister', '水疱', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.skinNecrosis', '壊死', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.shock', 'ショック', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.hypotension', '低血圧', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.multiOrganFailure', '多臓器障害', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.diabetes', '糖尿病', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (TICK_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'exposures.outdoorExposure', '野外曝露', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.tickExposure', 'マダニ曝露', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.eschar', '刺し口/痂皮', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '皮疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.leukopenia', '白血球低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', 'AST/ALT上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.ldhHigh', 'LDH上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (candidate.id === 'sfts' && hasSftsPattern(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'tickPatterns.sftsCytopeniaPattern', '白血球低下＋血小板低下＋全身所見', FINDING_STATES.PRESENT))
    }
    if (['japanese_spotted_fever', 'scrub_typhus'].includes(candidate.id) && hasRashEscharExposure(context)) {
      evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'tickPatterns.rashEscharExposure', '皮疹＋刺し口/曝露', FINDING_STATES.PRESENT))
    }
  }

  if (candidate.id === 'drug_fever') {
    addPresentEvidence(context, evidence, 'medications.recentDrugStart', '最近開始した薬剤', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '皮疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', '肝障害所見', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.noClearFocus', '感染巣不明', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }
}

function addCnsNeckRankingEvidence(candidate, context, evidence) {
  if (!hasCnsNeckPhenotype(context)) return

  if (CNS_NECK_BROAD_CANDIDATES.has(candidate.id) && hasCrpElevationOrHigher(context)) {
    evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'symptomDomains.neurologic.headacheDomainSelected', '頭痛/頸部痛では鑑別を並列保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'meningitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.severeHeadache', '強い頭痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.neckStiffness', '項部硬直', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.meningealSigns', '髄膜刺激徴候', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.alteredMentalStatus', '意識障害', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highWbc', 'WBC高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasMeningitisTriadSupport(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'cnsPatterns.headacheNeckStiffnessAms', '頭痛＋項部硬直＋意識障害', FINDING_STATES.PRESENT))
    if (isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    if (isNormalOrLowWbc(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'encephalitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.alteredMentalStatus', '意識障害', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.seizure', '痙攣', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.focalNeurologicDeficit', '神経巣症状', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    if (isNormalOrLowWbc(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'deep_neck_infection') {
    addPresentEvidence(context, evidence, 'symptomDomains.neck.acutePain', '急性頸部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neck.severePain', '強い頸部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.limitedNeckRotation', '頸部回旋制限', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'vitals.fever', '発熱', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasDeepNeckInfectionPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'cnsPatterns.deepNeckInflammatoryPattern', '急性/強い頸部痛＋可動域制限/全身炎症', FINDING_STATES.PRESENT))
    if (isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
  }

  if (['vertebral_osteomyelitis', 'deep_infectious_focus'].includes(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.neck.acutePain', '急性頸部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neck.severePain', '強い頸部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.backSpine.backPain', '腰背部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.lumbarTenderness', '脊椎叩打痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.immunosuppression', '免疫抑制', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasSpecificCervicalSpineInfectionSupport(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'cnsPatterns.cervicalSpineInfectionSupport', '頸部/脊椎感染を疑う所見', FINDING_STATES.PRESENT))
    if (hasSpecificCervicalSpineInfectionSupport(context) && isAfebrile(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'vitals.fever', '発熱なしでも保持', FINDING_STATES.ABSENT))
    if (hasSpecificCervicalSpineInfectionSupport(context) && isNormalOrLowWbc(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.WEAK_SUPPORT, 'inflammation.wbcNotHigh', 'WBC正常/低値でも保持', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'infective_endocarditis') {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.alteredMentalStatus', '意識障害', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.cerebralEmbolicSymptoms', '脳塞栓症状', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.prostheticValve', '人工弁', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'devicesProcedures.pacemaker', 'ペースメーカー', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hostFactors.dialysis', '透析', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'bacteremia') {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.alteredMentalStatus', '意識障害', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.chills', '悪寒戦慄', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'infectionPatterns.positiveBloodCulture', '血液培養陽性', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'pmr_gca') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.temporalArteryTenderness', '側頭動脈圧痛', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.shoulderThighPain', '肩・大腿痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasGcaPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'cnsPatterns.gcaSupport', '高齢者＋頭痛/側頭動脈圧痛', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'pmr') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.constitutional.shoulderThighPain', '肩・大腿痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
  }

  if (candidate.id === 'crowned_dens_syndrome') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neck.acutePain', '急性頸部痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.limitedNeckRotation', '頸部回旋制限', EVIDENCE_EFFECTS.STRONG_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasCrownedDensPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'cnsPatterns.crownedDensSupport', '高齢者＋急性頸部痛＋回旋制限', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'cppd') {
    addPresentEvidence(context, evidence, 'hostFactors.olderAdult', '高齢者', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.neck.acutePain', '急性頸部痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.limitedNeckRotation', '頸部回旋制限', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasCrownedDensPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.SUPPORT, 'cnsPatterns.cppdCrownedDensPattern', 'CPPD/Crowned densを疑う頸部所見', FINDING_STATES.PRESENT))
  }

  if (candidate.id === 'abdominal_vasculitis') {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '発疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.renalDysfunction', '腎機能障害', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'symptomDomains.boneJoint.acuteJointPain', '関節痛', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'inflammation.highCrp', '炎症反応高値', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasHeadacheRashRenalPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'cnsPatterns.headacheRashRenal', '頭痛＋皮疹＋腎障害', FINDING_STATES.PRESENT))
  }

  if (TICK_CANDIDATES.has(candidate.id)) {
    addPresentEvidence(context, evidence, 'symptomDomains.neurologic.headache', '頭痛', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    addPresentEvidence(context, evidence, 'exposures.outdoorExposure', '野外曝露', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.rash', '皮疹', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.leukopenia', '白血球低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'hematology.thrombocytopenia', '血小板低下', EVIDENCE_EFFECTS.SUPPORT)
    addPresentEvidence(context, evidence, 'physicalFindings.hepatobiliaryEnzymeElevation', 'AST/ALT上昇', EVIDENCE_EFFECTS.WEAK_SUPPORT)
    if (hasSftsPattern(context)) evidence.push(evidenceItem(EVIDENCE_EFFECTS.STRONG_SUPPORT, 'tickPatterns.sftsCytopeniaPattern', '白血球低下＋血小板低下＋全身所見', FINDING_STATES.PRESENT))
  }
}

function addPresentEvidence(context, evidence, path, label, effect) {
  if (getFindingState(context, path) === FINDING_STATES.PRESENT) {
    evidence.push(evidenceItem(effect, path, label, FINDING_STATES.PRESENT))
  }
}

function crpSeverityEffect(crpPattern) {
  if (crpPattern === 'marked_crp' || crpPattern === 'high_crp') return EVIDENCE_EFFECTS.SUPPORT
  return EVIDENCE_EFFECTS.WEAK_SUPPORT
}

function crpSeverityLabel(crpPattern) {
  return {
    mild_crp_elevation: 'CRP軽度上昇',
    crp_elevation: 'CRP上昇',
    high_crp: 'CRP高値',
    marked_crp: 'CRP著明高値',
  }[crpPattern] || 'CRP上昇'
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

function effectForSupport(candidate, findingPath, context) {
  if (candidate.id === 'pulmonary_tuberculosis' && findingPath === 'symptomDomains.respiratory.cough') return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (candidate.id === 'vertebral_osteomyelitis' && findingPath === 'symptomDomains.backSpine.backPain') return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (candidate.id === 'cppd' && findingPath === 'inflammation.highCrp') return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (candidate.id === 'intravascular_lymphoma' && ['physicalFindings.ldhHigh', 'hematology.anemia', 'hematology.thrombocytopenia'].includes(findingPath) && !hasIvlCompositeSupport(context)) return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (candidate.id === 'tafro' && findingPath === 'hematology.thrombocytopenia' && !hasTafroCompositeSupport(context)) return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (TICK_CANDIDATES.has(candidate.id) && ['physicalFindings.rash', 'hematology.thrombocytopenia'].includes(findingPath) && !hasTickSpecificSupport(context)) return EVIDENCE_EFFECTS.WEAK_SUPPORT
  if (TRAVEL_CANDIDATES.has(candidate.id) && ['symptomDomains.neurologic.headache', 'hematology.thrombocytopenia', 'hematology.leukopenia'].includes(findingPath) && !hasTravelSpecificSupport(context, candidate.id)) return EVIDENCE_EFFECTS.WEAK_SUPPORT
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
  const informationValue = hasSpecificSymptomPhenotype(context) ? 42 : 120
  return [
    {
      id: 'q_travel_recent',
      label: '最近、海外への渡航・滞在がありましたか？',
      domain: 'internationalTravel',
      findingId: 'exposures.internationalTravel.state',
      answerType: 'findingState',
      options: findingStateOptions(),
      sourceCandidates: ['malaria', 'dengue', 'chikungunya'],
      informationValue,
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
  const priorityAdjustment = questionPriorityAdjustment(question, context)
  const priorityValue = {
    [PRIORITY_CLASS.CRITICAL]: 80,
    [PRIORITY_CLASS.DISCRIMINATION_HIGH]: 60,
    [PRIORITY_CLASS.CURRENT_CONTEXT_HIGH]: 50,
    [PRIORITY_CLASS.MODERATE]: 35,
    [PRIORITY_CLASS.LOW]: 20,
  }[question.priorityClass] || 0
  const informationValue = priorityValue + matchedCandidates.length * 12 + (question.safetyRole ? 10 : 0) + priorityAdjustment

  return {
    ...question,
    eligible: matchedCandidates.length > 0 || question.priorityClass === PRIORITY_CLASS.CRITICAL || priorityAdjustment > 0,
    relevance: matchedCandidates.length > 0 ? RELEVANCE.HIGH : RELEVANCE.MEDIUM,
    informationValue,
    candidateEffects,
    selectionReasons: [
      matchedCandidates.length > 0 ? `上位候補 ${matchedCandidates.join(', ')} の順位を分離` : 'critical safety question',
      question.safetyRole ? `safety role: ${question.safetyRole}` : null,
    ].filter(Boolean),
  }
}

function questionPriorityAdjustment(question, context) {
  let adjustment = 0

  if (hasRespiratoryPhenotype(context)) {
    adjustment += {
      q_resp_cough: 88,
      q_resp_sputum: 82,
      q_resp_dyspnea: 48,
      q_resp_chest_pain: 42,
      q_chest_pain_character: 42,
      q_bsi_positive_culture: -22,
      q_back_bacteremia_context: -34,
      q_back_local_pain: -36,
      q_travel_recent: -36,
    }[question.id] || 0
  }

  if (hasPeQuestionPhenotype(context)) {
    adjustment += {
      q_sys_thrombosis: 132,
      q_resp_dyspnea: 38,
      q_resp_chest_pain: 30,
      q_chest_pain_character: 28,
      q_resp_cough: -86,
      q_resp_sputum: -82,
      q_back_local_pain: -42,
      q_travel_recent: -34,
      q_bsi_positive_culture: -20,
    }[question.id] || 0
  }

  if (hasCnsNeckPhenotype(context)) {
    adjustment += {
      q_neck_acute_rotation: 88,
      q_neuro_neck_stiffness: 58,
      q_neuro_altered: 42,
      q_neuro_headache: 30,
      q_back_bacteremia_context: -36,
      q_travel_recent: -34,
      q_sys_bsymptom_ldh: -24,
    }[question.id] || 0
  }

  if (hasBackPhenotype(context)) {
    adjustment += {
      q_back_local_pain: 72,
      q_back_neuro_mobility: 56,
      q_uri_flank: 34,
      q_uri_dysuria: 26,
      q_back_bacteremia_context: 28,
      q_bsi_positive_culture: 20,
      q_travel_recent: -38,
      q_sys_bsymptom_ldh: -24,
    }[question.id] || 0
  }

  if (hasTickQuestionPhenotype(context)) {
    adjustment += {
      q_exp_outdoor: 96,
      q_exp_tick_bite: 72,
      q_exp_eschar: 72,
      q_travel_recent: -44,
      q_back_bacteremia_context: -30,
      q_sys_bsymptom_ldh: -26,
    }[question.id] || 0
  }

  if (hasNoLocalizingPhenotype(context) || isCrpOnlyPattern(context)) {
    adjustment += {
      q_back_bacteremia_context: 10,
      q_sys_bsymptom_ldh: 10,
      q_bsi_positive_culture: 6,
    }[question.id] || 0
  }

  return adjustment
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

function isCrpOnlyPattern(context) {
  return context.derivedInflammationPattern?.crpOnlyPattern === true
}

function hasNoLocalizingPhenotype(context) {
  return getFindingState(context, 'symptomDomains.localizing.noneSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.noClearFocus') === FINDING_STATES.PRESENT
}

function hasCrpElevationOrHigher(context) {
  return ['crp_elevation', 'high_crp', 'marked_crp'].includes(context.derivedInflammationPattern?.crp)
}

function hasRespiratoryPhenotype(context) {
  return getFindingState(context, 'symptomDomains.respiratory.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.chestPainDomainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.cough') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.sputum') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.dyspnea') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.chestPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.chestPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'vitals.lowSpo2') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.respiratoryImagingAbnormality') === FINDING_STATES.PRESENT
}

function hasSpecificSymptomPhenotype(context) {
  return hasRespiratoryPhenotype(context) ||
    hasPeQuestionPhenotype(context) ||
    hasCnsNeckPhenotype(context) ||
    hasBackPhenotype(context) ||
    hasTickQuestionPhenotype(context) ||
    hasAbdominalPhenotype(context) ||
    hasJointPhenotype(context) ||
    hasSkinPhenotype(context)
}

function hasPeQuestionPhenotype(context) {
  const chestOrDyspnea = getFindingState(context, 'symptomDomains.cardiopulmonary.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.dyspnea') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.chestPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.chestPain') === FINDING_STATES.PRESENT
  const physiologicSupport = getFindingState(context, 'vitals.lowSpo2') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'vitals.tachycardia') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.legSwelling') === FINDING_STATES.PRESENT
  return chestOrDyspnea && physiologicSupport
}

function hasRespiratorySputumAndImaging(context) {
  return getFindingState(context, 'symptomDomains.respiratory.sputum') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.respiratoryImagingAbnormality') === FINDING_STATES.PRESENT
}

function hasHypoxemiaWithRespiratorySymptoms(context) {
  return getFindingState(context, 'vitals.lowSpo2') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'symptomDomains.respiratory.cough') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'symptomDomains.respiratory.sputum') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'symptomDomains.respiratory.dyspnea') === FINDING_STATES.PRESENT)
}

function hasRespiratoryImagingOrChestPain(context) {
  return getFindingState(context, 'physicalFindings.respiratoryImagingAbnormality') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.respiratory.chestPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.chestPain') === FINDING_STATES.PRESENT
}

function hasSpecificPeSupport(context) {
  return getFindingState(context, 'physicalFindings.legSwelling') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'nonInfectiousPatterns.thrombosisContext') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'vitals.lowSpo2') === FINDING_STATES.PRESENT
}

function hasNoFocalBacterialRespiratoryPattern(context) {
  return getFindingState(context, 'symptomDomains.respiratory.sputum') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'inflammation.highWbc') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'vitals.fever') !== FINDING_STATES.PRESENT
}

function isNormalOrLowWbc(context) {
  return ['normal_wbc', 'leukopenia'].includes(context.derivedInflammationPattern?.wbc)
}

function isMarkedCrp(context) {
  return context.derivedInflammationPattern?.crp === 'marked_crp'
}

function hasProlongedCourse(context) {
  const duration = context.patient?.feverDuration?.value
  return Number.isFinite(duration) && duration >= 14
}

function hasAbdominalPhenotype(context) {
  return getFindingState(context, 'symptomDomains.abdominal.painDomainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.diarrheaDomainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.pain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.diarrhea') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.rightUpperQuadrantPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.jaundice') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.hepatobiliaryEnzymeElevation') === FINDING_STATES.PRESENT
}

function hasAbdominalSpecificSymptom(context) {
  return getFindingState(context, 'symptomDomains.abdominal.pain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.diarrhea') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.rightUpperQuadrantPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.rightLowerQuadrantPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.leftLowerQuadrantPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.abdominal.epigastricPain') === FINDING_STATES.PRESENT
}

function hasCholangitisTriadSupport(context) {
  const hasBiliaryPain = getFindingState(context, 'symptomDomains.abdominal.rightUpperQuadrantPain') === FINDING_STATES.PRESENT
  const hasBiliaryObstruction = getFindingState(context, 'physicalFindings.jaundice') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.hepatobiliaryEnzymeElevation') === FINDING_STATES.PRESENT
  const hasSystemicInflammation = getFindingState(context, 'vitals.fever') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.chills') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'inflammation.highCrp') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'inflammation.highWbc') === FINDING_STATES.PRESENT
  return hasBiliaryPain && hasBiliaryObstruction && hasSystemicInflammation
}

function hasNoFocalAbdominalInfectionPattern(context) {
  return getFindingState(context, 'infectionPatterns.chills') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'inflammation.highWbc') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.jaundice') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.hepatobiliaryEnzymeElevation') !== FINDING_STATES.PRESENT &&
    getFindingState(context, 'medications.recentAntibiotics') !== FINDING_STATES.PRESENT
}

function hasBackPhenotype(context) {
  return getFindingState(context, 'symptomDomains.backSpine.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.backPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.cardiopulmonary.thoracodorsalPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.lumbarTenderness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.cvaTenderness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.walkingDifficulty') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.movementDifficulty') === FINDING_STATES.PRESENT
}

function hasJointPhenotype(context) {
  return getFindingState(context, 'symptomDomains.boneJoint.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.boneJoint.acuteJointPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.boneJoint.jointSwelling') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.boneJoint.kneeJointPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.boneJoint.polyarthralgia') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.constitutional.shoulderThighPain') === FINDING_STATES.PRESENT
}

function hasSkinPhenotype(context) {
  return getFindingState(context, 'symptomDomains.skinSoftTissue.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.skinSoftTissue.redness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.skinSoftTissue.swelling') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.skinSoftTissue.warmth') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.skinSoftTissue.severePain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.skinSoftTissue.painOutOfProportion') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.skinBlister') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.skinNecrosis') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'exposures.eschar') === FINDING_STATES.PRESENT
}

function hasCvaWithUrinarySymptoms(context) {
  return getFindingState(context, 'physicalFindings.cvaTenderness') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'symptomDomains.urinary.dysuria') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'symptomDomains.urinary.frequency') === FINDING_STATES.PRESENT)
}

function hasSpecificSpineInfectionSupport(context) {
  return getFindingState(context, 'physicalFindings.lumbarTenderness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.positiveBloodCulture') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.bloodCultureStaphAureus') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.walkingDifficulty') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.movementDifficulty') === FINDING_STATES.PRESENT
}

function hasRashJointRenalPattern(context) {
  const joint = getFindingState(context, 'symptomDomains.boneJoint.acuteJointPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.boneJoint.polyarthralgia') === FINDING_STATES.PRESENT
  return getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT &&
    joint &&
    getFindingState(context, 'physicalFindings.renalDysfunction') === FINDING_STATES.PRESENT
}

function hasSftsPattern(context) {
  return getFindingState(context, 'hematology.leukopenia') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'hematology.thrombocytopenia') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.outdoorExposure') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'symptomDomains.constitutional.malaise') === FINDING_STATES.PRESENT)
}

function hasRashEscharExposure(context) {
  return getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'exposures.eschar') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.outdoorExposure') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.tickExposure') === FINDING_STATES.PRESENT)
}

function hasIvlCompositeSupport(context) {
  const cytopenia = getFindingState(context, 'hematology.anemia') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'hematology.thrombocytopenia') === FINDING_STATES.PRESENT
  const systemic = getFindingState(context, 'symptomDomains.constitutional.weightLoss') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.constitutional.nightSweats') === FINDING_STATES.PRESENT ||
    hasProlongedCourse(context)
  return getFindingState(context, 'physicalFindings.ldhHigh') === FINDING_STATES.PRESENT &&
    cytopenia &&
    (systemic || hasNoLocalizingPhenotype(context))
}

function hasTafroCompositeSupport(context) {
  return getFindingState(context, 'physicalFindings.edema') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.renalDysfunction') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.organomegaly') === FINDING_STATES.PRESENT
}

function hasTickSpecificSupport(context) {
  return getFindingState(context, 'exposures.outdoorExposure') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'exposures.tickExposure') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'exposures.eschar') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'hematology.leukopenia') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.hepatobiliaryEnzymeElevation') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.ldhHigh') === FINDING_STATES.PRESENT
}

function hasTickQuestionPhenotype(context) {
  return hasNoLocalizingPhenotype(context) &&
    (getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'hematology.leukopenia') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'hematology.thrombocytopenia') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'physicalFindings.hepatobiliaryEnzymeElevation') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.outdoorExposure') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.tickExposure') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'exposures.eschar') === FINDING_STATES.PRESENT)
}

function hasTravelSpecificSupport(context, candidateId) {
  const riskPaths = {
    malaria: 'exposures.internationalTravel.regionClassifications.malariaRiskArea',
    dengue: 'exposures.internationalTravel.regionClassifications.dengueRiskArea',
    chikungunya: 'exposures.internationalTravel.regionClassifications.chikungunyaRiskArea',
  }
  return getFindingState(context, 'exposures.internationalTravel.state') === FINDING_STATES.PRESENT ||
    getFindingState(context, riskPaths[candidateId]) === FINDING_STATES.PRESENT
}

function hasCnsNeckPhenotype(context) {
  return getFindingState(context, 'symptomDomains.neurologic.headacheDomainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neck.domainSelected') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neurologic.headache') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neurologic.severeHeadache') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neurologic.alteredMentalStatus') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neurologic.seizure') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.neckStiffness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.meningealSigns') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neck.acutePain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neck.severePain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.limitedNeckRotation') === FINDING_STATES.PRESENT
}

function hasMeningitisTriadSupport(context) {
  return getFindingState(context, 'symptomDomains.neurologic.headache') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'physicalFindings.neckStiffness') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'physicalFindings.meningealSigns') === FINDING_STATES.PRESENT) &&
    getFindingState(context, 'symptomDomains.neurologic.alteredMentalStatus') === FINDING_STATES.PRESENT
}

function hasDeepNeckInfectionPattern(context) {
  const focalNeckPain = getFindingState(context, 'symptomDomains.neck.acutePain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.neck.severePain') === FINDING_STATES.PRESENT
  const systemicOrLimited = getFindingState(context, 'physicalFindings.limitedNeckRotation') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'vitals.fever') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.chills') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'inflammation.highCrp') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.positiveBloodCulture') === FINDING_STATES.PRESENT
  return focalNeckPain && systemicOrLimited
}

function hasSpecificCervicalSpineInfectionSupport(context) {
  return getFindingState(context, 'symptomDomains.neck.severePain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'symptomDomains.backSpine.backPain') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'physicalFindings.lumbarTenderness') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'infectionPatterns.positiveBloodCulture') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'hostFactors.dialysis') === FINDING_STATES.PRESENT ||
    getFindingState(context, 'hostFactors.immunosuppression') === FINDING_STATES.PRESENT
}

function hasGcaPattern(context) {
  return getFindingState(context, 'hostFactors.olderAdult') === FINDING_STATES.PRESENT &&
    (getFindingState(context, 'physicalFindings.temporalArteryTenderness') === FINDING_STATES.PRESENT ||
      getFindingState(context, 'symptomDomains.neurologic.headache') === FINDING_STATES.PRESENT)
}

function hasCrownedDensPattern(context) {
  return getFindingState(context, 'hostFactors.olderAdult') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'symptomDomains.neck.acutePain') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.limitedNeckRotation') === FINDING_STATES.PRESENT
}

function hasHeadacheRashRenalPattern(context) {
  return getFindingState(context, 'symptomDomains.neurologic.headache') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.rash') === FINDING_STATES.PRESENT &&
    getFindingState(context, 'physicalFindings.renalDysfunction') === FINDING_STATES.PRESENT
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
    'physicalFindings.edema': '浮腫',
    'physicalFindings.legSwelling': '片脚腫脹',
    'vitals.tachycardia': '頻脈',
    'inflammation.highWbc': 'WBC高値',
    'inflammation.wbcNotHigh': 'WBC正常/低値',
    'symptomDomains.abdominal.pain': '腹痛',
    'symptomDomains.abdominal.diarrhea': '下痢',
    'symptomDomains.abdominal.vomiting': '嘔吐',
    'symptomDomains.abdominal.nauseaVomiting': '悪心/嘔吐',
    'symptomDomains.abdominal.rightUpperQuadrantPain': '右季肋部痛',
    'symptomDomains.abdominal.rightLowerQuadrantPain': '右下腹部痛',
    'symptomDomains.abdominal.leftLowerQuadrantPain': '左下腹部痛',
    'symptomDomains.abdominal.epigastricPain': '心窩部痛',
    'symptomDomains.abdominal.backRadiation': '背部放散',
    'symptomDomains.abdominal.bowelHabitChange': '便通変化',
    'symptomDomains.abdominal.suddenPain': '突然の腹痛',
    'symptomDomains.abdominal.severePain': '激しい腹痛',
    'symptomDomains.abdominal.painOutOfProportion': '所見に比して強い腹痛',
    'symptomDomains.abdominal.bloodyStool': '血便',
    'physicalFindings.jaundice': '黄疸',
    'physicalFindings.hepatobiliaryEnzymeElevation': '肝胆道系酵素上昇',
    'physicalFindings.renalDysfunction': '腎機能障害',
    'physicalFindings.lactateElevation': '乳酸高値',
    'exposures.food': '食事曝露',
    'exposures.sickContact': '周囲の流行/接触',
    'exposures.healthcare': '医療曝露',
    'medications.recentAntibiotics': '最近の抗菌薬使用',
    'devicesProcedures.recentHospitalization': '最近の入院歴',
    'devicesProcedures.abdominalSurgeryHistory': '腹部手術歴',
    'devicesProcedures.biliaryInstrumentation': '胆道処置歴',
    'hostFactors.hepatobiliaryHistory': '肝胆道疾患背景',
    'hostFactors.olderAdult': '高齢者',
    'hostFactors.diabetes': '糖尿病',
    'hostFactors.immunosuppression': '免疫抑制',
    'hostFactors.malignancyHistory': '悪性腫瘍背景',
    'hostFactors.atrialFibrillation': '心房細動',
    'hostFactors.vascularDisease': '血管疾患背景',
    'hematology.anemia': '貧血',
    'physicalFindings.ldhHigh': 'LDH上昇',
    'physicalFindings.organomegaly': '臓器腫大',
    'symptomDomains.cardiopulmonary.palpitations': '動悸',
    'physicalFindings.ecgAbnormality': 'ECG異常',
    'physicalFindings.troponinElevation': 'トロポニン上昇',
    'hostFactors.collagenDiseaseHistory': '膠原病既往',
    'medications.recentDrugStart': '薬剤曝露',
    'physicalFindings.cvaTenderness': 'CVA叩打痛',
    'symptomDomains.backSpine.backPain': '腰背部痛',
    'symptomDomains.backSpine.severePain': '激しい腰背部痛',
    'symptomDomains.backSpine.walkingDifficulty': '歩行困難',
    'symptomDomains.backSpine.movementDifficulty': '体動困難',
    'physicalFindings.lumbarTenderness': '腰椎叩打痛',
    'symptomDomains.urinary.dysuria': '排尿痛',
    'symptomDomains.urinary.frequency': '頻尿',
    'symptomDomains.boneJoint.acuteJointPain': '急性関節痛',
    'symptomDomains.boneJoint.monoarthritis': '単関節炎',
    'symptomDomains.boneJoint.severePain': '強い関節痛',
    'symptomDomains.boneJoint.jointSwelling': '関節腫脹',
    'symptomDomains.boneJoint.warmth': '関節熱感',
    'symptomDomains.boneJoint.redness': '関節発赤',
    'symptomDomains.boneJoint.limitedRangeOfMotion': '可動域制限',
    'symptomDomains.boneJoint.kneeJointPain': '膝関節痛',
    'symptomDomains.boneJoint.polyarthralgia': '多関節痛',
    'symptomDomains.constitutional.shoulderThighPain': '肩・大腿痛',
    'devicesProcedures.prostheticJoint': '人工関節',
    'symptomDomains.skinSoftTissue.redness': '発赤',
    'symptomDomains.skinSoftTissue.swelling': '腫脹',
    'symptomDomains.skinSoftTissue.warmth': '熱感',
    'symptomDomains.skinSoftTissue.severePain': '強い皮膚疼痛',
    'physicalFindings.skinBlister': '水疱',
    'physicalFindings.skinPeeling': '皮膚剥離',
    'physicalFindings.multiOrganFailure': '多臓器障害',
    'vitals.shock': 'ショック',
    'symptomDomains.neurologic.headache': '頭痛',
    'symptomDomains.neurologic.severeHeadache': '強い頭痛',
    'symptomDomains.neurologic.alteredMentalStatus': '意識障害',
    'symptomDomains.neurologic.seizure': '痙攣',
    'symptomDomains.neurologic.cerebralEmbolicSymptoms': '脳塞栓症状',
    'physicalFindings.focalNeurologicDeficit': '神経巣症状',
    'physicalFindings.neckStiffness': '項部硬直',
    'physicalFindings.meningealSigns': '髄膜刺激徴候',
    'symptomDomains.neck.acutePain': '急性頸部痛',
    'symptomDomains.neck.severePain': '強い頸部痛',
    'physicalFindings.limitedNeckRotation': '頸部回旋制限',
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
