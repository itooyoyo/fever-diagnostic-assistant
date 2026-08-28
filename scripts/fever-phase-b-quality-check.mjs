import { spawnSync } from 'node:child_process'
import { normalizeClinicalContext } from '../src/lib/clinicalContext.js'
import { buildAdaptiveQuestionShadow } from '../src/lib/feverAdaptiveEngine.js'
import { selectAdaptiveQuestions } from '../src/lib/feverQuestionSelector.js'
import { evaluateAdaptiveStop } from '../src/lib/feverStopEvaluator.js'
import { ADAPTIVE_QUESTION_REGISTRY } from '../src/lib/feverQuestionRegistry.js'
import { CANDIDATE_REGISTRY, getActiveCandidates, getFutureCandidates } from '../src/lib/candidateRegistry.js'

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
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runPhaseARegression() {
  const result = spawnSync(process.execPath, ['scripts/fever-phase-a-quality-check.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    return { result: 'Fail', issues: [result.stderr || result.stdout || 'Phase A regression failed'] }
  }
  const report = JSON.parse(result.stdout)
  return {
    result: report.total.fail === 0 ? 'Pass' : 'Fail',
    issues: report.total.fail === 0 ? [] : [`Phase A failures: ${report.total.fail}`],
    report,
  }
}

function runSelectorTests() {
  const tests = []
  const add = (name, fn) => {
    try {
      fn()
      tests.push({ name, result: 'Pass', issues: [] })
    } catch (error) {
      tests.push({ name, result: 'Fail', issues: [error instanceof Error ? error.message : String(error)] })
    }
  }

  add('01 selectedQuestions length is capped at 3 even when limit is high', () => {
    const context = normalizeClinicalContext({ ...baseForm, step2Symptoms: ['symptomRespiratory', 'symptomUrinary', 'symptomChills'] })
    const selection = selectAdaptiveQuestions(context, { limit: 99 })
    assert(selection.roundQuestions.length <= 3, `got ${selection.roundQuestions.length}`)
  })

  add('02 answered present finding is not asked again', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomRespiratory'], respCough: true })
    assert(!shadow.roundQuestions.some((question) => question.id === 'q_resp_cough'), 'q_resp_cough should not be re-asked')
  })

  add('03 answered unknown finding is not asked again', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomRespiratory'], respCough: false })
    assert(!shadow.roundQuestions.some((question) => question.id === 'q_resp_cough'), 'unknown cough should not be re-asked')
  })

  add('04 multiple active domains keep diversity', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomRespiratory', 'symptomUrinary'] })
    const domains = new Set(shadow.roundQuestions.map((question) => question.domain))
    assert(domains.size >= 2, `expected at least two domains, got ${[...domains].join(',')}`)
  })

  add('05 major candidate questions do not occupy all slots from one candidate', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomChills', 'symptomPositiveBloodCulture'] })
    const counts = new Map()
    for (const question of shadow.roundQuestions) {
      for (const candidate of question.sourceCandidates) counts.set(candidate, (counts.get(candidate) || 0) + 1)
    }
    assert([...counts.values()].every((count) => count <= 2), `candidate over-occupied: ${JSON.stringify([...counts])}`)
  })

  add('06 selected questions have current context relevance', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomSkinFindings'] })
    assert(shadow.roundQuestions.every((question) => ['HIGH', 'MEDIUM'].includes(question.relevance)), 'selected question with low/no relevance')
  })

  add('07 inactive candidate-only tick questions are suppressed by default', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, outdoorExposure: true })
    assert(!shadow.roundQuestions.some((question) => question.id.startsWith('q_exp_')), 'future tick question should be suppressed by default')
  })

  add('08 conflict priority is surfaced by stop evaluator', () => {
    const context = normalizeClinicalContext({ ...baseForm, step2Symptoms: ['symptomRespiratory'] })
    context.dataQuality.conflicts.push('simulated conflict')
    const selection = selectAdaptiveQuestions(context)
    const stop = evaluateAdaptiveStop(context, selection)
    assert(stop.reasons.includes('conflicting_information'), 'conflicting information should be surfaced')
  })

  add('09 tick no-fever safety does not stop evaluation', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, temperature: '36.5', outdoorExposure: true }, { allowFuturePhaseQuestions: true })
    assert(shadow.roundQuestions.some((question) => ['q_exp_tick_bite', 'q_exp_eschar'].includes(question.id)), 'tick follow-up should remain possible when afebrile')
    assert(!shadow.stopEvaluation.reasons.includes('outside_scope'), 'afebrile tick context should not be outside scope')
  })

  add('10 tick no-bite safety still allows eschar/outdoor follow-up', () => {
    const shadow = buildAdaptiveQuestionShadow(
      { ...baseForm, outdoorExposure: true, knownTickBite: false },
      { allowFuturePhaseQuestions: true, normalization: { explicitAbsences: ['knownTickBite'] } },
    )
    assert(!shadow.roundQuestions.some((question) => question.id === 'q_exp_tick_bite'), 'known absent tick bite should not be re-asked')
    assert(shadow.roundQuestions.some((question) => question.id === 'q_exp_eschar'), 'no-bite should not end tick evaluation')
  })

  add('11 round is frozen and not refilled after selection', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomAbdominalPain', 'symptomDiarrhea'] })
    assert(shadow.invariants.roundFixed, 'round should be frozen')
    assert(shadow.roundQuestions.every((question) => question.lockedAtSelection), 'questions should be locked')
  })

  add('12 registry has future exposure questions without using legend-dependent UI', () => {
    const tickQuestions = ADAPTIVE_QUESTION_REGISTRY.filter((question) => question.id.startsWith('q_exp_'))
    assert(tickQuestions.length === 3, 'expected three tick/exposure questions')
    assert(tickQuestions.every((question) => typeof question.label === 'string' && question.label.length > 0), 'question labels should be heading-ready strings')
  })

  return tests
}

