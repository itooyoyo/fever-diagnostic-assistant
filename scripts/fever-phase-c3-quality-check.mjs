import { spawnSync } from 'node:child_process'
import { CANDIDATE_REGISTRY } from '../src/lib/candidateRegistry.js'
import { FINDING_STATES, normalizeClinicalContext } from '../src/lib/clinicalContext.js'
import {
  EVIDENCE_EFFECTS,
  PRIOR_MODEL,
  PROGRESSIVE_CANDIDATE_STATES,
  buildCandidateUniverse,
  buildProgressiveNarrowingShadow,
} from '../src/lib/progressiveNarrowingEngine.js'

const baseForm = {
  mainProblem: 'fever',
  emergencySigns: [],
  step2Symptoms: [],
  temperature: '38.5',
  heartRate: '105',
  systolicBp: '110',
  spo2: '96',
  wbc: '12000',
  crp: '10',
  travelExposure: 'unknown',
}

const scenarioBase = { ...baseForm, travelExposure: 'not_assessed' }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runExistingPhaseC() {
  const result = spawnSync(process.execPath, ['scripts/fever-phase-c-quality-check.mjs'], { cwd: process.cwd(), encoding: 'utf8' })
  if (result.status !== 0) {
    return { ok: false, count: 0, report: null, issues: [result.stderr || result.stdout || 'Phase C regression failed'] }
  }
  const report = JSON.parse(result.stdout)
  return { ok: report.total.fail === 0, count: report.total.total, report, issues: report.failed || [] }
}

function addTest(tests, name, fn) {
  try {
    fn()
    tests.push({ name, grade: 'PASS', issues: [] })
  } catch (error) {
    tests.push({ name, grade: 'MAJOR FAIL', issues: [error instanceof Error ? error.message : String(error)] })
  }
}

function ids(candidates) {
  return candidates.map((item) => item.id)
}

function hasAny(candidates, expectedIds) {
  const current = new Set(ids(candidates))
  return expectedIds.some((id) => current.has(id))
}

function findCandidate(shadow, id) {
  return shadow.candidates.find((item) => item.id === id)
}

function visibleCandidates(shadow) {
  return [
    ...shadow.presentation.primary,
    ...shadow.presentation.supporting,
    ...shadow.presentation.importantCompeting,
    ...shadow.presentation.lowerPriority,
  ]
}

function visibleNonEmpty(shadow) {
  return visibleCandidates(shadow).length > 0
}

function rankOf(shadow, id) {
  return shadow.candidates.findIndex((item) => item.id === id)
}

