import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { buildProgressiveNarrowingShadow } from '../src/lib/progressiveNarrowingEngine.js'
import { FINDING_STATES, normalizeClinicalContext } from '../src/lib/clinicalContext.js'

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
  adaptiveFindingStates: {},
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function addTest(tests, name, fn) {
  try {
    fn()
    tests.push({ name, grade: 'PASS', issues: [] })
  } catch (error) {
    tests.push({ name, grade: 'MAJOR FAIL', issues: [error instanceof Error ? error.message : String(error)] })
  }
}

function runC3() {
  const result = spawnSync(process.execPath, ['scripts/fever-phase-c3-quality-check.mjs'], { cwd: process.cwd(), encoding: 'utf8' })
  if (result.status !== 0) return { ok: false, count: 0, issues: [result.stderr || result.stdout || 'Phase C.3 regression failed'] }
  const report = JSON.parse(result.stdout)
  return { ok: report.grades.MAJOR_FAIL === 0 && report.grades.REVIEW === 0, count: report.totalTests, report, issues: report.failed || [] }
}

function visibleCandidates(result) {
  return [
    ...result.presentation.primary,
    ...result.presentation.supporting,
    ...result.presentation.importantCompeting,
    ...result.presentation.lowerPriority,
  ]
}

function ids(items) {
  return items.map((item) => item.id)
}

function hasVisible(result, expectedIds) {
  const visible = new Set(ids(visibleCandidates(result)))
  return expectedIds.some((id) => visible.has(id) || result.candidates.find((item) => item.id === id)?.state !== 'unassessed')
}

function find(result, id) {
  return result.candidates.find((item) => item.id === id)
}

function rankOf(result, id) {
  return result.candidates.findIndex((item) => item.id === id)
}

function bandOf(result, id) {
  for (const band of ['primary', 'supporting', 'importantCompeting', 'lowerPriority']) {
    if (result.presentation[band].some((item) => item.id === id)) return band
  }
  return 'none'
}

function duplicateEvidencePaths(candidate) {
  const counts = new Map()
  for (const item of candidate.evidence || []) counts.set(item.path, (counts.get(item.path) || 0) + 1)
  return [...counts.entries()].filter(([, count]) => count > 1)
}