const simulations = [
  sim('typical pneumonia', ['symptomRespiratory'], ['q_resp_dyspnea', 'q_resp_cough'], { respSputum: true }),
  sim('respiratory low spo2', ['symptomRespiratory'], ['q_resp_dyspnea', 'q_resp_immunosuppression'], { spo2: '89' }),
  sim('immunosuppressed respiratory', ['symptomRespiratory'], ['q_resp_dyspnea', 'q_resp_immunosuppression'], { respCough: true }),
  sim('urinary pyelonephritis', ['symptomUrinary'], ['q_uri_flank', 'q_uri_dysuria']),
  sim('catheter urinary', ['symptomUrinary'], ['q_uri_catheter', 'q_uri_flank']),
  sim('male prostatitis context', ['symptomUrinary'], ['q_uri_prostate', 'q_uri_flank']),
  sim('biliary infection', ['symptomAbdominalPain'], ['q_abd_ruq', 'q_abd_jaundice']),
  sim('diarrhea cdi', ['symptomDiarrhea'], ['q_abd_diarrhea', 'q_abd_antibiotics']),
  sim('abdominal abscess risk', ['symptomAbdominalPain'], ['q_abd_surgery_immune', 'q_abd_ruq']),
  sim('cellulitis', ['symptomSkinFindings'], ['q_skin_redness_swelling', 'q_skin_pain_out_of_proportion']),
  sim('nec fasc safety', ['symptomSkinFindings'], ['q_skin_pain_out_of_proportion', 'q_skin_blister_necrosis']),
  sim('diabetic foot', ['symptomSkinFindings'], ['q_skin_wound_foot_ulcer', 'q_skin_pain_out_of_proportion']),
  sim('meningitis', ['symptomHeadache'], ['q_neuro_altered', 'q_neuro_neck_stiffness']),
  sim('encephalitis', ['symptomHeadache'], ['q_neuro_altered', 'q_neuro_headache']),
  sim('acute neck older', ['symptomNeckPain'], ['q_neck_acute_rotation', 'q_neuro_neck_stiffness']),
  sim('ie bloodstream', ['symptomChills', 'symptomPositiveBloodCulture'], ['q_bsi_positive_culture', 'q_bsi_device_valve']),
  sim('staph bacteremia', ['symptomPositiveBloodCulture'], ['q_bsi_staph_candida', 'q_bsi_device_valve']),
  sim('device bloodstream', ['symptomChills'], ['q_bsi_device_valve', 'q_bsi_murmur_emboli']),
  sim('septic arthritis', ['symptomJointPain'], ['q_joint_swelling_rom', 'q_joint_knee_poly']),
  sim('cppd', ['symptomJointPain'], ['q_joint_knee_poly', 'q_joint_swelling_rom']),
  sim('prosthetic joint', ['symptomJointPain'], ['q_joint_prosthetic', 'q_joint_swelling_rom']),
  sim('vertebral osteomyelitis', ['symptomBackPain'], ['q_back_local_pain', 'q_back_bacteremia_context']),
  sim('back neurologic mobility', ['symptomBackPain'], ['q_back_neuro_mobility', 'q_back_local_pain']),
  sim('no focus drug fever', ['symptomNoLocalizing'], ['q_sys_drug', 'q_sys_bsymptom_ldh']),
  sim('no focus malignancy', ['symptomNoLocalizing'], ['q_sys_bsymptom_ldh', 'q_bsi_positive_culture']),
  sim('pmr gca', ['symptomNoLocalizing'], ['q_sys_pmr_gca', 'q_sys_bsymptom_ldh']),
  sim('high crp afebrile', ['symptomNoLocalizing'], ['q_sys_bsymptom_ldh', 'q_bsi_positive_culture'], { mainProblem: 'crpOnly', temperature: '36.7', crp: '14', wbc: '6200' }),
  sim('normal crp infection context', ['symptomChills'], ['q_bsi_positive_culture', 'q_bsi_device_valve'], { crp: '0.5', wbc: '6200' }),
  sim('information insufficient', [], [], { temperature: '', crp: '', wbc: '' }),
  sim('conflicting context', ['symptomRespiratory', 'symptomUrinary'], ['q_resp_dyspnea', 'q_uri_flank']),
  sim('tick outdoor fever', [], ['q_exp_tick_bite', 'q_exp_eschar'], { outdoorExposure: true }, true),
  sim('tick outdoor afebrile', [], ['q_exp_tick_bite', 'q_exp_eschar'], { outdoorExposure: true, temperature: '36.5' }, true),
  sim('tick bite unknown platelet', [], ['q_exp_outdoor', 'q_exp_tick_bite', 'q_exp_eschar'], { unknownThrombocytopenia: true }, true),
  sim('tick no bite outdoor', [], ['q_exp_eschar'], { outdoorExposure: true, knownTickBite: false }, true, ['knownTickBite']),
  sim('tick sodium not assessed', [], ['q_exp_tick_bite'], { outdoorExposure: true }, true),
]