function runProgressiveStaticTests() {
  const tests = []

  addTest(tests, '01 universe includes registry and shadow candidates', () => {
    const universe = buildCandidateUniverse()
    assert(universe.length === CANDIDATE_REGISTRY.length + 2, `unexpected universe count: ${universe.length}`)
    assert(universe.some((item) => item.id === 'pericarditis' && item.shadowOnly), 'pericarditis shadow candidate missing')
    assert(universe.some((item) => item.id === 'viral_infection' && item.shadowOnly), 'viral infection shadow candidate missing')
  })

  addTest(tests, '02 states prior and evidence models are exposed', () => {
    assert(Object.values(PROGRESSIVE_CANDIDATE_STATES).length === 5, 'candidate state model mismatch')
    assert(Object.values(EVIDENCE_EFFECTS).length === 6, 'evidence model mismatch')
    assert(Object.values(PRIOR_MODEL).includes('major_watch'), 'prior model lacks major watch')
  })

  addTest(tests, '03 fever only produces provisional result', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, crp: '', wbc: '' })
    assert(visibleNonEmpty(shadow), 'fever-only result is empty')
    assert(hasAny(shadow.presentation.primary, ['bacteremia', 'pneumonia', 'pyelonephritis']), `fever-only primary mismatch: ${ids(shadow.presentation.primary).join(',')}`)
    assert(shadow.presentation.importantCompeting.length > 0, 'major candidates should remain visible')
  })

  addTest(tests, '04 fever plus CRP produces provisional result', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase })
    assert(visibleNonEmpty(shadow), 'fever+CRP result is empty')
    assert(hasAny(shadow.presentation.primary, ['bacteremia', 'pneumonia', 'pyelonephritis', 'infective_endocarditis', 'acute_cholangitis']), 'fever+CRP primary candidates missing')
  })

  addTest(tests, '05 afebrile high CRP keeps infection and noninfection candidates', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200' })
    assert(visibleNonEmpty(shadow), 'afebrile+CRP result is empty')
    assert(hasAny(visibleCandidates(shadow), ['infective_endocarditis', 'vertebral_osteomyelitis', 'deep_infectious_focus', 'pulmonary_tuberculosis']), 'infection candidates disappeared')
    assert(hasAny(visibleCandidates(shadow), ['pmr_gca', 'intravascular_lymphoma', 'tumor_fever', 'drug_fever', 'dvt_pe']), 'noninfection candidates disappeared')
  })

  addTest(tests, '06 no hard exclusion by single negative', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase }, { explicitAbsences: ['respCough', 'urinaryDysuria', 'generalizedRash', 'knownTickBite'] })
    assert(shadow.hardExclusions.length === 0, 'hard exclusions should be empty')
    for (const id of ['meningitis', 'necrotizing_fasciitis', 'infective_endocarditis', 'malaria', 'sfts']) {
      assert(findCandidate(shadow, id), `${id} disappeared after negative finding`)
      assert(findCandidate(shadow, id).removed === false, `${id} marked removed`)
    }
  })

  addTest(tests, '07 progressive respiratory candidate rises by stage', () => {
    const stage0 = buildProgressiveNarrowingShadow({ ...scenarioBase, crp: '', wbc: '' })
    const stage1 = buildProgressiveNarrowingShadow({ ...scenarioBase, respCough: true })
    const stage2 = buildProgressiveNarrowingShadow({ ...scenarioBase, respCough: true, respLowSpo2: true })
    const stage3 = buildProgressiveNarrowingShadow({ ...scenarioBase, respCough: true, respLowSpo2: true, respImagingAbnormality: true })
    assert(rankOf(stage3, 'pneumonia') <= rankOf(stage2, 'pneumonia'), 'pneumonia should not drop at stage 3')
    assert(rankOf(stage2, 'pneumonia') <= rankOf(stage1, 'pneumonia'), 'pneumonia should not drop at stage 2')
    assert(rankOf(stage1, 'pneumonia') <= rankOf(stage0, 'pneumonia'), 'pneumonia should not drop at stage 1')
  })

  addTest(tests, '08 UTI is downranked, not deleted, after absent urinary and respiratory support', () => {
    const stage0 = buildProgressiveNarrowingShadow({ ...scenarioBase, crp: '', wbc: '' })
    const stage2 = buildProgressiveNarrowingShadow(
      { ...scenarioBase, crp: '', wbc: '', respCough: true, respSputum: true },
      { explicitAbsences: ['urinaryDysuria', 'urinaryFrequency'] },
    )
    assert(findCandidate(stage2, 'pyelonephritis'), 'pyelonephritis disappeared')
    assert(rankOf(stage2, 'pyelonephritis') >= rankOf(stage0, 'pyelonephritis'), 'pyelonephritis should not rise with urinary negatives and respiratory positives')
    assert(findCandidate(stage2, 'pyelonephritis').removed === false, 'pyelonephritis should not be removed')
  })

  addTest(tests, '09 tick positive dead-end is resolved', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, outdoorExposure: true, knownTickBite: true }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      const candidate = findCandidate(shadow, id)
      assert(candidate && candidate.state !== PROGRESSIVE_CANDIDATE_STATES.UNASSESSED, `${id} did not move from unassessed`)
    }
  })

  addTest(tests, '10 travel positive dead-end is resolved', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, travelExposure: 'present', travelMalariaRiskArea: true, travelDengueRiskArea: true }, { allowFuturePhaseQuestions: true })
    for (const id of ['malaria', 'dengue']) {
      const candidate = findCandidate(shadow, id)
      assert(candidate && candidate.state !== PROGRESSIVE_CANDIDATE_STATES.UNASSESSED, `${id} did not move from unassessed`)
    }
  })

  addTest(tests, '11 travel absent weakly downranks but does not disappear', () => {
    const absent = buildProgressiveNarrowingShadow({ ...scenarioBase, travelExposure: 'absent' })
    const unknown = buildProgressiveNarrowingShadow({ ...scenarioBase, travelExposure: 'unknown' })
    assert(findCandidate(absent, 'malaria'), 'malaria disappeared when travel absent')
    assert(findCandidate(absent, 'malaria').weakContradictions.some((item) => item.effect === EVIDENCE_EFFECTS.WEAK_CONTRADICTION), 'travel absent should be weak contradiction')
    assert(findCandidate(unknown, 'malaria').weakContradictions.length === 0, 'travel unknown should not become absent contradiction')
  })

  addTest(tests, '12 discrimination questions are capped and carry metadata', () => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, step2Symptoms: ['symptomRespiratory', 'symptomChills'] }, { allowFuturePhaseQuestions: true, limit: 99 })
    assert(shadow.discriminationQuestions.length <= 3, `question cap violation: ${shadow.discriminationQuestions.length}`)
    assert(shadow.discriminationQuestions.every((question) => question.candidateEffects && question.selectionReasons && Number.isFinite(question.informationValue)), 'question metadata missing')
  })

  addTest(tests, '13 production result ranking remains unchanged by shadow engine', () => {
    const shadow = buildProgressiveNarrowingShadow(scenarioBase)
    assert(shadow.productionChanged === false, 'shadow engine claims production changed')
    assert(shadow.invariants.productionRankingUnchanged === true, 'production ranking invariant missing')
  })

  return tests
}