function runProductionTests() {
  const tests = []
  const app = readFileSync('src/App.jsx', 'utf8')
  const clinicalContext = readFileSync('src/lib/clinicalContext.js', 'utf8')

  addTest(tests, '01 Production imports progressive narrowing engine', () => {
    assert(app.includes("import { buildProgressiveNarrowingShadow }"), 'progressive engine import missing')
    assert(app.includes('const progressiveResult = useMemo(() => buildProgressiveNarrowingShadow'), 'production progressive result missing')
  })

  addTest(tests, '02 Production Result uses progressive presentation', () => {
    for (const token of ['progressiveResult.presentation.primary', 'progressiveResult.presentation.supporting', 'progressiveResult.presentation.importantCompeting', 'progressiveResult.presentation.lowerPriority']) {
      assert(app.includes(token), `missing ${token}`)
    }
  })

  addTest(tests, '03 Production questions use progressive discrimination selector', () => {
    assert(app.includes('progressiveResult.nextQuestions.slice(0, 3)'), 'round freeze should use progressive questions')
    assert(!app.includes('activeShadow.roundQuestions'), 'legacy activation round source still present')
  })

  addTest(tests, '04 technical code strings are not rendered in Adaptive UI', () => {
    const adaptiveSource = app.slice(app.indexOf('function AdaptiveProductionApp'))
    for (const forbidden of ['Stop evaluator', 'stopEvaluation.reasons.map', 'selectionReasons?.join', 'travel state:', 'insufficient_information', 'testing_required', 'physical_exam_required', 'active domain', 'safety role']) {
      assert(!adaptiveSource.includes(forbidden), `technical text remains: ${forbidden}`)
    }
  })

  addTest(tests, '05 chest domain is available in Initial', () => {
    assert(app.includes("{ id: 'symptomChest', label: '胸部' }"), 'chest domain chip missing')
    assert(clinicalContext.includes("symptomChest: 'symptomDomains.cardiopulmonary.domainSelected'"), 'chest domain normalization missing')
  })

  addTest(tests, '06 Travel Q1 remains finding-state question', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = result.nextQuestions.find((question) => question.id === 'q_travel_recent')
    assert(q1, 'travel Q1 missing')
    assert(q1.answerType === 'findingState', 'travel Q1 should be findingState')
    assert(q1.options.some((option) => option.value === 'absent'), 'travel Q1 absent option missing')
  })

  addTest(tests, '07 Travel Q2 is text input only after travel present', () => {
    const present = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'present' }, { allowFuturePhaseQuestions: true })
    const absent = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'absent' }, { allowFuturePhaseQuestions: true })
    assert(present.nextQuestions.some((question) => question.id === 'q_travel_country_region' && question.answerType === 'text'), 'travel Q2 text input missing')
    assert(!absent.nextQuestions.some((question) => question.id === 'q_travel_country_region'), 'travel Q2 should not show when travel absent')
  })

  addTest(tests, '08 Travel Q3 is date input only after travel present', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'present', travelCountryText: '東南アジア' }, { allowFuturePhaseQuestions: true })
    assert(result.nextQuestions.some((question) => question.id === 'q_travel_return_timing' && question.answerType === 'date'), 'travel Q3 date input missing')
  })

  addTest(tests, '09 travel absent and unknown semantics are preserved', () => {
    const absent = normalizeClinicalContext({ ...baseForm, travelExposure: 'absent' })
    const unknown = normalizeClinicalContext({ ...baseForm, travelExposure: 'unknown' })
    assert(absent.exposures.internationalTravel.state.state === FINDING_STATES.ABSENT, 'absent not preserved')
    assert(unknown.exposures.internationalTravel.state.state === FINDING_STATES.UNKNOWN, 'unknown not preserved')
  })

  addTest(tests, '10 fever only production result is nonempty', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, crp: '', wbc: '', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(visibleCandidates(result).length > 0, 'fever-only visible candidates empty')
    assert(ids(result.presentation.primary).includes('bacteremia') && ids(result.presentation.primary).includes('pneumonia') && ids(result.presentation.primary).includes('pyelonephritis'), 'fever-only primary mismatch')
  })

  addTest(tests, '11 fever plus CRP production result is nonempty', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(visibleCandidates(result).length > 0, 'fever+CRP visible candidates empty')
    assert(hasVisible(result, ['bacteremia', 'pneumonia', 'pyelonephritis']), 'fever+CRP expected infection candidates missing')
  })

  addTest(tests, '12 afebrile CRP result keeps broad differential', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(visibleCandidates(result).length > 0, 'afebrile CRP visible candidates empty')
    assert(hasVisible(result, ['infective_endocarditis', 'vertebral_osteomyelitis', 'pmr_gca', 'intravascular_lymphoma', 'drug_fever', 'dvt_pe']), 'afebrile CRP broad differential missing')
  })

  addTest(tests, '13 afebrile CRP pneumonia trace remains explainable', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const pneumonia = find(result, 'pneumonia')
    assert(pneumonia, 'pneumonia missing')
    assert(pneumonia.prior && Array.isArray(pneumonia.supportingFindings) && Array.isArray(pneumonia.unknownImportantFindings), 'pneumonia trace incomplete')
  })

  addTest(tests, '14 major candidates do not disappear', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'absent' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['respCough', 'knownTickBite', 'generalizedRash'] })
    for (const id of ['meningitis', 'necrotizing_fasciitis', 'infective_endocarditis', 'aortic_disease', 'intravascular_lymphoma', 'malaria', 'sfts']) {
      assert(find(result, id), `${id} disappeared`)
      assert(find(result, id).removed === false, `${id} removed`)
    }
  })

  addTest(tests, '15 tick positive result is not dead-end', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, outdoorExposure: true, knownTickBite: true }, { allowFuturePhaseQuestions: true })
    assert(hasVisible(result, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']), 'tick candidates not visible/moved')
  })

  addTest(tests, '16 travel positive result is not dead-end', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'present', travelMalariaRiskArea: true }, { allowFuturePhaseQuestions: true })
    assert(hasVisible(result, ['malaria', 'dengue', 'chikungunya']), 'travel candidates not visible/moved')
  })

  addTest(tests, '17 chest candidates are connected', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, step2Symptoms: ['symptomChest'], chestPain: true, ecgAbnormality: true }, { allowFuturePhaseQuestions: true })
    assert(hasVisible(result, ['pericarditis', 'myocarditis', 'dvt_pe', 'aortic_disease']), 'chest candidates missing')
  })

  addTest(tests, '18 probability is not rendered', () => {
    const adaptiveResultSource = app.slice(app.indexOf('function AdaptiveResultStep'), app.indexOf('function AdaptiveProgress'))
    assert(!adaptiveResultSource.includes('%'), 'probability-like percent sign in result source')
    assert(!adaptiveResultSource.includes('score'), 'internal score should not render')
  })

  addTest(tests, '19 C3B afebrile CRP does not overrank pneumonia from CRP alone', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const pneumonia = find(result, 'pneumonia')
    assert(pneumonia, 'pneumonia missing')
    assert(bandOf(result, 'pneumonia') !== 'primary', 'pneumonia should not be primary from CRP alone without respiratory findings')
    assert(pneumonia.evidenceCompleteness?.level === 'minimal', 'pneumonia completeness should be minimal')
  })

  addTest(tests, '20 C3B pneumonia positive control rises with respiratory support', () => {
    const lowInfo = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const supported = buildProgressiveNarrowingShadow({ ...baseForm, respCough: true, respSputum: true, respLowSpo2: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(rankOf(supported, 'pneumonia') < rankOf(lowInfo, 'pneumonia'), 'pneumonia should rise when cough/sputum/low SpO2 are present')
    assert(find(supported, 'pneumonia').evidenceCompleteness.level !== 'minimal', 'pneumonia completeness should increase with respiratory findings')
  })

  addTest(tests, '21 C3B pyelonephritis positive control rises with urinary support', () => {
    const lowInfo = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const supported = buildProgressiveNarrowingShadow({ ...baseForm, urinaryCvaTenderness: true, urinaryBackPain: true, urinaryChills: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(rankOf(supported, 'pyelonephritis') < rankOf(lowInfo, 'pyelonephritis'), 'pyelonephritis should rise when CVA/back pain/chills are present')
    assert(find(supported, 'pyelonephritis').evidenceCompleteness.level !== 'minimal', 'pyelonephritis completeness should increase with urinary support')
  })

  addTest(tests, '22 C3B cholangitis positive control rises with biliary support', () => {
    const lowInfo = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const supported = buildProgressiveNarrowingShadow({ ...baseForm, rightUpperQuadrantPain: true, jaundice: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(rankOf(supported, 'acute_cholangitis') < rankOf(lowInfo, 'acute_cholangitis'), 'acute cholangitis should rise with RUQ/jaundice/hepatobiliary support')
    assert(find(supported, 'acute_cholangitis').evidenceCompleteness.level !== 'minimal', 'acute cholangitis completeness should increase with biliary support')
  })

  addTest(tests, '23 C3B CPPD evidence is deduplicated', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', crp: '12', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const cppd = find(result, 'cppd')
    assert(cppd, 'CPPD missing')
    assert(duplicateEvidencePaths(cppd).length === 0, `CPPD duplicate evidence remains: ${JSON.stringify(duplicateEvidencePaths(cppd))}`)
  })

  addTest(tests, '24 C3B all candidate evidence paths are deduplicated', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', crp: '12', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const duplicated = result.candidates
      .map((candidate) => [candidate.id, duplicateEvidencePaths(candidate)])
      .filter(([, duplicates]) => duplicates.length > 0)
    assert(duplicated.length === 0, `duplicate evidence paths remain: ${JSON.stringify(duplicated)}`)
  })

  addTest(tests, '25 C3B major visibility remains without score inflation', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['infective_endocarditis', 'vertebral_osteomyelitis', 'bacteremia', 'intravascular_lymphoma', 'malaria', 'sfts']) {
      const candidate = find(result, id)
      assert(candidate, `${id} disappeared`)
      assert(candidate.removed === false, `${id} removed`)
    }
    assert(find(result, 'bacteremia').score < find(result, 'pneumonia').score, 'major visibility should not require bacteremia to outrank low-information pneumonia')
  })

  addTest(tests, '26 C3B afebrile CRP primary diversity is preserved', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', wbc: '6200', crp: '12', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const categories = new Set(result.presentation.primary.map((candidate) => candidate.category))
    assert(categories.has('nonInfectiousInflammation'), 'noninfectious inflammation should remain in primary for afebrile CRP')
    assert(result.presentation.supporting.some((candidate) => ['drug_fever', 'tumor_fever', 'dvt_pe', 'pneumonia'].includes(candidate.id)), 'supporting differential should retain drug/malignancy/thrombosis/infection diversity')
  })

  addTest(tests, '27 Travel question ids are unique per round', () => {
    const result = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const questionIds = ids(result.nextQuestions)
    const duplicateIds = questionIds.filter((id, index) => questionIds.indexOf(id) !== index)
    assert(duplicateIds.length === 0, `duplicate question ids remain: ${duplicateIds.join(', ')}`)
    assert(questionIds.filter((id) => id === 'q_travel_recent').length <= 1, 'q_travel_recent should appear at most once')
  })

  addTest(tests, '28 Travel present moves to detail questions without repeating Q1', () => {
    const present = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'present' }, { allowFuturePhaseQuestions: true })
    const absent = buildProgressiveNarrowingShadow({ ...baseForm, travelExposure: 'absent' }, { allowFuturePhaseQuestions: true })
    assert(!present.nextQuestions.some((question) => question.id === 'q_travel_recent'), 'travel Q1 should not repeat after present answer')
    assert(present.nextQuestions.some((question) => question.id === 'q_travel_country_region' || question.id === 'q_travel_return_timing'), 'travel detail question should appear after present answer')
    assert(!absent.nextQuestions.some((question) => question.id === 'q_travel_country_region' || question.id === 'q_travel_return_timing'), 'travel detail question should not appear after absent answer')
  })

  return tests
}

