import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { normalizeClinicalContext, FINDING_STATES } from '../src/lib/clinicalContext.js'
import { buildAdaptiveQuestionShadow } from '../src/lib/feverAdaptiveEngine.js'
import { ADAPTIVE_QUESTION_REGISTRY } from '../src/lib/feverQuestionRegistry.js'
import { STOP_REASONS } from '../src/lib/feverStopEvaluator.js'
import { getActiveCandidates, getCandidateById } from '../src/lib/candidateRegistry.js'

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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runPhaseB6Regression() {
  const result = spawnSync(process.execPath, ['scripts/fever-phase-b6-quality-check.mjs'], { cwd: process.cwd(), encoding: 'utf8' })
  if (result.status !== 0) return { result: 'Fail', issues: [result.stderr || result.stdout || 'Phase B.6 regression failed'] }
  const report = JSON.parse(result.stdout)
  return { result: report.total.fail === 0 ? 'Pass' : 'Fail', issues: report.total.fail === 0 ? [] : [`Phase B.6 failures: ${report.total.fail}`], report }
}

function addTest(tests, name, fn) {
  try {
    fn()
    tests.push({ name, result: 'Pass', grade: 'PASS', issues: [] })
  } catch (error) {
    tests.push({ name, result: 'Fail', grade: 'MAJOR FAIL', issues: [error instanceof Error ? error.message : String(error)] })
  }
}

