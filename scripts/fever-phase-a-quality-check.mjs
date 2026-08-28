import {
  assessEmergencySigns,
  assessInfectionLikelihood,
  assessRespiratoryFocus,
  assessUrinaryFocus,
  assessAbdominalFocus,
  assessBoneJointFocus,
  assessCentralNervousFocus,
  assessBloodstreamFocus,
  assessNonInfectiousFocus,
  assessReevaluation,
  buildTestRecommendations,
  buildDiagnosticSummary,
} from '../src/lib/feverLogic.js'
import { FINDING_STATES, normalizeClinicalContext } from '../src/lib/clinicalContext.js'
import {
  CANDIDATE_REGISTRY,
  DUPLICATE_CANDIDATE_ID_MAP,
  RED_FLAG_DEPENDENCY_MAP,
  TICK_SAFETY_INVARIANTS,
  getActiveCandidates,
  getCandidateById,
  getFutureCandidates,
} from '../src/lib/candidateRegistry.js'

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

function textOf(value) {
  return JSON.stringify(value)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runExpectationCases(cases) {
  return cases.map((testCase) => {
    let text = ''
    let missing = []
    try {
      text = textOf(testCase.actual())
      missing = testCase.expect.filter((needle) => !text.includes(needle))
    } catch (error) {
      missing = [`crashed: ${error instanceof Error ? error.message : String(error)}`]
    }
    return {
      name: testCase.name,
      expected: testCase.expect,
      result: missing.length === 0 ? 'Pass' : 'Fail',
      issues: missing,
    }
  })
}

const legacyCases = [
  {
    name: '01 shock shows sepsis/emergency concern',
    actual: () => assessEmergencySigns(['shock']),
    expect: ['危険サイン', '敗血症'],
  },
  {
    name: '02 meningeal sign shows meningitis concern',
    actual: () => assessEmergencySigns(['meningealSigns']),
    expect: ['髄膜炎'],
  },
  {
    name: '03 chills plus inflammation suggests infection',
    actual: () => assessInfectionLikelihood({ ...baseForm, chills: true }),
    expect: ['感染症を考慮', 'WBC高値', 'CRP高値'],
  },
  {
    name: '04 relative bradycardia lists key differentials',
    actual: () => assessInfectionLikelihood({ ...baseForm, temperature: '40', heartRate: '70' }),
    expect: ['相対的徐脈', 'レジオネラ', '薬剤熱', '腫瘍熱'],
  },
  {
    name: '05 respiratory findings suggest pneumonia',
    actual: () => assessRespiratoryFocus({ ...baseForm, respCough: true, respSputum: true, respImagingAbnormality: true }),
    expect: ['肺炎', '咳', '痰'],
  },
  {
    name: '06 urinary symptoms suggest pyelonephritis',
    actual: () => assessUrinaryFocus({ ...baseForm, urinaryDysuria: true, urinaryCvaTenderness: true }),
    expect: ['腎盂腎炎', '尿培養', '血液培養2セット'],
  },
  {
    name: '07 diarrhea plus antibiotics suggests CDI',
    actual: () => assessAbdominalFocus({ ...baseForm, diarrheaDetail: true, recentAntibiotics: true }),
    expect: ['CDI', '便中毒素', 'GDH'],
  },
  {
    name: '08 acute knee arthritis with fever suggests CPPD and septic arthritis caution',
    actual: () => assessBoneJointFocus({ ...baseForm, acuteJointPain: true, kneeJointPain: true, feverOver38: true }),
    expect: ['偽痛風', '化膿性関節炎', '関節穿刺'],
  },
  {
    name: '09 acute neck pain in older adult suggests CDS differential',
    actual: () => assessCentralNervousFocus({ ...baseForm, cnsOlderAdult: true, cnsAcuteNeckPain: true, cnsLimitedNeckRotation: true }),
    expect: ['Crowned dens syndrome', '頸椎CT'],
  },
  {
    name: '10 LDH high without source suggests intravascular lymphoma',
    actual: () => assessNonInfectiousFocus({ ...baseForm, nonInfLdhHigh: true, noClearInfectionFocus: true }),
    expect: ['血管内リンパ腫', 'ランダム皮膚生検'],
  },
  {
    name: '11 staphylococcus aureus bacteremia prompts echo/deep focus reassessment',
    actual: () => assessBloodstreamFocus({ ...baseForm, bsiStaphAureus: true, bsiPositiveBloodCulture: true }),
    expect: ['Staphylococcus aureus', '心エコー', '感染性心内膜炎'],
  },
  {
    name: '12 persistent shock after 48-72h triggers urgent reevaluation',
    actual: () => assessReevaluation({ ...baseForm, reevalPersistentShock: true, reevalLactateHigh: true }),
    expect: ['緊急再評価', 'ショック持続', '乳酸'],
  },
  {
    name: '13 improvement prompts de-escalation review',
    actual: () => assessReevaluation({ ...baseForm, reevalDefervesced: true, reevalInflammationImproved: true, reevalBloodCultureKnown: true }),
    expect: ['治療反応', 'de-escalation', '培養結果'],
  },
]

function runNormalizationTests() {
  const tests = []
  const add = (name, fn) => {
    try {
      fn()
      tests.push({ name, result: 'Pass', issues: [] })
    } catch (error) {
      tests.push({ name, result: 'Fail', issues: [error instanceof Error ? error.message : String(error)] })
    }
  }

  add('01 unanswered legacy boolean is not absent', () => {
    const context = normalizeClinicalContext({ ...baseForm, chills: false })
    assert(context.infectionPatterns.chills.state === FINDING_STATES.UNKNOWN, 'chills false should be unknown without explicit absence')
  })

  add('02 explicit absence becomes absent', () => {
    const context = normalizeClinicalContext({ ...baseForm, chills: false }, { explicitAbsences: ['chills'] })
    assert(context.infectionPatterns.chills.state === FINDING_STATES.ABSENT, 'explicit chills absence should be absent')
  })

  add('03 BT unmeasured is not normal', () => {
    const context = normalizeClinicalContext({ ...baseForm, temperature: '' })
    assert(context.vitals.bt.measurementState === FINDING_STATES.UNKNOWN, 'empty BT should be unknown')
    assert(context.vitals.fever.state === FINDING_STATES.UNKNOWN, 'empty BT should not derive fever absent')
  })

  add('04 CRP unmeasured is not low', () => {
    const context = normalizeClinicalContext({ ...baseForm, crp: '' })
    assert(context.inflammation.crp.measurementState === FINDING_STATES.UNKNOWN, 'empty CRP should be unknown')
    assert(context.inflammation.highCrp.state === FINDING_STATES.UNKNOWN, 'empty CRP should not derive low inflammation')
  })

  add('05 fever absent does not generate infection absent', () => {
    const context = normalizeClinicalContext({ ...baseForm, temperature: '36.5' })
    assert(context.vitals.fever.state === FINDING_STATES.ABSENT, 'measured afebrile should mark fever absent')
    assert(context.infectionPatterns.infectionAbsent.state === FINDING_STATES.NOT_ASSESSED, 'afebrile should not mark infection absent')
  })

  add('06 WBC normal does not generate infection absent', () => {
    const context = normalizeClinicalContext({ ...baseForm, wbc: '6200' })
    assert(context.inflammation.highWbc.state === FINDING_STATES.ABSENT, 'normal WBC should mark highWbc absent')
    assert(context.infectionPatterns.infectionAbsent.state === FINDING_STATES.NOT_ASSESSED, 'normal WBC should not mark infection absent')
  })

  add('07 tick fields not implemented are not assessed', () => {
    const context = normalizeClinicalContext(baseForm)
    assert(context.exposures.tickExposure.state === FINDING_STATES.NOT_ASSESSED, 'tickExposure should be not_assessed')
    assert(context.exposures.knownTickBite.state === FINDING_STATES.NOT_ASSESSED, 'knownTickBite should be not_assessed')
  })

  add('08 sodium is not assessed', () => {
    const context = normalizeClinicalContext(baseForm)
    assert(context.electrolytes.sodium.measurementState === FINDING_STATES.NOT_ASSESSED, 'sodium should be not_assessed')
    assert(context.electrolytes.hyponatremia.state === FINDING_STATES.NOT_ASSESSED, 'hyponatremia should be not_assessed')
  })

  add('09 legacy raw values are retained', () => {
    const context = normalizeClinicalContext({ ...baseForm, respCough: true })
    assert(context.rawAnswers.respCough === true, 'raw respCough should be retained')
    assert(context.rawAnswers.temperature === '38.5', 'raw temperature should be retained')
  })

  add('10 duplicate candidate ID mapping is canonical', () => {
    assert(DUPLICATE_CANDIDATE_ID_MAP.PMR === 'pmr', 'PMR should map to pmr')
    assert(DUPLICATE_CANDIDATE_ID_MAP['化膿性脊椎炎'] === 'vertebral_osteomyelitis', 'vertebral osteomyelitis should be canonical')
    assert(getCandidateById('vertebral_osteomyelitis')?.displayName === '化膿性脊椎炎', 'canonical candidate should exist')
  })

  return tests
}

function legacyBundle(form) {
  const step0Result = assessEmergencySigns(form.emergencySigns || [])
  const step1Result = assessInfectionLikelihood(form)
  const respiratoryResult = assessRespiratoryFocus(form)
  const urinaryResult = assessUrinaryFocus(form)
  const abdominalResult = assessAbdominalFocus(form)
  const boneJointResult = assessBoneJointFocus(form)
  const centralNervousResult = assessCentralNervousFocus(form)
  const bloodstreamResult = assessBloodstreamFocus(form)
  const nonInfectiousResult = assessNonInfectiousFocus(form)
  const testRecommendationResult = buildTestRecommendations({
    form,
    step0Result,
    respiratoryResult,
    urinaryResult,
    abdominalResult,
    skinResult: { cards: [] },
    boneJointResult,
    centralNervousResult,
    bloodstreamResult,
    nonInfectiousResult,
  })
  const summary = buildDiagnosticSummary({
    form,
    step0Result,
    step1Result,
    respiratoryResult,
    urinaryResult,
    abdominalResult,
    skinResult: { cards: [] },
    boneJointResult,
    centralNervousResult,
    bloodstreamResult,
    backPainResult: { cards: [] },
    neckPainResult: { cards: [] },
    noLocalizingResult: { cards: [] },
    nonInfectiousResult,
    testRecommendationResult,
  })
  return { step0Result, step1Result, respiratoryResult, urinaryResult, abdominalResult, boneJointResult, centralNervousResult, bloodstreamResult, nonInfectiousResult, testRecommendationResult, summary }
}

function runShadowComparison() {
  const scenarios = [
    { name: 'pneumonia', form: { ...baseForm, respCough: true, respSputum: true, respImagingAbnormality: true } },
    { name: 'pyelonephritis', form: { ...baseForm, urinaryCvaTenderness: true, urinaryChills: true } },
    { name: 'ie', form: { ...baseForm, bsiPositiveBloodCulture: true, bsiHeartMurmur: true, bsiProstheticValve: true } },
    { name: 'afebrile high crp', form: { ...baseForm, mainProblem: 'crpOnly', temperature: '36.7', crp: '12', wbc: '6200' } },
  ]

  return scenarios.map((scenario) => {
    const before = textOf(legacyBundle(scenario.form))
    const context = normalizeClinicalContext(scenario.form)
    const after = textOf(legacyBundle(scenario.form))
    return {
      name: scenario.name,
      result: before === after ? 'Pass' : 'Fail',
      issues: before === after ? [] : ['legacy output changed after shadow normalization'],
      normalizedDomains: Object.keys(context).filter((key) => key !== 'rawAnswers'),
    }
  })
}

function runRegistryTests() {
  const tests = []
  const add = (name, fn) => {
    try {
      fn()
      tests.push({ name, result: 'Pass', issues: [] })
    } catch (error) {
      tests.push({ name, result: 'Fail', issues: [error instanceof Error ? error.message : String(error)] })
    }
  }

  add('01 registry has active legacy candidates', () => {
    assert(getActiveCandidates().length >= 40, 'expected at least 40 active candidates')
  })
  add('02 registry has tick skeleton candidates only in future phase', () => {
    const futureIds = getFutureCandidates().map((item) => item.id).sort()
    assert(JSON.stringify(futureIds) === JSON.stringify(['japanese_spotted_fever', 'scrub_typhus', 'sfts']), `unexpected future candidates: ${futureIds.join(',')}`)
  })
  add('03 tick safety invariants are present', () => {
    assert(TICK_SAFETY_INVARIANTS.length === 6, 'expected six tick safety invariants')
  })
  add('04 red flag dependency map covers required diseases', () => {
    const names = RED_FLAG_DEPENDENCY_MAP.map((item) => item.name)
    for (const name of ['敗血症', '感染性心内膜炎', '髄膜炎', '壊死性筋膜炎', '大動脈解離', '血管内リンパ腫']) {
      assert(names.includes(name), `missing red flag dependency: ${name}`)
    }
  })
  add('05 every registry ID is unique', () => {
    const ids = CANDIDATE_REGISTRY.map((item) => item.id)
    assert(new Set(ids).size === ids.length, 'candidate IDs should be unique')
  })

  return tests
}

const legacyResults = runExpectationCases(legacyCases)
const normalizationResults = runNormalizationTests()
const registryResults = runRegistryTests()
const shadowResults = runShadowComparison()
const allResults = [...legacyResults, ...normalizationResults, ...registryResults, ...shadowResults]
const failed = allResults.filter((item) => item.result === 'Fail')

const report = {
  legacy: { total: legacyResults.length, pass: legacyResults.filter((item) => item.result === 'Pass').length, fail: legacyResults.filter((item) => item.result === 'Fail').length },
  normalization: { total: normalizationResults.length, pass: normalizationResults.filter((item) => item.result === 'Pass').length, fail: normalizationResults.filter((item) => item.result === 'Fail').length },
  registry: { total: registryResults.length, pass: registryResults.filter((item) => item.result === 'Pass').length, fail: registryResults.filter((item) => item.result === 'Fail').length },
  shadow: { total: shadowResults.length, pass: shadowResults.filter((item) => item.result === 'Pass').length, fail: shadowResults.filter((item) => item.result === 'Fail').length },
  total: { total: allResults.length, pass: allResults.length - failed.length, fail: failed.length },
  registryCandidateCount: CANDIDATE_REGISTRY.length,
  activeCandidateCount: getActiveCandidates().length,
  futureCandidateCount: getFutureCandidates().length,
  failed,
  results: allResults,
}

console.log(JSON.stringify(report, null, 2))

if (failed.length > 0) {
  process.exitCode = 1
}