function sim(name, step2Symptoms, expectedQuestionIds, form = {}, allowFuturePhaseQuestions = false, explicitAbsences = []) {
  return { name, form: { ...baseForm, ...form, step2Symptoms }, expectedQuestionIds, allowFuturePhaseQuestions, explicitAbsences }
}

function runClinicalSimulation() {
  return simulations.map((scenario) => {
    const shadow = buildAdaptiveQuestionShadow(scenario.form, {
      limit: 99,
      allowFuturePhaseQuestions: scenario.allowFuturePhaseQuestions,
      normalization: { explicitAbsences: scenario.explicitAbsences },
    })
    const ids = shadow.roundQuestions.map((question) => question.id)
    const hasExpected = scenario.expectedQuestionIds.length === 0 || scenario.expectedQuestionIds.some((id) => ids.includes(id))
    const roundCapOk = ids.length <= 3
    const grade = !roundCapOk
      ? 'MAJOR_FAIL'
      : hasExpected
        ? 'A'
        : ids.length > 0
          ? 'B'
          : 'C'
    return {
      name: scenario.name,
      result: grade === 'MAJOR_FAIL' ? 'Fail' : 'Pass',
      grade,
      questionIds: ids,
      questionCount: ids.length,
      activeDomains: shadow.activeDomains,
      missedImportantQuestion: hasExpected ? null : scenario.expectedQuestionIds.join(','),
      stopReasons: shadow.stopEvaluation.reasons,
    }
  })
}