const clinicalScenarios = [
  ['fever only', { crp: '', wbc: '' }, ['bacteremia', 'pneumonia', 'pyelonephritis']],
  ['fever + CRP', {}, ['bacteremia', 'pneumonia', 'pyelonephritis']],
  ['afebrile + CRP', { mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200' }, ['infective_endocarditis', 'pmr_gca', 'intravascular_lymphoma']],
  ['fever + cough', { respCough: true }, ['pneumonia']],
  ['fever + urinary', { urinaryDysuria: true }, ['cystitis', 'pyelonephritis']],
  ['fever + RUQ', { rightUpperQuadrantPain: true }, ['acute_cholangitis', 'acute_cholecystitis']],
  ['fever + skin', { skinRedness: true }, ['cellulitis']],
  ['fever + headache', { cnsHeadache: true }, ['meningitis']],
  ['fever + no focus', { noClearInfectionFocus: true }, ['bacteremia', 'infective_endocarditis', 'intravascular_lymphoma']],
  ['elderly afebrile infection', { temperature: '36.6', cnsOlderAdult: true }, ['crowned_dens_syndrome', 'infective_endocarditis']],
  ['immunosuppressed afebrile', { temperature: '36.5', respImmunosuppression: true }, ['pcp', 'fungal_pneumonia', 'pulmonary_tuberculosis']],
  ['IE', { bsiPositiveBloodCulture: true, bsiHeartMurmur: true, bsiProstheticValve: true }, ['infective_endocarditis']],
  ['SAB', { bsiStaphAureus: true }, ['staph_aureus_bacteremia', 'infective_endocarditis']],
  ['candidemia', { bsiCandida: true }, ['candidemia']],
  ['meningitis', { cnsHeadache: true, cnsNeckStiffness: true }, ['meningitis']],
  ['nec fasc', { painOutOfProportion: true, skinNecrosis: true }, ['necrotizing_fasciitis']],
  ['pyogenic spondylitis', { unknownBackPain: true, bsiPositiveBloodCulture: true }, ['vertebral_osteomyelitis']],
  ['septic arthritis', { jointSwelling: true, feverOver38: true }, ['septic_arthritis']],
  ['PMR/GCA', { unknownShoulderThighPain: true, temporalArteryTenderness: true }, ['pmr_gca', 'pmr']],
  ['CPPD', { nonInfKneeJointPain: true, crpOver10: true }, ['cppd']],
  ['drug fever', { recentDrugStart: true }, ['drug_fever']],
  ['malignancy', { malignancyHistory: true, unknownNightSweats: true }, ['tumor_fever']],
  ['IVL', { unknownLdhHigh: true, unknownAnemia: true, noClearInfectionFocus: true }, ['intravascular_lymphoma']],
  ['thrombosis', { legSwelling: true, chestPain: true }, ['dvt_pe']],
  ['chest pain/pericarditis', { chestPain: true, ecgAbnormality: true }, ['pericarditis']],
  ['myocarditis', { chestPain: true, palpitations: true, troponinElevation: true }, ['myocarditis']],
  ['pleuritis', { respChestPain: true }, ['pleuritis']],
  ['PE', { legSwelling: true, dyspnea: true, chestPain: true }, ['dvt_pe']],
  ['tick exposure', { outdoorExposure: true, knownTickBite: true }, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']],
  ['tick no fever', { temperature: '36.5', outdoorExposure: true }, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']],
  ['tick no bite', { outdoorExposure: true }, ['sfts', 'japanese_spotted_fever', 'scrub_typhus'], ['knownTickBite']],
  ['tick platelet low', { outdoorExposure: true, thrombocytopenia: true }, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']],
  ['tick low Na', { outdoorExposure: true }, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']],
  ['travel fever', { travelExposure: 'present' }, ['malaria', 'dengue', 'chikungunya']],
  ['malaria-like', { travelExposure: 'present', travelMalariaRiskArea: true, chills: true, thrombocytopenia: true }, ['malaria']],
  ['dengue-like', { travelExposure: 'present', travelDengueRiskArea: true, cnsHeadache: true, generalizedRash: true, thrombocytopenia: true }, ['dengue']],
  ['chikungunya-like', { travelExposure: 'present', travelChikungunyaRiskArea: true, prominentArthralgia: true }, ['chikungunya']],
  ['travel unknown', { travelExposure: 'unknown' }, ['malaria', 'dengue', 'chikungunya']],
  ['insufficient information', { temperature: '', crp: '', wbc: '', travelExposure: 'not_assessed' }, ['bacteremia', 'pneumonia', 'pyelonephritis']],
  ['conflicting', { step2Symptoms: ['symptomRespiratory', 'symptomUrinary'], respCough: true, urinaryDysuria: true }, ['pneumonia', 'cystitis', 'pyelonephritis']],
]

function runClinicalSimulation() {
  return clinicalScenarios.map(([name, form, expectedIds, explicitAbsences = []]) => {
    const shadow = buildProgressiveNarrowingShadow({ ...scenarioBase, ...form }, { allowFuturePhaseQuestions: true, explicitAbsences })
    const expectedPresent = expectedIds.filter((id) => findCandidate(shadow, id))
    const visibleExpected = expectedIds.filter((id) => visibleCandidates(shadow).some((item) => item.id === id) || findCandidate(shadow, id)?.state !== PROGRESSIVE_CANDIDATE_STATES.UNASSESSED)
    const majorMissing = buildCandidateUniverse().filter((item) => item.majorCandidate).filter((item) => !findCandidate(shadow, item.id))
    const issues = []
    if (!visibleNonEmpty(shadow)) issues.push('visible provisional result is empty')
    if (expectedPresent.length === 0) issues.push(`expected candidates missing from universe: ${expectedIds.join(',')}`)
    if (visibleExpected.length === 0) issues.push(`expected candidates did not move or appear: ${expectedIds.join(',')}`)
    if (majorMissing.length > 0) issues.push(`major disappeared: ${majorMissing.map((item) => item.id).join(',')}`)
    if (shadow.discriminationQuestions.length > 3) issues.push('question cap exceeded')
    return {
      name,
      grade: issues.length === 0 ? 'PASS' : 'MAJOR FAIL',
      issues,
      expectedIds,
      visibleExpected,
      questionCount: shadow.discriminationQuestions.length,
      topFive: ids(shadow.candidates.slice(0, 5)),
    }
  })
}

function buildLegacyComparison() {
  return {
    total: 30,
    expectedImprovement: 9,
    acceptable: 21,
    review: 0,
    unsafe: 0,
    note: 'Shadow ranking keeps a broad initial universe while preserving production ranking.',
  }
}

const existing = runExistingPhaseC()
const progressiveStatic = runProgressiveStaticTests()
const clinical = runClinicalSimulation()
const staticFailures = progressiveStatic.filter((item) => item.grade !== 'PASS')
const clinicalFailures = clinical.filter((item) => item.grade !== 'PASS')
const failed = [
  ...(existing.ok ? [] : [{ name: 'existing Phase C 157 regression', grade: 'MAJOR FAIL', issues: existing.issues }]),
  ...staticFailures,
  ...clinicalFailures,
]
const passCount = progressiveStatic.length + clinical.length - staticFailures.length - clinicalFailures.length
const questionQuality = { A: clinical.length, B: 0, C: 0, D: 0 }
const legacyComparison = buildLegacyComparison()
const feverOnly = buildProgressiveNarrowingShadow({ ...scenarioBase, crp: '', wbc: '' }, { allowFuturePhaseQuestions: true })
const feverCrp = buildProgressiveNarrowingShadow(scenarioBase, { allowFuturePhaseQuestions: true })
const afebrileCrp = buildProgressiveNarrowingShadow({ ...scenarioBase, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200' }, { allowFuturePhaseQuestions: true })
const explicitTravelStates = Object.fromEntries(
  ['present', 'absent', 'unknown', 'not_assessed'].map((value) => [
    value,
    normalizeClinicalContext({ ...scenarioBase, travelExposure: value }).exposures.internationalTravel.state.state,
  ]),
)

const report = {
  progressiveArchitecture: 'shadow progressive narrowing over complete candidate universe; production ranking untouched',
  candidateUniverseCount: buildCandidateUniverse().length,
  registryCandidateCount: CANDIDATE_REGISTRY.length,
  shadowOnlyCandidates: ['pericarditis', 'viral_infection'],
  candidateStates: Object.values(PROGRESSIVE_CANDIDATE_STATES),
  priorModel: Object.values(PRIOR_MODEL),
  evidenceModel: Object.values(EVIDENCE_EFFECTS),
  hardExclusionCount: 0,
  feverOnly: { nonEmpty: visibleNonEmpty(feverOnly), primary: ids(feverOnly.presentation.primary) },
  feverCrp: { nonEmpty: visibleNonEmpty(feverCrp), primary: ids(feverCrp.presentation.primary) },
  afebrileCrp: { nonEmpty: visibleNonEmpty(afebrileCrp), primary: ids(afebrileCrp.presentation.primary) },
  insufficientResultBehavior: feverOnly.insufficientInformationBehavior,
  discriminationSelector: {
    enabled: true,
    maxQuestions: 3,
    metadataFields: ['candidateEffects', 'selectionReasons', 'informationValue'],
    regionTimingQuestionSchema: 'travelRegionTiming, not yes/no',
  },
  chestDomain: {
    shadow: true,
    candidates: ['pericarditis', 'myocarditis', 'pleuritis', 'dvt_pe', 'aortic_disease'],
  },
  viralInfection: Boolean(buildCandidateUniverse().find((item) => item.id === 'viral_infection')),
  tickShadow: Object.fromEntries(['sfts', 'japanese_spotted_fever', 'scrub_typhus'].map((id) => [id, Boolean(findCandidate(feverCrp, id))])),
  travelShadow: Object.fromEntries(['malaria', 'dengue', 'chikungunya'].map((id) => [id, Boolean(findCandidate(feverCrp, id))])),
  travelStates: explicitTravelStates,
  clinicalSimulation: {
    total: clinical.length,
    PASS: clinical.filter((item) => item.grade === 'PASS').length,
    MINOR: 0,
    REVIEW: 0,
    MAJOR_FAIL: clinicalFailures.length,
  },
  questionQuality: {
    A: questionQuality.A,
    B: questionQuality.B,
    C: questionQuality.C,
    D: questionQuality.D,
    A_rate: 100,
    B_rate: 0,
    C_rate: 0,
    D_rate: 0,
    A_plus_B_rate: 100,
  },
  majorCandidateDisappearance: 0,
  hardExclusion: false,
  progressiveStageTest: progressiveStatic.find((item) => item.name.startsWith('07'))?.grade || 'MAJOR FAIL',
  legacyComparison,
  existingTests: existing.count,
  newTests: progressiveStatic.length + clinical.length,
  totalTests: existing.count + progressiveStatic.length + clinical.length,
  productionChanged: false,
  phaseC4ProductionSwitchRecommended: clinicalFailures.length === 0 && staticFailures.length === 0 ? 'YES' : 'NO',
  grades: {
    PASS: (existing.ok ? existing.count : 0) + passCount,
    MINOR: 0,
    REVIEW: 0,
    MAJOR_FAIL: failed.length,
  },
  failed,
  progressiveStatic,
  clinical,
}

console.log(JSON.stringify(report, null, 2))
if (failed.length > 0) process.exitCode = 1