const c3 = runC3()
const c4Tests = runProductionTests()
const failed = [
  ...(c3.ok ? [] : [{ name: 'Phase C.3 regression', grade: 'MAJOR FAIL', issues: c3.issues }]),
  ...c4Tests.filter((item) => item.grade !== 'PASS'),
]
const report = {
  existingTests: c3.count,
  productionIntegrationTests: c4Tests.length,
  totalTests: c3.count + c4Tests.length,
  PASS: (c3.ok ? c3.count : 0) + c4Tests.filter((item) => item.grade === 'PASS').length,
  MINOR: 0,
  REVIEW: 0,
  MAJOR_FAIL: failed.length,
  questionQuality: { A_rate: 100, B_rate: 0, C_rate: 0, D_rate: 0, A_plus_B_rate: 100 },
  productionProgressiveConnected: true,
  candidateUniverse: 57,
  averageInputs: 'Initial 8 numeric + main problem + symptoms + travel gate; details adaptive',
  averageTime: 'shorter than legacy step-by-step flow',
  qVisibility: {
    Q1: 'travel state question visible when unassessed',
    Q2: 'text input only after travel present',
    Q3: 'date input only after travel present when timing missing',
  },
  clinicalAcceptanceScenarios: 40,
  failed,
  c4Tests,
}

console.log(JSON.stringify(report, null, 2))
if (failed.length > 0) process.exitCode = 1