const phaseA = runPhaseARegression()
const selectorResults = runSelectorTests()
const simulationResults = runClinicalSimulation()
const simulationFailures = simulationResults.filter((item) => item.result === 'Fail')
const selectorFailures = selectorResults.filter((item) => item.result === 'Fail')
const gradeCounts = countBy(simulationResults.map((item) => item.grade))
const totalQuestions = simulationResults.reduce((sum, item) => sum + item.questionCount, 0)
const denominator = Math.max(1, totalQuestions)
const questionA = simulationResults.filter((item) => item.grade === 'A').reduce((sum, item) => sum + item.questionCount, 0)
const questionB = simulationResults.filter((item) => item.grade === 'B').reduce((sum, item) => sum + item.questionCount, 0)
const questionC = simulationResults.filter((item) => item.grade === 'C').reduce((sum, item) => sum + item.questionCount, 0)
const questionD = simulationResults.filter((item) => item.grade === 'D').reduce((sum, item) => sum + item.questionCount, 0)
const quality = {
  A: percent(questionA, denominator),
  B: percent(questionB, denominator),
  C: percent(questionC, denominator),
  D: percent(questionD, denominator),
  AplusB: percent(questionA + questionB, denominator),
  majorFail: simulationResults.filter((item) => item.grade === 'MAJOR_FAIL').length,
}

const estimatedCurrentClicks = { min: 20, max: 35 }
const estimatedAdaptiveClicks = { initial: 8, round1: 3, round2: 3, total: 14 }
const reductionRate = {
  vsCurrentMin: percent(estimatedCurrentClicks.min - estimatedAdaptiveClicks.total, estimatedCurrentClicks.min),
  vsCurrentMax: percent(estimatedCurrentClicks.max - estimatedAdaptiveClicks.total, estimatedCurrentClicks.max),
}

const failed = [
  ...(phaseA.result === 'Pass' ? [] : [{ name: 'Phase A regression', issues: phaseA.issues }]),
  ...selectorFailures,
  ...simulationFailures,
]

const report = {
  adaptiveArchitecture: 'normalizedClinicalContext -> candidateContext -> adaptiveQuestionRegistry -> adaptiveQuestionSelector -> frozen roundQuestions <= 3 -> stopEvaluator',
  questionRegistryCount: ADAPTIVE_QUESTION_REGISTRY.length,
  registryCandidateCount: CANDIDATE_REGISTRY.length,
  activeCandidateCount: getActiveCandidates().length,
  futureCandidateCount: getFutureCandidates().length,
  phaseA: phaseA.report?.total || null,
  selector: { total: selectorResults.length, pass: selectorResults.length - selectorFailures.length, fail: selectorFailures.length },
  simulation: { total: simulationResults.length, pass: simulationResults.length - simulationFailures.length, fail: simulationFailures.length, gradeCounts },
  quality,
  total: { total: (phaseA.report?.total.total || 0) + selectorResults.length + simulationResults.length, fail: failed.length },
  estimatedCurrentClicks,
  estimatedAdaptiveClicks,
  reductionRate,
  failed,
  selectorResults,
  simulationResults,
}

console.log(JSON.stringify(report, null, 2))

if (
  failed.length > 0 ||
  quality.majorFail > 0 ||
  quality.AplusB < 90 ||
  quality.D > 5 ||
  simulationResults.some((item) => item.questionCount > 3)
) {
  process.exitCode = 1
}

function countBy(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {})
}

function percent(value, total) {
  return Math.round((value / total) * 1000) / 10
}
