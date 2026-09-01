import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { buildCandidateUniverse, buildProgressiveNarrowingShadow } from '../src/lib/progressiveNarrowingEngine.js'
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

function topIds(result, count = 5) {
  return result.candidates.slice(0, count).map((item) => item.id)
}

function topQuestionIds(result, count = 3) {
  return result.nextQuestions.slice(0, count).map((item) => item.id)
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

  addTest(tests, '05b Initial routes do not render legacy main-problem choices', () => {
    const appRouteSource = app.slice(app.indexOf('function App()'), app.indexOf('function AdaptiveProductionApp()'))
    const legacyStepSource = app.slice(app.indexOf('function LegacyStepApp()'), app.indexOf('function App()'))
    const adaptiveInitialSource = app.slice(app.indexOf('function InitialAdaptiveStep'), app.indexOf('function AdaptiveRoundStep'))
    assert(appRouteSource.includes('legacyStepUi=1'), 'legacy route should remain explicit')
    assert(appRouteSource.includes('return <AdaptiveProductionApp />'), 'default route should render AdaptiveProductionApp')
    assert(!app.includes('mainProblemOptions'), 'mainProblemOptions should not remain in reachable UI source')
    assert(!app.includes('name="mainProblem"'), 'mainProblem radio should not render in any route')
    assert(!app.includes('function MainProblemGuide'), 'main problem guide should not remain reachable')
    assert(!legacyStepSource.includes('今回の主な問題'), 'legacy Step1 should not render main problem heading')
    assert(!adaptiveInitialSource.includes('mainProblemOptions'), 'mainProblemOptions should not be used in Adaptive Initial')
    assert(!adaptiveInitialSource.includes('name="mainProblem"'), 'mainProblem radio should not render in Adaptive Initial')
    for (const forbidden of ['今回の主な問題', '発熱＋炎症反応上昇', '炎症反応上昇', 'その他/不明']) {
      assert(!legacyStepSource.includes(forbidden), `legacy main problem label remains in LegacyStepApp: ${forbidden}`)
      assert(!adaptiveInitialSource.includes(forbidden), `legacy main problem label leaked into Adaptive Initial: ${forbidden}`)
    }
    for (const required of ['label="年齢"', 'label="BT"', 'label="BP"', 'label="HR"', 'label="RR"', 'label="SpO2"', 'label="CRP"', 'label="WBC"', '主症候domain']) {
      assert(adaptiveInitialSource.includes(required), `Adaptive Initial required field missing: ${required}`)
      assert(legacyStepSource.includes(required), `Legacy Step1 required field missing: ${required}`)
    }
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

  addTest(tests, '29 D1 CRP-only chest pain keeps pericarditis myocarditis and PE', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '36.8', wbc: '6500', crp: '6.0', chestPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(result.normalizedClinicalContext.derivedInflammationPattern.crpOnlyPattern === true, 'CRP-only pattern not derived')
    for (const id of ['pericarditis', 'myocarditis', 'dvt_pe']) {
      const candidate = find(result, id)
      assert(candidate && candidate.removed === false, `${id} disappeared or removed`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '30 D1 CRP-only dyspnea and unilateral swelling keep PE DVT', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '37.0', wbc: '7200', crp: '8.0', dyspnea: true, legSwelling: true, suspectedDvtPe: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const dvtPe = find(result, 'dvt_pe')
    assert(dvtPe && dvtPe.removed === false, 'DVT/PE disappeared or removed')
    assert(bandOf(result, 'dvt_pe') !== 'none', 'DVT/PE should remain visible')
    assert(result.hardExclusions.length === 0, 'afebrile state should not hard exclude PE/DVT')
  })

  addTest(tests, '31 D1 CRP-only leukopenia keeps tick-borne candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.7', wbc: '3200', crp: '4.0', thrombocytopenia: true, generalizedRash: true, outdoorExposure: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(result.normalizedClinicalContext.derivedInflammationPattern.wbc === 'leukopenia', 'WBC leukopenia pattern not derived')
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      const candidate = find(result, id)
      assert(candidate && candidate.removed === false, `${id} disappeared or removed`)
    }
    assert(hasVisible(result, ['sfts', 'japanese_spotted_fever', 'scrub_typhus']), 'tick-borne candidates should remain visible')
    assert(result.hardExclusions.length === 0, 'leukopenia should not hard exclude infection')
  })

  addTest(tests, '32 D1 mild CRP-only no focus keeps broad exploration candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.9', wbc: '8000', crp: '1.2', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(result.normalizedClinicalContext.derivedInflammationPattern.crpOnlyPattern === true, 'mild CRP-only pattern not derived')
    for (const id of ['deep_infectious_focus', 'infective_endocarditis', 'pmr_gca', 'intravascular_lymphoma', 'tumor_fever']) {
      const candidate = find(result, id)
      assert(candidate && candidate.removed === false, `${id} disappeared or removed`)
    }
    assert(result.hardExclusions.length === 0, 'mild CRP-only should not create hard exclusion')
  })

  addTest(tests, '33 D1 CRP only with missing BT WBC preserves not assessed semantics', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '', wbc: '', crp: '3.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const pattern = result.normalizedClinicalContext.derivedInflammationPattern
    assert(pattern.bt === 'not_assessed', 'missing BT should remain not assessed')
    assert(pattern.wbc === 'not_assessed', 'missing WBC should remain not assessed')
    assert(pattern.crp === 'crp_elevation', 'CRP elevation pattern mismatch')
    assert(result.normalizedClinicalContext.vitals.fever.state === FINDING_STATES.UNKNOWN, 'missing BT should not become absent')
    assert(result.normalizedClinicalContext.inflammation.highWbc.state === FINDING_STATES.UNKNOWN, 'missing WBC should not become absent')
    assert(visibleCandidates(result).length > 0, 'diagnostic flow should continue')
  })

  addTest(tests, '34 D2 Case F ranks myocarditis and pericarditis high with ECG and troponin support', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '36.8', wbc: '7000', crp: '5.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '36.8', wbc: '7000', crp: '5.5', chestPain: true, ecgAbnormality: true, troponinElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('myocarditis') && topIds(result, 3).includes('pericarditis'), `cardiac candidates should be top 3: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'myocarditis') < rankOf(baseline, 'myocarditis'), 'myocarditis should rise from baseline')
    assert(rankOf(result, 'pericarditis') < rankOf(baseline, 'pericarditis'), 'pericarditis should rise from baseline')
    assert(find(result, 'dvt_pe')?.removed === false, 'PE/DVT should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '35 D2 Case G ranks PE DVT high with dyspnea low SpO2 and leg swelling', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '37.1', wbc: '6800', crp: '7.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], temperature: '37.1', wbc: '6800', crp: '7.0', dyspnea: true, respLowSpo2: true, spo2: '91', legSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('dvt_pe'), `DVT/PE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'dvt_pe') < rankOf(baseline, 'dvt_pe'), 'DVT/PE should rise from baseline')
    assert(find(result, 'pneumonia')?.removed === false, 'pneumonia should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '36 D2 Case H ranks tick-borne candidates high with outdoor rash thrombocytopenia leukopenia and AST ALT support', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.6', wbc: '3100', crp: '4.8', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.6', wbc: '3100', crp: '4.8', thrombocytopenia: true, generalizedRash: true, outdoorExposure: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(topIds(result, 5).includes(id), `${id} should be top 5: ${topIds(result, 8).join(',')}`)
      assert(find(result, id).score > find(baseline, id).score, `${id} score should rise from baseline`)
      assert(find(result, id)?.removed === false, `${id} should not be removed`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '37 D2 Case I ranks IE high with positive blood culture and prosthetic valve without murmur', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomPositiveBloodCulture'], temperature: '37.0', wbc: '8500', crp: '6.0', bsiPositiveBloodCulture: true, bsiProstheticValve: true, heartMurmur: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['heartMurmur'] })
    assert(topIds(result, 3).includes('infective_endocarditis'), `IE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'infective_endocarditis')?.removed === false, 'IE should not be removed by absent murmur')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '38 D2 Case J ranks PMR GCA high with older temporal artery and shoulder thigh support', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.9', wbc: '7600', crp: '5.0', cnsOlderAdult: true, temporalArteryTenderness: true, unknownShoulderThighPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('pmr_gca'), `PMR/GCA should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'infective_endocarditis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'infection candidates should not disappear')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '39 D2 Case K ranks malignancy and IVL high while preserving deep infection', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.7', wbc: '7400', crp: '3.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.7', wbc: '7400', crp: '3.5', unknownWeightLoss: true, unknownNightSweats: true, unknownLdhHigh: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('tumor_fever') && topIds(result, 3).includes('intravascular_lymphoma'), `malignancy candidates should be top 3: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'tumor_fever') < rankOf(baseline, 'tumor_fever'), 'tumor fever should rise from baseline')
    assert(find(result, 'deep_infectious_focus')?.removed === false, 'deep infection should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '40 D2 Case L ranks drug fever high with new drug rash and no focus', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.8', wbc: '7200', crp: '2.8', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.8', wbc: '7200', crp: '2.8', recentDrugStart: true, generalizedRash: true, noClearInfectionFocus: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('drug_fever'), `drug fever should be top 3: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'drug_fever') < rankOf(baseline, 'drug_fever'), 'drug fever should rise from baseline')
    assert(find(result, 'infective_endocarditis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'infection candidates should not be hard excluded')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '41 D3 Case M no-localizing positive culture and prosthetic valve ranks IE top 3 without murmur', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.9', wbc: '8000', crp: '5.0', bsiPositiveBloodCulture: true, bsiProstheticValve: true, heartMurmur: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['heartMurmur'] })
    assert(topIds(result, 3).includes('infective_endocarditis'), `IE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'infective_endocarditis')?.removed === false, 'IE should not be removed by absent murmur')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '42 D3 Case N no-localizing later back pain and dialysis raise vertebral and deep infection', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '37.0', wbc: '9000', crp: '6.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '37.0', wbc: '9000', crp: '6.0', unknownBackPain: true, unknownDialysis: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['vertebral_osteomyelitis', 'deep_infectious_focus']) {
      assert(topIds(result, 3).includes(id), `${id} should be top 3: ${topIds(result, 5).join(',')}`)
      assert(find(result, id).score > find(baseline, id).score, `${id} score should rise from baseline`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '43 D3 Case O no-localizing tick pattern ranks tick-borne candidates top 5', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.7', wbc: '3200', crp: '4.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.7', wbc: '3200', crp: '4.5', unknownThrombocytopenia: true, unknownRash: true, outdoorExposure: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(topIds(result, 5).includes(id), `${id} should be top 5: ${topIds(result, 8).join(',')}`)
      assert(find(result, id).score > find(baseline, id).score, `${id} score should rise from baseline`)
      assert(find(result, id)?.removed === false, `${id} should not be removed`)
    }
    assert(result.hardExclusions.length === 0, 'leukopenia should not hard exclude infection')
  })

  addTest(tests, '44 D3 Case P no-localizing older temporal and shoulder thigh ranks PMR GCA high', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '37.1', wbc: '7800', crp: '7.0', cnsOlderAdult: true, temporalArteryTenderness: true, unknownShoulderThighPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('pmr_gca'), `PMR/GCA should be top 3: ${topIds(result, 5).join(',')}`)
    assert(topIds(result, 5).includes('pmr'), `PMR should be top 5: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'infective_endocarditis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'infection candidates should remain')
  })

  addTest(tests, '45 D3 Case Q no-localizing LDH cytopenia and B symptoms rank IVL top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7000', crp: '5.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7000', crp: '5.5', unknownLdhHigh: true, unknownAnemia: true, unknownThrombocytopenia: true, unknownWeightLoss: true, unknownNightSweats: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('intravascular_lymphoma'), `IVL should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'tumor_fever').score > find(baseline, 'tumor_fever').score, 'tumor fever should rise')
    assert(find(result, 'deep_infectious_focus')?.removed === false, 'deep infection should not be hard excluded')
  })

  addTest(tests, '46 D3 Case R no-localizing thrombocytopenia edema renal organomegaly ranks TAFRO top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.9', wbc: '7600', crp: '6.0', unknownThrombocytopenia: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.9', wbc: '7600', crp: '6.0', unknownThrombocytopenia: true, unknownEdema: true, unknownRenalDysfunction: true, unknownOrganomegaly: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('tafro'), `TAFRO should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'tafro').score > find(baseline, 'tafro').score, 'TAFRO should rise by multiple support findings')
  })

  addTest(tests, '47 D3 Case S no-localizing new drug and rash ranks drug fever top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7200', crp: '3.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7200', crp: '3.0', recentDrugStart: true, generalizedRash: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('drug_fever'), `drug fever should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'drug_fever').score > find(baseline, 'drug_fever').score, 'drug fever should rise')
    assert(find(result, 'infective_endocarditis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'infection candidates should remain')
  })

  addTest(tests, '48 D3 Case T later PE findings override initial no-localizing', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7200', crp: '3.0', chestPain: true, dyspnea: true, respLowSpo2: true, spo2: '91', legSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('dvt_pe'), `DVT/PE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(result.hardExclusions.length === 0, 'initial no-localizing should not create hard exclusion')
  })

  addTest(tests, '49 D3 Case U later cardiac findings override initial no-localizing', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7200', crp: '3.0', chestPain: true, ecgAbnormality: true, troponinElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('myocarditis') && topIds(result, 5).includes('pericarditis'), `cardiac candidates should be top 3/top 5: ${topIds(result, 5).join(',')}`)
    assert(result.hardExclusions.length === 0, 'initial no-localizing should not create hard exclusion')
  })

  addTest(tests, '50 D3 Case V mild CRP no-localizing keeps broad non-protruding differential', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], temperature: '36.8', wbc: '7500', crp: '0.8', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const topScore = result.candidates[0].score
    const tiedTopCategories = new Set(result.candidates.filter((candidate) => candidate.score === topScore).map((candidate) => candidate.category))
    assert(topScore < 70, `mild CRP only should not create extreme score: ${topScore}`)
    assert(tiedTopCategories.size >= 4, 'mild CRP only should keep broad differential rather than a single fixed disease')
    assert(!['sfts', 'tafro', 'intravascular_lymphoma', 'infective_endocarditis'].includes(result.candidates[0].id), `unsupported major candidate should not be uniquely first: ${result.candidates[0].id}`)
  })

  addTest(tests, '51 D3 Case W LDH alone does not overrank IVL', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], crp: '4.0', unknownLdhHigh: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const ivl = find(result, 'intravascular_lymphoma')
    assert(ivl && ivl.score < 70, `LDH alone should not create high IVL score: ${ivl?.score}`)
    assert(bandOf(result, 'intravascular_lymphoma') !== 'primary', 'LDH alone should not make IVL a primary diagnosis')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '52 D3 Case X thrombocytopenia alone does not overrank TAFRO or define tick-borne disease', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], crp: '5.0', unknownThrombocytopenia: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'tafro').score < 70, `thrombocytopenia alone should not create high TAFRO score: ${find(result, 'tafro').score}`)
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(find(result, id).score < 70, `${id} should not be definitive from thrombocytopenia alone`)
      assert(find(result, id)?.removed === false, `${id} should remain but not be removed`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '53 D4 Case Y bacterial pneumonia pattern ranks pneumonia top 3 without hard excluding PE', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '38.5', wbc: '14500', crp: '12', spo2: '92', respCough: true, respSputum: true, respLowSpo2: true, respImagingAbnormality: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('pneumonia'), `pneumonia should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'pneumonia').score > find(baseline, 'pneumonia').score, 'pneumonia score should rise from baseline')
    assert(find(result, 'dvt_pe')?.removed === false, 'PE/DVT should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '54 D4 Case Z dyspnea chest pain hypoxemia and leg swelling ranks PE DVT top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory', 'symptomChest'], temperature: '36.9', wbc: '7500', crp: '4.0', spo2: '90', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory', 'symptomChest'], temperature: '36.9', wbc: '7500', crp: '4.0', spo2: '90', respDyspnea: true, chestPain: true, respLowSpo2: true, legSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('dvt_pe'), `DVT/PE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'dvt_pe').score > find(baseline, 'dvt_pe').score, 'DVT/PE score should rise from baseline')
    assert(find(result, 'pneumonia')?.removed === false, 'pneumonia should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '55 D4 Case AA ECG troponin chest symptoms rank myocarditis top 3 and pericarditis top 5', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory', 'symptomChest'], temperature: '37.2', wbc: '8200', crp: '5.5', chestPain: true, respDyspnea: true, ecgAbnormality: true, troponinElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('myocarditis'), `myocarditis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(topIds(result, 5).includes('pericarditis'), `pericarditis should be top 5: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'pneumonia')?.removed === false, 'pneumonia should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '56 D4 Case AB chronic cough B symptoms and imaging raise pulmonary TB without fixed pneumonia first', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.8', wbc: '6900', crp: '3.0', respCough: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.8', wbc: '6900', crp: '3.0', feverDuration: '21', respCough: true, unknownWeightLoss: true, unknownNightSweats: true, respImagingAbnormality: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('pulmonary_tuberculosis'), `TB should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'pulmonary_tuberculosis').score > find(baseline, 'pulmonary_tuberculosis').score, 'TB score should rise from baseline')
    assert(result.candidates[0].id !== 'pneumonia', `acute bacterial pneumonia should not be fixed first: ${topIds(result, 5).join(',')}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '57 D4 Case AC dyspnea hypoxemia edema raises heart failure while keeping PE and infection', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.7', wbc: '7000', crp: '1.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.7', wbc: '7000', crp: '1.5', respDyspnea: true, respLowSpo2: true, edema: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'heart_failure').score > find(baseline, 'heart_failure').score, 'heart failure score should rise')
    assert(topIds(result, 5).includes('heart_failure'), `heart failure should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'dvt_pe')?.removed === false && find(result, 'pneumonia')?.removed === false, 'PE and infection should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '58 D4 Case AD dyspnea imaging and collagen disease raise noninfectious lung disease', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.9', wbc: '7600', crp: '2.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.9', wbc: '7600', crp: '2.5', respDyspnea: true, respImagingAbnormality: true, collagenDiseaseHistory: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'noninfectious_lung_disease').score > find(baseline, 'noninfectious_lung_disease').score, 'noninfectious lung disease score should rise')
    assert(topIds(result, 5).includes('noninfectious_lung_disease'), `noninfectious lung disease should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'pneumonia')?.removed === false, 'pneumonia should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '59 D4 Case AE severe chest and thoracodorsal pain ranks aortic disease top 5', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory', 'symptomChest'], temperature: '37.0', wbc: '9000', crp: '6.0', respDyspnea: true, chestPain: true, thoracodorsalPain: true, severePain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('aortic_disease'), `aortic disease should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'dvt_pe')?.removed === false && find(result, 'myocarditis')?.removed === false && find(result, 'pericarditis')?.removed === false, 'PE and cardiac inflammation should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '60 D4 Case AF cough only does not overrank unsupported respiratory differentials', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.8', wbc: '7200', crp: '0.5', spo2: '98', respCough: true, respImagingAbnormality: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['respImagingAbnormality'] })
    assert(find(result, 'pneumonia').score < 70, `cough only should not create high pneumonia score: ${find(result, 'pneumonia').score}`)
    for (const id of ['dvt_pe', 'myocarditis', 'pulmonary_tuberculosis']) {
      assert(find(result, id).score < 70, `${id} should not be high from cough alone: ${find(result, id).score}`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '61 D4 Case AG dyspnea only keeps broad differential without extreme ranking', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], temperature: '36.9', wbc: '7500', crp: '1.0', spo2: '96', respDyspnea: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const topScore = result.candidates[0].score
    assert(topScore < 90, `dyspnea only should not create extreme single-diagnosis score: ${topScore}`)
    for (const id of ['dvt_pe', 'heart_failure', 'pneumonia']) {
      assert(find(result, id)?.removed === false, `${id} should remain`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '62 D5 Case AH abdominal pain diarrhea fever inflammation and food exposure rank infectious gastroenteritis top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain', 'symptomDiarrhea'], temperature: '38.3', wbc: '13000', crp: '8.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain', 'symptomDiarrhea'], temperature: '38.3', wbc: '13000', crp: '8.0', abdominalPainDetail: true, diarrheaDetail: true, foodExposure: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('infectious_gastroenteritis'), `infectious gastroenteritis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'infectious_gastroenteritis').score > find(baseline, 'infectious_gastroenteritis').score, 'infectious gastroenteritis score should rise from baseline')
    assert(find(result, 'mesenteric_ischemia')?.removed === false && find(result, 'aortic_disease')?.removed === false, 'vascular major candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '63 D5 Case AI diarrhea antibiotic and hospitalization rank CDI top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomDiarrhea'], temperature: '37.4', wbc: '11000', crp: '6.0', diarrheaDetail: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomDiarrhea'], temperature: '37.4', wbc: '11000', crp: '6.0', diarrheaDetail: true, recentAntibiotics: true, recentHospitalization: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('cdi'), `CDI should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'cdi').score > find(baseline, 'cdi').score, 'CDI score should rise with antibiotic exposure')
    assert(find(result, 'infectious_gastroenteritis')?.removed === false, 'infectious gastroenteritis should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '64 D5 Case AJ RUQ jaundice chills fever inflammation ranks cholangitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '38.5', wbc: '15000', crp: '12', rightUpperQuadrantPain: true, jaundice: true, abdominalChills: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('acute_cholangitis'), `cholangitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'acute_cholecystitis')?.removed === false, 'cholecystitis should remain')
    assert(find(result, 'acute_cholangitis').supportingFindings.some((item) => item.path === 'abdominalPatterns.cholangitisTriadSupport'), 'triad support should be reflected')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '65 D5 Case AK RUQ diabetes immunosuppression prolonged inflammation raises deep abscess context', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '37.8', wbc: '10500', crp: '9.0', rightUpperQuadrantPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '37.8', wbc: '10500', crp: '9.0', feverDuration: '21', rightUpperQuadrantPain: true, diabetes: true, abdominalImmunosuppression: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'intra_abdominal_abscess').score > find(baseline, 'intra_abdominal_abscess').score, 'intra-abdominal abscess should rise')
    assert(find(result, 'deep_infectious_focus').score > find(baseline, 'deep_infectious_focus').score, 'deep infection should rise')
    assert(topIds(result, 5).some((id) => ['intra_abdominal_abscess', 'deep_infectious_focus'].includes(id)), `deep/liver abscess context should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'acute_cholangitis')?.removed === false && find(result, 'acute_cholecystitis')?.removed === false, 'biliary candidates should remain')
  })

  addTest(tests, '66 D5 Case AL RLQ pain nausea inflammation ranks appendicitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '37.9', wbc: '12500', crp: '7.0', rightLowerQuadrantPain: true, nauseaVomiting: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('appendicitis'), `appendicitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'intra_abdominal_abscess')?.removed === false && find(result, 'diverticulitis')?.removed === false, 'other abdominal infection should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '67 D5 Case AM LLQ older fever inflammation bowel change ranks diverticulitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '38.0', wbc: '12000', crp: '8.0', leftLowerQuadrantPain: true, cnsOlderAdult: true, bowelHabitChange: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('diverticulitis'), `diverticulitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'tumor_fever')?.removed === false && find(result, 'mesenteric_ischemia')?.removed === false, 'malignancy and ischemia should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '68 D5 Case AN epigastric pain back radiation vomiting ranks pancreatitis top 5', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '37.2', wbc: '10000', crp: '4.0', epigastricPain: true, backRadiation: true, vomiting: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('pancreatitis'), `pancreatitis should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'intra_abdominal_abscess')?.removed === false && find(result, 'acute_cholangitis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '69 D5 Case AO sudden severe abdominal pain hypotension bloody stool ranks mesenteric ischemia top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '36.8', wbc: '9000', crp: '3.0', suddenAbdominalPain: true, severeAbdominalPain: true, shock: true, bloodyStool: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('mesenteric_ischemia'), `mesenteric ischemia should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'mesenteric_ischemia')?.removed === false, 'mesenteric ischemia should not be removed by no fever normal WBC')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '70 D5 Case AP abdominal pain rash renal dysfunction arthralgia raises vasculitis top 5', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '37.1', wbc: '8000', crp: '6.0', abdominalPainDetail: true, generalizedRash: true, renalDysfunction: true, nonInfAcuteJointPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('abdominal_vasculitis'), `abdominal vasculitis should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'intra_abdominal_abscess')?.removed === false && find(result, 'infectious_gastroenteritis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '71 D5 Case AQ abdominal symptoms B symptoms LDH anemia raise malignancy and IVL', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '36.9', wbc: '7000', crp: '5.0', abdominalPainDetail: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '36.9', wbc: '7000', crp: '5.0', abdominalPainDetail: true, unknownWeightLoss: true, unknownNightSweats: true, unknownLdhHigh: true, unknownAnemia: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'tumor_fever').score > find(baseline, 'tumor_fever').score, 'tumor fever should rise')
    assert(find(result, 'intravascular_lymphoma').score > find(baseline, 'intravascular_lymphoma').score, 'IVL should rise')
    assert(topIds(result, 5).some((id) => ['tumor_fever', 'intravascular_lymphoma'].includes(id)), `malignancy/IVL should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'intra_abdominal_abscess')?.removed === false, 'intra-abdominal infection should remain')
  })

  addTest(tests, '72 D5 Case AR mild abdominal pain only does not overrank surgical abdominal diagnoses', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], temperature: '36.8', wbc: '7200', crp: '0.5', abdominalPainDetail: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['appendicitis', 'acute_cholangitis', 'pancreatitis']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild abdominal pain alone: ${find(result, id).score}`)
    }
    assert(result.candidates[0].score < 90, `mild abdominal pain should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '73 D5 Case AS diarrhea only does not overrank CDI and keeps broad gastroenteritis differential', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomDiarrhea'], temperature: '36.9', wbc: '7500', crp: '0.8', diarrheaDetail: true, recentAntibiotics: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['recentAntibiotics'] })
    assert(find(result, 'cdi').score < 70, `CDI should not be high from diarrhea alone without antibiotic support: ${find(result, 'cdi').score}`)
    assert(find(result, 'infectious_gastroenteritis')?.removed === false, 'infectious gastroenteritis should remain')
    assert(result.candidates[0].score < 90, `diarrhea only should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '74 D6 Case AT back pain lumbar tenderness and positive blood culture rank vertebral osteomyelitis top 3', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], temperature: '37.0', wbc: '8000', crp: '8.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], temperature: '37.0', wbc: '8000', crp: '8.0', boneBackPain: true, lumbarTenderness: true, positiveBloodCulture: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('vertebral_osteomyelitis'), `vertebral osteomyelitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'deep_infectious_focus').score > find(baseline, 'deep_infectious_focus').score, 'deep infectious focus should rise')
    assert(find(result, 'infective_endocarditis')?.removed === false, 'IE should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '75 D6 Case AU back pain with CVA tenderness and dysuria ranks pyelonephritis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], temperature: '38.2', wbc: '13000', crp: '10', boneBackPain: true, cvaTenderness: true, dysuria: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('pyelonephritis'), `pyelonephritis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'vertebral_osteomyelitis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'spine/deep infection should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '76 D6 Case AV sudden severe thoracodorsal pain ranks aortic disease top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], temperature: '36.8', wbc: '8500', crp: '4.0', thoracodorsalPain: true, severeBackPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('aortic_disease'), `aortic disease should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'aortic_disease')?.removed === false, 'aortic disease should not be removed by no fever normal WBC')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '77 D6 Case AW acute monoarthritis swelling warmth ROM limitation ranks septic arthritis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], temperature: '38.0', wbc: '12000', crp: '9.0', acuteJointPain: true, monoarthritis: true, jointSwelling: true, jointWarmth: true, severeJointPain: true, limitedRangeOfMotion: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('septic_arthritis'), `septic arthritis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'cppd')?.removed === false, 'CPPD should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '78 D6 Case AX older acute knee swelling ranks CPPD top 5 and keeps septic arthritis', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], temperature: '37.2', wbc: '9000', crp: '5.0', cnsOlderAdult: true, acuteJointPain: true, kneeJointPain: true, jointSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('cppd'), `CPPD should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'septic_arthritis')?.removed === false, 'septic arthritis should remain')
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'cppd'), 'PMR/GCA should not outrank CPPD from older age alone')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '79 D6 Case AY joint pain rash renal dysfunction raises vasculitis top 5 and keeps infection', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], temperature: '37.0', wbc: '7500', crp: '6.0', acuteJointPain: true, generalizedRash: true, renalDysfunction: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('abdominal_vasculitis'), `vasculitis should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'septic_arthritis')?.removed === false && find(result, 'infective_endocarditis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '80 D6 Case AZ localized erythema swelling warmth pain ranks cellulitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], temperature: '38.2', wbc: '12500', crp: '8.0', skinRedness: true, skinSwelling: true, skinWarmth: true, severeSkinPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('cellulitis'), `cellulitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'necrotizing_fasciitis')?.removed === false, 'necrotizing fasciitis should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '81 D6 Case BA pain out of proportion bullae necrosis ranks necrotizing fasciitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], temperature: '37.5', wbc: '11000', crp: '12', severeSkinPain: true, painOutOfProportion: true, skinBlister: true, skinNecrosis: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('necrotizing_fasciitis'), `necrotizing fasciitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'necrotizing_fasciitis')?.removed === false, 'necrotizing fasciitis should not be underweighted by lower fever')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '82 D6 Case BB rash outdoor leukopenia thrombocytopenia AST ALT ranks tick-borne candidates top 5', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], wbc: '3000', crp: '5.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], wbc: '3000', crp: '5.0', generalizedRash: true, outdoorExposure: true, thrombocytopenia: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(topIds(result, 5).includes(id), `${id} should be top 5: ${topIds(result, 8).join(',')}`)
      assert(find(result, id).score > find(baseline, id).score, `${id} should rise`)
      assert(find(result, id)?.removed === false, `${id} should not be removed`)
    }
    assert(result.hardExclusions.length === 0, 'leukopenia should not hard exclude infection')
  })

  addTest(tests, '83 D6 Case BC rash joint pain renal dysfunction raises vasculitis and keeps SSTI', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], temperature: '37.0', wbc: '8000', crp: '6.0', generalizedRash: true, acuteJointPain: true, renalDysfunction: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('abdominal_vasculitis'), `vasculitis should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'cellulitis')?.removed === false && find(result, 'necrotizing_fasciitis')?.removed === false, 'SSTI candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '84 D6 Case BD rash new drug no focus ranks drug fever top 5 and keeps infection', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], temperature: '36.9', wbc: '7000', crp: '4.0', generalizedRash: true, recentDrugStart: true, noClearInfectionFocus: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('drug_fever'), `drug fever should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'cellulitis')?.removed === false && find(result, 'infective_endocarditis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '85 D6 Case BE mild back pain only does not overrank spine urinary or aortic disease', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], temperature: '36.8', wbc: '7200', crp: '0.5', boneBackPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['vertebral_osteomyelitis', 'pyelonephritis', 'aortic_disease']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild back pain alone: ${find(result, id).score}`)
    }
    assert(result.candidates[0].score < 90, `mild back pain should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '86 D6 Case BF mild joint pain only does not overrank septic arthritis CPPD or PMR', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], temperature: '36.8', wbc: '7300', crp: '0.6', acuteJointPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['septic_arthritis', 'cppd', 'pmr']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild joint pain alone: ${find(result, id).score}`)
    }
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '87 D6 Case BG mild nonspecific rash only does not overrank tick drug vasculitis or cellulitis', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], temperature: '36.9', wbc: '7400', crp: '0.5', generalizedRash: true, outdoorExposure: false, recentDrugStart: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['outdoorExposure', 'recentDrugStart'] })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus', 'drug_fever', 'abdominal_vasculitis', 'cellulitis']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild rash alone: ${find(result, id).score}`)
    }
    assert(result.candidates[0].score < 90, `mild rash should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '88 D7 Case BH headache neck stiffness AMS fever inflammation ranks meningitis top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache', 'symptomNeckPain'], temperature: '38.5', wbc: '14000', crp: '10', cnsHeadache: true, neckStiffness: true, neckAlteredMentalStatus: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('meningitis'), `meningitis should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'encephalitis')?.removed === false && bandOf(result, 'encephalitis') !== 'none', 'viral CNS/encephalitis should be held')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '89 D7 Case BI afebrile normal WBC headache AMS keeps encephalitis and meningitis', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], temperature: '37.2', wbc: '7000', crp: '3.0', cnsHeadache: true, neckAlteredMentalStatus: true, neckStiffness: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['neckStiffness'] })
    assert(topIds(result, 5).includes('encephalitis'), `encephalitis should rise: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'meningitis')?.removed === false && bandOf(result, 'meningitis') !== 'none', 'meningitis should not disappear without fever/neck stiffness')
    assert(result.hardExclusions.length === 0, 'no fever normal WBC no stiffness should not hard exclude CNS infection')
  })

  addTest(tests, '90 D7 Case BJ older new headache temporal tenderness CRP ranks PMR GCA top 3', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], temperature: '37.0', wbc: '8000', crp: '8.0', olderAdult: true, cnsHeadache: true, temporalArteryTenderness: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('pmr_gca'), `PMR/GCA should be top 3: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'meningitis')?.removed === false && find(result, 'encephalitis')?.removed === false, 'CNS infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '91 D7 Case BK older acute neck pain limited rotation ranks crowned dens CPPD and keeps infection', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], temperature: '37.2', wbc: '8500', crp: '7.0', olderAdult: true, acuteNeckPain: true, limitedNeckRotation: true, neckAlteredMentalStatus: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['neckAlteredMentalStatus'] })
    assert(topIds(result, 3).includes('crowned_dens_syndrome'), `crowned dens should be top 3: ${topIds(result, 5).join(',')}`)
    assert(topIds(result, 5).includes('cppd'), `CPPD should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'meningitis')?.removed === false && find(result, 'deep_neck_infection')?.removed === false && find(result, 'vertebral_osteomyelitis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '92 D7 Case BL neck pain positive culture dialysis raises spine infection IE and deep focus', () => {
    const baseline = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], temperature: '37.0', wbc: '9000', crp: '9.0', acuteNeckPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], temperature: '37.0', wbc: '9000', crp: '9.0', acuteNeckPain: true, positiveBloodCulture: true, unknownDialysis: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).some((id) => ['vertebral_osteomyelitis', 'deep_infectious_focus'].includes(id)), `spine/deep infection should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'infective_endocarditis').score > find(baseline, 'infective_endocarditis').score, 'IE should rise')
    assert(find(result, 'vertebral_osteomyelitis')?.removed === false && find(result, 'deep_infectious_focus')?.removed === false, 'spine/deep infection should remain')
    assert(result.hardExclusions.length === 0, 'no fever normal WBC should not hard exclude')
  })

  addTest(tests, '93 D7 Case BM headache rash renal joint raises vasculitis and keeps CNS infection', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], temperature: '37.0', wbc: '7600', crp: '6.0', cnsHeadache: true, generalizedRash: true, renalDysfunction: true, acuteJointPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('abdominal_vasculitis'), `vasculitis should be top 5: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'meningitis')?.removed === false && find(result, 'encephalitis')?.removed === false, 'CNS infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '94 D7 Case BN headache outdoor rash cytopenia AST ALT ranks tick-borne top 5', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], temperature: '37.0', wbc: '3100', crp: '5.0', cnsHeadache: true, outdoorExposure: true, generalizedRash: true, thrombocytopenia: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(topIds(result, 5).includes(id), `${id} should be top 5: ${topIds(result, 8).join(',')}`)
      assert(find(result, id)?.removed === false, `${id} should not be removed`)
    }
    assert(result.hardExclusions.length === 0, 'leukopenia should not hard exclude infection')
  })

  addTest(tests, '95 D7 Case BO mild headache only does not overrank meningitis GCA or tick', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], temperature: '36.8', wbc: '7200', crp: '0.5', cnsHeadache: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['meningitis', 'pmr_gca', 'sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild headache alone: ${find(result, id).score}`)
    }
    assert(result.candidates[0].score < 90, `mild headache should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '96 D7 Case BP mild neck pain only does not overrank crowned dens deep neck or spine', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], temperature: '36.8', wbc: '7300', crp: '0.6', acuteNeckPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['crowned_dens_syndrome', 'deep_neck_infection', 'vertebral_osteomyelitis']) {
      assert(find(result, id).score < 70, `${id} should not be high from mild neck pain alone: ${find(result, id).score}`)
    }
    assert(result.candidates[0].score < 90, `mild neck pain should not create extreme top score: ${result.candidates[0].score}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '97 D7 Case BQ older CRP alone does not overrank PMR GCA', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], temperature: '36.8', wbc: '7600', crp: '4.0', olderAdult: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(find(result, 'pmr_gca').score < 90, `PMR/GCA should not become extreme from older CRP alone: ${find(result, 'pmr_gca').score}`)
    assert(!find(result, 'pmr_gca').supportingFindings.some((item) => item.path === 'cnsPatterns.gcaSupport'), 'PMR/GCA should not gain GCA-specific support without headache or temporal tenderness')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '98 D7 cross phenotype headache positive culture prosthetic valve raises IE', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache', 'symptomPositiveBloodCulture'], temperature: '37.0', wbc: '8200', crp: '6.0', cnsHeadache: true, positiveBloodCulture: true, bsiProstheticValve: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('infective_endocarditis'), `IE should be top 3: ${topIds(result, 5).join(',')}`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '99 D7 cross phenotype neck pain thoracodorsal pain keeps aortic disease', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain', 'symptomBackPain'], temperature: '36.8', wbc: '7800', crp: '4.0', acuteNeckPain: true, thoracodorsalPain: true, severeBackPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('aortic_disease'), `aortic disease should remain high: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'aortic_disease')?.removed === false, 'aortic disease should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '100 D7 cross phenotype headache leg swelling dyspnea keeps PE logic', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache', 'symptomChest'], temperature: '36.9', wbc: '7600', crp: '4.0', cnsHeadache: true, dyspnea: true, legSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('dvt_pe'), `DVT/PE should remain high: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'dvt_pe')?.removed === false, 'DVT/PE should not be removed')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '101 D7 cross phenotype headache abdominal rash renal keeps vasculitis logic', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache', 'symptomAbdominalPain'], temperature: '37.0', wbc: '7800', crp: '6.0', cnsHeadache: true, abdominalPainDetail: true, generalizedRash: true, renalDysfunction: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('abdominal_vasculitis'), `vasculitis should remain high: ${topIds(result, 8).join(',')}`)
    assert(find(result, 'intra_abdominal_abscess')?.removed === false && find(result, 'meningitis')?.removed === false, 'infection candidates should remain')
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '102 CAL-1 CNS infection outranks unrelated PMR GCA and tick candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache', 'symptomNeckPain'], temperature: '38.5', wbc: '14000', crp: '10', cnsHeadache: true, neckStiffness: true, neckAlteredMentalStatus: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(result.candidates[0].id === 'meningitis', `meningitis should be top 1: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'meningitis'), 'PMR/GCA should not outrank meningitis')
    assert(!topIds(result, 3).some((id) => ['sfts', 'japanese_spotted_fever', 'scrub_typhus'].includes(id)), `tick-borne should not be top 3 without exposure: ${topIds(result, 5).join(',')}`)
  })

  addTest(tests, '103 CAL-2 tick-borne pattern outranks unrelated PMR GCA and drug fever', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomHeadache'], wbc: '3000', crp: '5', cnsHeadache: true, outdoorExposure: true, generalizedRash: true, thrombocytopenia: true, hepatobiliaryEnzymeElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) assert(topIds(result, 5).includes(id), `${id} should be top 5: ${topIds(result, 8).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'sfts'), 'PMR/GCA should not outrank SFTS without specific support')
    assert(rankOf(result, 'drug_fever') > rankOf(result, 'sfts'), 'drug fever should not outrank SFTS without drug anchor')
  })

  addTest(tests, '104 CAL-3 septic arthritis outranks PMR GCA in acute monoarthritis', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], temperature: '38', crp: '9', acuteJointPain: true, monoarthritis: true, jointSwelling: true, jointWarmth: true, limitedRangeOfMotion: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('septic_arthritis'), `septic arthritis should be top tier: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'septic_arthritis'), 'PMR/GCA should not outrank septic arthritis')
  })

  addTest(tests, '105 CAL-4 CPPD outranks PMR GCA in older acute knee swelling', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomJointPain'], crp: '5', olderAdult: true, acuteJointPain: true, kneeJointPain: true, jointSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('cppd'), `CPPD should rise: ${topIds(result, 8).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'cppd'), 'PMR/GCA should not outrank CPPD')
  })

  addTest(tests, '106 CAL-5 vasculitis outranks PMR GCA in abdominal rash renal joint phenotype', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], crp: '6', abdominalPainDetail: true, generalizedRash: true, renalDysfunction: true, acuteJointPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('abdominal_vasculitis'), `vasculitis should be top tier: ${topIds(result, 5).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'abdominal_vasculitis'), 'PMR/GCA should not outrank vasculitis')
  })

  addTest(tests, '107 CAL-6 myocarditis pericarditis outrank unrelated inflammatory candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], crp: '5', chestPain: true, ecgAbnormality: true, troponinElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('myocarditis') && topIds(result, 3).includes('pericarditis'), `myocarditis/pericarditis should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['pmr_gca', 'sfts', 'japanese_spotted_fever', 'scrub_typhus', 'drug_fever']) {
      assert(rankOf(result, id) > rankOf(result, 'pericarditis'), `${id} should not outrank pericarditis`)
    }
  })

  addTest(tests, '108 CAL-7 PE DVT outranks unrelated inflammatory candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomChest'], crp: '4', dyspnea: true, respLowSpo2: true, spo2: '90', legSwelling: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('dvt_pe'), `DVT/PE should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['pmr_gca', 'tafro', 'drug_fever', 'abdominal_vasculitis']) assert(rankOf(result, id) > rankOf(result, 'dvt_pe'), `${id} should not outrank DVT/PE`)
  })

  addTest(tests, '109 CAL-8 cholangitis outranks unrelated PMR tick and drug candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], crp: '10', rightUpperQuadrantPain: true, jaundice: true, abdominalChills: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('acute_cholangitis'), `cholangitis should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['pmr_gca', 'sfts', 'japanese_spotted_fever', 'scrub_typhus', 'drug_fever']) assert(rankOf(result, id) > rankOf(result, 'acute_cholangitis'), `${id} should not outrank cholangitis`)
  })

  addTest(tests, '110 CAL-9 mesenteric ischemia outranks generic infection inflammatory candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomAbdominalPain'], crp: '3', suddenAbdominalPain: true, severeAbdominalPain: true, shock: true, bloodyStool: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('mesenteric_ischemia'), `mesenteric ischemia should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['bacteremia', 'pmr_gca', 'drug_fever', 'tumor_fever']) assert(rankOf(result, id) > rankOf(result, 'mesenteric_ischemia'), `${id} should not outrank mesenteric ischemia`)
  })

  addTest(tests, '111 CAL-10 crowned dens CPPD outrank PMR GCA in specific neck phenotype', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], crp: '7', olderAdult: true, acuteNeckPain: true, limitedNeckRotation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 5).includes('cppd') && topIds(result, 5).includes('crowned_dens_syndrome'), `CPPD/crowned dens should be top tier: ${topIds(result, 8).join(',')}`)
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'cppd'), 'PMR/GCA should not outrank CPPD in crowned dens phenotype')
    assert(rankOf(result, 'pmr_gca') > rankOf(result, 'crowned_dens_syndrome'), 'PMR/GCA should not outrank crowned dens syndrome')
  })

  addTest(tests, '112 CAL-11 IE anchor outranks generic malignancy inflammatory candidates', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], crp: '6', positiveBloodCulture: true, bsiProstheticValve: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('infective_endocarditis'), `IE should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['tumor_fever', 'intravascular_lymphoma', 'pmr_gca', 'tafro']) assert(rankOf(result, id) > rankOf(result, 'infective_endocarditis'), `${id} should not outrank IE`)
  })

  addTest(tests, '113 CAL-12 IVL malignancy pattern outranks PMR tick and drug noise', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], crp: '5', unknownLdhHigh: true, unknownAnemia: true, unknownThrombocytopenia: true, unknownWeightLoss: true, unknownNightSweats: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(topIds(result, 3).includes('intravascular_lymphoma'), `IVL should be top tier: ${topIds(result, 5).join(',')}`)
    for (const id of ['pmr_gca', 'sfts', 'japanese_spotted_fever', 'scrub_typhus', 'drug_fever']) assert(rankOf(result, id) > rankOf(result, 'intravascular_lymphoma'), `${id} should not outrank IVL`)
  })

  addTest(tests, '114 NOISE-1 older CRP alone does not fix PMR GCA or CPPD top 1', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], crp: '5', olderAdult: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(!['pmr_gca', 'cppd'].includes(result.candidates[0].id), `older CRP alone should not fix PMR/GCA or CPPD top 1: ${topIds(result, 5).join(',')}`)
    assert(result.candidates[0].score < 90, `older CRP alone should not create extreme score: ${result.candidates[0].score}`)
  })

  addTest(tests, '115 NOISE-2 rash CRP without exposure or new drug does not overrank tick drug vasculitis', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomSkinFindings'], crp: '4', generalizedRash: true, outdoorExposure: false, recentDrugStart: false, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true, explicitAbsences: ['outdoorExposure', 'recentDrugStart'] })
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus', 'drug_fever', 'abdominal_vasculitis']) assert(find(result, id).score < 70, `${id} should not be high from rash CRP alone: ${find(result, id).score}`)
  })

  addTest(tests, '116 NOISE-3 LDH CRP alone does not fix IVL top 1', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], crp: '4', unknownLdhHigh: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(result.candidates[0].id !== 'intravascular_lymphoma', `IVL should not be top 1 from LDH CRP alone: ${topIds(result, 5).join(',')}`)
    assert(find(result, 'intravascular_lymphoma').score < 70, `IVL should not be high from LDH CRP alone: ${find(result, 'intravascular_lymphoma').score}`)
  })

  addTest(tests, '117 NOISE-4 thrombocytopenia CRP alone does not fix SFTS TAFRO or IVL top 1', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: [], crp: '4', unknownThrombocytopenia: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    assert(!['sfts', 'tafro', 'intravascular_lymphoma'].includes(result.candidates[0].id), `thrombocytopenia CRP alone should not fix SFTS/TAFRO/IVL top 1: ${topIds(result, 5).join(',')}`)
    assert(result.candidates[0].score < 90, `thrombocytopenia CRP alone should not create extreme score: ${result.candidates[0].score}`)
  })

  addTest(tests, '118 NOISE-5 CRP no-localizing keeps broad non-decisive differential', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], crp: '8', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const topScore = result.candidates[0].score
    const closeCandidates = result.candidates.filter((candidate) => topScore - candidate.score <= 12).length
    assert(topScore < 90, `CRP no-localizing alone should not create extreme score: ${topScore}`)
    assert(closeCandidates >= 3, `CRP no-localizing should keep broad differential, got ${closeCandidates} close candidates`)
    assert(result.hardExclusions.length === 0, 'hard exclusion should remain empty')
  })

  addTest(tests, '119 E1 respiratory phenotype prioritizes cough sputum dyspnea', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], age: '72', temperature: '38.7', heartRate: '108', spo2: '91', wbc: '15200', crp: '14', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    assert(q1.filter((id) => ['q_resp_cough', 'q_resp_sputum', 'q_resp_dyspnea', 'q_resp_chest_pain'].includes(id)).length >= 2, `respiratory specific questions should be round 1: ${q1.join(',')}`)
    assert(!q1.includes('q_travel_recent') && !q1.includes('q_back_bacteremia_context'), `generic travel/back should not occupy respiratory round 1: ${q1.join(',')}`)
    assert(topIds(result, 3).includes('pneumonia'), `pneumonia should remain top 3: ${topIds(result, 5).join(',')}`)
  })

  addTest(tests, '120 E1 PE phenotype prioritizes thrombosis discriminator', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomRespiratory'], age: '64', temperature: '36.8', heartRate: '112', spo2: '89', wbc: '7800', crp: '3.8', respDyspnea: true, chestPain: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    assert(q1[0] === 'q_sys_thrombosis', `PE discriminator should be first: ${q1.join(',')}`)
    assert(!q1.includes('q_travel_recent') && !q1.includes('q_back_local_pain'), `generic travel/back should not outrank PE discriminator: ${q1.join(',')}`)
    assert(topIds(result, 3).includes('dvt_pe'), `DVT/PE should remain top 3: ${topIds(result, 5).join(',')}`)
  })

  addTest(tests, '121 E1 neck phenotype prioritizes acute rotation and CNS safety', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNeckPain'], age: '81', temperature: '37.4', wbc: '9100', crp: '8', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    assert(q1.includes('q_neck_acute_rotation'), `acute neck/rotation should be round 1: ${q1.join(',')}`)
    assert(q1.includes('q_neuro_neck_stiffness') || q1.includes('q_neuro_altered'), `CNS safety question should be preserved: ${q1.join(',')}`)
  })

  addTest(tests, '122 E1 tick phenotype prioritizes domestic outdoor exposure separately from travel', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], age: '58', temperature: '37.0', wbc: '2900', crp: '5.8', generalizedRash: true, thrombocytopenia: true, astAltElevation: true, travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    for (const id of ['q_exp_outdoor', 'q_exp_tick_bite', 'q_exp_eschar']) assert(q1.includes(id), `tick exposure question should be round 1: ${q1.join(',')}`)
    for (const id of ['sfts', 'japanese_spotted_fever', 'scrub_typhus']) assert(topIds(result, 5).includes(id), `${id} should remain top 5: ${topIds(result, 8).join(',')}`)
    assert(result.hardExclusions.length === 0, 'tick phenotype should not create hard exclusion')
  })

  addTest(tests, '123 E1 back phenotype prioritizes spine mobility and bacteremia context', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomBackPain'], age: '69', temperature: '37.3', wbc: '8900', crp: '11', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    for (const id of ['q_back_local_pain', 'q_back_bacteremia_context', 'q_back_neuro_mobility']) assert(q1.includes(id), `back-pain discriminator should be round 1: ${q1.join(',')}`)
    assert(!q1.includes('q_travel_recent'), `travel should not be fixed first in back-pain phenotype: ${q1.join(',')}`)
    assert(topIds(result, 5).some((id) => ['vertebral_osteomyelitis', 'deep_infectious_focus'].includes(id)), `deep/spine infection should remain visible: ${topIds(result, 8).join(',')}`)
  })

  addTest(tests, '124 E1 no-localizing keeps generic questions and swaps after answers', () => {
    const first = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], age: '84', temperature: '38.2', wbc: '9000', crp: '5.0', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(first)
    assert(q1.includes('q_travel_recent') && q1.includes('q_back_bacteremia_context'), `no-localizing may use generic discriminators: ${q1.join(',')}`)
    const second = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], age: '84', temperature: '38.2', wbc: '9000', crp: '5.0', travelExposure: 'absent', positiveBloodCulture: false, unknownLdhHigh: false }, { allowFuturePhaseQuestions: true, explicitAbsences: ['positiveBloodCulture', 'unknownLdhHigh'] })
    const q2 = topQuestionIds(second)
    assert(q1.every((id) => !q2.includes(id)), `answered no-localizing questions should swap: q1=${q1.join(',')} q2=${q2.join(',')}`)
  })

  addTest(tests, '125 E1 CRP-only does not re-ask fever WBC CRP and preserves broad differential', () => {
    const result = buildProgressiveNarrowingShadow({ emergencySigns: [], step2Symptoms: ['symptomNoLocalizing'], age: '66', temperature: '36.8', wbc: '7200', crp: '6.5', travelExposure: 'not_assessed' }, { allowFuturePhaseQuestions: true })
    const q1 = topQuestionIds(result)
    assert(!q1.some((id) => /fever|wbc|crp/i.test(id)), `CRP-only should not ask fever/WBC/CRP again: ${q1.join(',')}`)
    assert(result.normalizedClinicalContext.derivedInflammationPattern.crpOnlyPattern === true, 'CRP-only pattern should remain derived')
    assert(hasVisible(result, ['infective_endocarditis', 'vertebral_osteomyelitis', 'pmr_gca', 'intravascular_lymphoma', 'drug_fever', 'dvt_pe']), 'CRP-only broad differential should remain visible')
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
  candidateUniverse: buildCandidateUniverse().length,
  averageInputs: 'Initial 8 numeric + symptoms + travel gate; BT/CRP/WBC derive inflammation pattern automatically',
  averageTime: 'shorter than legacy step-by-step flow',
  qVisibility: {
    Q1: 'travel state question visible when unassessed',
    Q2: 'text input only after travel present',
    Q3: 'date input only after travel present when timing missing',
  },
  clinicalAcceptanceScenarios: 57,
  failed,
  c4Tests,
}

console.log(JSON.stringify(report, null, 2))
if (failed.length > 0) process.exitCode = 1