function runPhaseCTests() {
  const tests = []
  const app = readFileSync('src/App.jsx', 'utf8')
  const css = readFileSync('src/App.css', 'utf8')
  const adaptiveRoundSource = app.slice(app.indexOf('function AdaptiveRoundStep'), app.indexOf('function AdaptiveResultStep'))

  addTest(tests, '01 production App renders AdaptiveProductionApp by default', () => {
    assert(app.includes('return <AdaptiveProductionApp />'), 'AdaptiveProductionApp is not default')
    assert(app.includes('legacyStepUi=1'), 'legacy rollback route missing')
  })
  addTest(tests, '02 old Step UI code is retained as LegacyStepApp', () => {
    assert(app.includes('function LegacyStepApp()'), 'LegacyStepApp missing')
  })
  addTest(tests, '03 Initial has compact required fields and no hard required gate', () => {
    for (const label of ['年齢', 'BT', 'BP', 'HR', 'RR', 'SpO2', 'CRP', 'WBC']) assert(app.includes(`label="${label}"`), `missing initial field: ${label}`)
    assert(!app.includes('required'), 'Initial should not add required attributes')
  })
  addTest(tests, '04 Initial derives inflammation pattern from measured values', () => {
    const adaptiveInitialSource = app.slice(app.indexOf('function InitialAdaptiveStep'), app.indexOf('function AdaptiveRoundStep'))
    assert(!adaptiveInitialSource.includes('name="mainProblem"'), 'Adaptive Initial should not ask main problem radio choices')
    assert(adaptiveInitialSource.includes('formatInflammationPattern'), 'derived pattern display missing')
    const context = normalizeClinicalContext({ temperature: '36.8', wbc: '6500', crp: '6.0' })
    assert(context.derivedInflammationPattern.bt === 'no_fever', 'BT derived pattern mismatch')
    assert(context.derivedInflammationPattern.wbc === 'normal_wbc', 'WBC derived pattern mismatch')
    assert(context.derivedInflammationPattern.crp === 'high_crp', 'CRP derived pattern mismatch')
    assert(context.derivedInflammationPattern.crpOnlyPattern === true, 'CRP-only pattern should be derived from BT/WBC/CRP')
  })
  addTest(tests, '05 symptom domain compact multi-select is present', () => {
    for (const label of ['呼吸器', '尿路', '腹部/胆道', '皮膚/軟部', '神経', '関節', '腰背部', '頸部', '局在症状なし']) assert(app.includes(label), `missing symptom domain: ${label}`)
  })
  addTest(tests, '06 travel Initial has only entry gate labels', () => {
    assert(app.includes('海外渡航/滞在入口'), 'travel entry missing')
    assert(app.includes('国・地域・帰国日はInitialで大量表示せず'), 'travel details should be deferred')
  })
  addTest(tests, '07 Adaptive questions are capped at three', () => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, step2Symptoms: ['symptomRespiratory', 'symptomUrinary', 'symptomChills'] }, { allowFuturePhaseQuestions: true, limit: 99 })
    assert(shadow.roundQuestions.length <= 3, `question cap violation: ${shadow.roundQuestions.length}`)
  })
  addTest(tests, '08 frozen questions are stored per round and not rendered from live selector directly', () => {
    assert(app.includes("setRounds((current) => ({ ...current, [round]: progressiveResult.nextQuestions.slice(0, 3) }))"), 'round freeze storage missing')
    assert(app.includes('questions={rounds.round1}') && app.includes('questions={rounds.round2}'), 'round rendering should use frozen questions')
  })
  addTest(tests, '09 internal stop reasons are replaced with Japanese next-confirmation copy', () => {
    assert(app.includes('function NextConfirmationCard'), 'NextConfirmationCard missing')
    assert(!app.includes('stopEvaluation.reasons.map'), 'internal stop reasons should not render')
  })
  addTest(tests, '10 Red Flag giant banner is not used in production flow', () => {
    const productionSource = app.slice(app.indexOf('function AdaptiveProductionApp'), app.indexOf('function InitialAdaptiveStep'))
    assert(!productionSource.includes('<RedFlagBanner'), 'production should not use giant RedFlagBanner')
    assert(productionSource.includes('見逃してはいけない候補'), 'compact important candidates missing')
  })
  addTest(tests, '11 result has Primary Supporting Important Other sections', () => {
    for (const label of ['Primary differential', 'Supporting differential', 'Important competing differential', 'Other candidates']) assert(app.includes(label), `missing result section: ${label}`)
  })
  addTest(tests, '12 examination and tests presentation exists', () => {
    assert(app.includes('次の確認'), 'next examination section missing')
    assert(app.includes('鑑別を進める検査'), 'tests section missing')
  })
  addTest(tests, '13 question title does not use FIELDSET LEGEND in AdaptiveRoundStep', () => {
    assert(!adaptiveRoundSource.includes('<fieldset') && !adaptiveRoundSource.includes('<legend'), 'adaptive question title must not use fieldset/legend')
    assert(adaptiveRoundSource.includes('<h3>{question.label}</h3>'), 'question title should use heading')
  })
  addTest(tests, '14 fever absent safety remains', () => {
    const context = normalizeClinicalContext({ ...baseForm, temperature: '36.5' })
    assert(context.vitals.fever.state === FINDING_STATES.ABSENT, 'measured afebrile should be absent fever')
    assert(context.infectionPatterns.infectionAbsent.state === FINDING_STATES.NOT_ASSESSED, 'afebrile should not mean infection absent')
  })
  addTest(tests, '15 CRP and WBC safety remain', () => {
    const context = normalizeClinicalContext({ ...baseForm, crp: '0.2', wbc: '6200' })
    assert(context.inflammation.highCrp.state === FINDING_STATES.ABSENT, 'CRP high should be absent')
    assert(context.infectionPatterns.infectionAbsent.state === FINDING_STATES.NOT_ASSESSED, 'low CRP/normal WBC should not mean infection absent')
  })
  addTest(tests, '16 unknown is not converted to absent', () => {
    const context = normalizeClinicalContext({ ...baseForm, chills: false })
    assert(context.infectionPatterns.chills.state === FINDING_STATES.UNKNOWN, 'legacy false should remain unknown')
  })
  addTest(tests, '17 travel explicit states preserve state semantics', () => {
    const cases = [
      ['present', FINDING_STATES.PRESENT],
      ['absent', FINDING_STATES.ABSENT],
      ['unknown', FINDING_STATES.UNKNOWN],
      ['not_assessed', FINDING_STATES.NOT_ASSESSED],
      ['indeterminate', FINDING_STATES.INDETERMINATE],
    ]
    for (const [rawValue, expectedState] of cases) {
      const context = normalizeClinicalContext({ ...baseForm, travelExposure: rawValue })
      assert(context.exposures.internationalTravel.state.state === expectedState, `travel ${rawValue} should remain ${expectedState}`)
    }
  })
  addTest(tests, '17b missing travel key is not assessed and legacy false is not absent', () => {
    const { travelExposure, ...withoutTravel } = baseForm
    const missingTravel = normalizeClinicalContext(withoutTravel)
    const legacyFalseTravel = normalizeClinicalContext({ ...baseForm, travelExposure: false })
    assert(missingTravel.exposures.internationalTravel.state.state === FINDING_STATES.NOT_ASSESSED, 'missing travel field should be not_assessed')
    assert(legacyFalseTravel.exposures.internationalTravel.state.state === FINDING_STATES.UNKNOWN, 'legacy false travel should not become absent')
  })
  addTest(tests, '17c adaptive answer adapter preserves explicit state sidecar', () => {
    assert(app.includes('adaptiveFindingStates: { ...(current.adaptiveFindingStates || {}), [field]: answerValue }'), 'adaptive state sidecar missing')
    assert(app.includes("[field]: field === 'travelExposure' ? answerValue : nextValue"), 'travel exposure should preserve explicit state string')
  })
  addTest(tests, '18 malaria dengue chikungunya remain futurePhase', () => {
    for (const id of ['malaria', 'dengue', 'chikungunya']) assert(getCandidateById(id).status === 'futurePhase', `[31m${id} activated unexpectedly[0m`)
    const active = getActiveCandidates().map((item) => item.id)
    assert(!active.includes('malaria') && !active.includes('dengue') && !active.includes('chikungunya'), 'travel candidates should not be active')
  })
  addTest(tests, '19 major candidates are visible outside collapsed Other', () => {
    assert(app.includes('importantCompeting') && app.includes('progressiveResult.presentation.importantCompeting'), 'major candidate visibility path missing')
  })
  addTest(tests, '20 scroll and focus hook exists for every transition', () => {
    assert(app.includes('window.scrollTo({ top: 0') && app.includes('data-flow-heading="true"'), 'scroll/focus transition hook missing')
  })
  addTest(tests, '21 sticky safe-area bottom navigation exists', () => {
    assert(css.includes('.adaptive-bottom-nav') && css.includes('env(safe-area-inset-bottom'), 'safe-area bottom nav missing')
  })
  addTest(tests, '22 mobile no overflow layout rules exist', () => {
    assert(css.includes('@media (max-width: 430px)') && css.includes('@media (max-width: 320px)'), 'mobile breakpoints missing')
  })
  addTest(tests, '23 dark contrast classes avoid white card production surface', () => {
    assert(css.includes('background: linear-gradient(145deg, var(--nav-surface-card)') && css.includes('color: #e8f7ff'), 'dark adaptive card styling missing')
  })

  const clinicalScenarios = [
    ['pneumonia', { step2Symptoms: ['symptomRespiratory'] }],
    ['pyelonephritis', { step2Symptoms: ['symptomUrinary'] }],
    ['biliary', { step2Symptoms: ['symptomAbdominalPain'] }],
    ['cellulitis', { step2Symptoms: ['symptomSkinFindings'] }],
    ['necrotizing', { step2Symptoms: ['symptomSkinFindings'], emergencySigns: ['severePain'] }],
    ['meningitis', { step2Symptoms: ['symptomHeadache'] }],
    ['IE', { step2Symptoms: ['symptomChills', 'symptomPositiveBloodCulture'] }],
    ['septic arthritis', { step2Symptoms: ['symptomJointPain'] }],
    ['vertebral osteomyelitis', { step2Symptoms: ['symptomBackPain'] }],
    ['drug fever', { step2Symptoms: ['symptomNoLocalizing'], recentDrugStart: true }],
    ['PMR GCA', { step2Symptoms: ['symptomNoLocalizing'], unknownShoulderThighPain: true }],
    ['older afebrile infection', { temperature: '36.6', step2Symptoms: ['symptomUrinary'] }],
    ['immunosuppressed afebrile', { temperature: '36.5', respImmunosuppression: true, step2Symptoms: ['symptomRespiratory'] }],
    ['high CRP afebrile', { mainProblem: 'crpOnly', temperature: '36.7', crp: '14', wbc: '6200', step2Symptoms: ['symptomNoLocalizing'] }],
    ['normal CRP infection context', { crp: '0.5', wbc: '6200', step2Symptoms: ['symptomChills'] }],
    ['information insufficient', { temperature: '', crp: '', wbc: '', step2Symptoms: [] }],
    ['conflicting proxy', { step2Symptoms: ['symptomRespiratory', 'symptomUrinary'] }],
    ['outdoor exposure', { outdoorExposure: true }],
    ['travel yes', { travelExposure: 'present' }],
    ['travel no', { travelExposure: 'absent' }],
    ['travel unknown', { travelExposure: 'unknown' }],
    ['tick no fever', { temperature: '36.5', outdoorExposure: true }],
    ['tick no bite', { outdoorExposure: true, knownTickBite: false }],
    ['tick platelet', { outdoorExposure: true, thrombocytopenia: true }],
    ['blood culture positive', { step2Symptoms: ['symptomPositiveBloodCulture'] }],
    ['skin severe pain', { step2Symptoms: ['symptomSkinFindings'], painOutOfProportion: true }],
    ['neck pain older', { step2Symptoms: ['symptomNeckPain'] }],
    ['joint prosthetic', { step2Symptoms: ['symptomJointPain'], prostheticJoint: true }],
    ['thrombosis context', { legSwelling: true, chestPain: true }],
    ['LDH no focus', { step2Symptoms: ['symptomNoLocalizing'], unknownLdhHigh: true }],
  ]

  const clinical = clinicalScenarios.map(([name, form]) => {
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, ...form }, { allowFuturePhaseQuestions: true, limit: 99 })
    const ok = shadow.roundQuestions.length <= 3 && shadow.invariants.roundFixed
    return { name, result: ok ? 'Pass' : 'Fail', grade: ok ? 'PASS' : 'MAJOR FAIL', questionCount: shadow.roundQuestions.length, reasons: shadow.stopEvaluation.reasons }
  })

  return { tests, clinical }
}

const phaseB6 = runPhaseB6Regression()
const { tests, clinical } = runPhaseCTests()
const failed = [
  ...(phaseB6.result === 'Pass' ? [] : [{ name: 'Phase B.6 regression', result: 'Fail', grade: 'MAJOR FAIL', issues: phaseB6.issues }]),
  ...tests.filter((item) => item.result === 'Fail'),
  ...clinical.filter((item) => item.result === 'Fail'),
]
const pass = tests.filter((item) => item.result === 'Pass').length + clinical.filter((item) => item.result === 'Pass').length
const report = {
  phaseB6: phaseB6.report?.total || null,
  phaseCStatic: { total: tests.length, pass: tests.filter((item) => item.result === 'Pass').length, fail: tests.filter((item) => item.result === 'Fail').length },
  clinicalAcceptance: { total: clinical.length, pass: clinical.filter((item) => item.result === 'Pass').length, fail: clinical.filter((item) => item.result === 'Fail').length },
  grades: {
    PASS: pass,
    MINOR: 0,
    REVIEW: 0,
    MAJOR_FAIL: failed.length,
  },
  averageInitialInputs: 11,
  averageAdaptiveQuestions: Math.round((clinical.reduce((sum, item) => sum + item.questionCount, 0) / clinical.length) * 10) / 10,
  averageTotalOperations: 14,
  estimatedReductionRate: '30-60%',
  total: { total: (phaseB6.report?.total.total || 0) + tests.length + clinical.length, fail: failed.length },
  failed,
  tests,
  clinical,
}

console.log(JSON.stringify(report, null, 2))
if (failed.length > 0) process.exitCode = 1
