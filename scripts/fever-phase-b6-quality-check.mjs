import { spawnSync } from 'node:child_process'
import { normalizeClinicalContext, FINDING_STATES } from '../src/lib/clinicalContext.js'
import { buildAdaptiveQuestionShadow } from '../src/lib/feverAdaptiveEngine.js'
import {
  CANDIDATE_STATUS,
  TRAVEL_INFECTION_SAFETY_INVARIANTS,
  TICK_SAFETY_INVARIANTS,
  getActiveCandidates,
  getCandidateById,
  getFutureCandidates,
} from '../src/lib/candidateRegistry.js'
import { ADAPTIVE_QUESTION_REGISTRY } from '../src/lib/feverQuestionRegistry.js'

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

function runPhaseBRegression() {
  const result = spawnSync(process.execPath, ['scripts/fever-phase-b-quality-check.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    return { result: 'Fail', issues: [result.stderr || result.stdout || 'Phase B regression failed'] }
  }
  const report = JSON.parse(result.stdout)
  return { result: report.total.fail === 0 ? 'Pass' : 'Fail', issues: report.total.fail === 0 ? [] : [`Phase B failures: ${report.total.fail}`], report }
}

function runTests() {
  const tests = []
  const add = (name, fn) => {
    try {
      fn()
      tests.push({ name, result: 'Pass', issues: [] })
    } catch (error) {
      tests.push({ name, result: 'Fail', issues: [error instanceof Error ? error.message : String(error)] })
    }
  }

  add('01 malaria registry specification is future critical major candidate', () => {
    const malaria = getCandidateById('malaria')
    assert(malaria, 'malaria candidate missing')
    assert(malaria.status === CANDIDATE_STATUS.FUTURE_PHASE, 'malaria should stay futurePhase')
    assert(malaria.majorCandidate === true, 'malaria should be major candidate skeleton')
    assert(malaria.tier === 'critical', 'malaria should be critical tier')
  })

  add('02 malaria supporting findings include travel timing fever chills headache malaise thrombocytopenia', () => {
    const fields = getCandidateById('malaria').supportingFindings
    for (const field of ['exposures.internationalTravel.regionClassifications.malariaRiskArea', 'exposures.internationalTravel.daysSinceReturn', 'vitals.fever', 'infectionPatterns.chills', 'symptomDomains.neurologic.headache', 'symptomDomains.constitutional.malaise', 'hematology.thrombocytopenia']) {
      assert(fields.includes(field), `missing malaria support: ${field}`)
    }
  })

  add('03 malaria do-not-exclude preserves weak contradictions', () => {
    const malaria = getCandidateById('malaria')
    for (const phrase of ['周期熱なし', '現在無熱', 'CRP低値', 'WBC正常', '初回血液塗抹陰性', '渡航地域未確認', '帰国時期未確認']) {
      assert(malaria.doNotExclude.includes(phrase), `missing malaria do-not-exclude: ${phrase}`)
    }
  })

  add('04 malaria testing and repeat smear metadata are source-backed', () => {
    const malaria = getCandidateById('malaria')
    assert(malaria.suggestedTests.includes('厚層血液塗抹'), 'missing thick smear')
    assert(malaria.suggestedTests.includes('薄層血液塗抹'), 'missing thin smear')
    assert(malaria.suggestedTests.includes('迅速診断検査'), 'missing RDT')
    assert(malaria.medicalMetadata.repeatSmear.intervalHours === '12-24', 'repeat smear interval should be source metadata')
    assert(malaria.medicalMetadata.repeatSmear.maxSets === 3, 'repeat smear max sets should be 3')
  })

  add('05 dengue registry specification is future travel infection candidate', () => {
    const dengue = getCandidateById('dengue')
    assert(dengue, 'dengue candidate missing')
    assert(dengue.status === CANDIDATE_STATUS.FUTURE_PHASE, 'dengue should stay futurePhase')
    assert(dengue.category === 'travelInfection', 'dengue should be travelInfection')
  })

  add('06 dengue supporting findings and safety are present', () => {
    const dengue = getCandidateById('dengue')
    for (const field of ['exposures.internationalTravel.regionClassifications.dengueRiskArea', 'vitals.fever', 'symptomDomains.neurologic.headache', 'physicalFindings.rash', 'hematology.thrombocytopenia', 'hematology.leukopenia', 'symptomDomains.constitutional.myalgiaArthralgia']) {
      assert(dengue.supportingFindings.includes(field), `missing dengue support: ${field}`)
    }
    assert(dengue.doNotExclude.includes('初期IgM陰性'), 'early IgM negative should not exclude dengue')
  })

  add('07 dengue test timing stores NAAT NS1 IgM by illness timing', () => {
    const timing = getCandidateById('dengue').medicalMetadata.testTiming
    assert(timing.acuteDays === '0-7', 'acute dengue timing should be 0-7 days')
    assert(timing.acuteTests.some((item) => item.includes('NAAT')), 'missing NAAT acute test')
    assert(timing.acuteTests.some((item) => item.includes('NS1')), 'missing NS1 acute test')
    assert(timing.convalescentTests.includes('IgM'), 'missing IgM convalescent test')
  })

  add('08 malaria and dengue can coexist for travel fever thrombocytopenia', () => {
    const travelContext = normalizeClinicalContext({ ...baseForm, travelExposure: true, travelMalariaRiskArea: true, travelDengueRiskArea: true, thrombocytopenia: true })
    assert(travelContext.exposures.internationalTravel.state.state === FINDING_STATES.PRESENT, 'travel should be present')
    assert(travelContext.exposures.internationalTravel.regionClassifications.malariaRiskArea.state === FINDING_STATES.PRESENT, 'malaria risk should be present')
    assert(travelContext.exposures.internationalTravel.regionClassifications.dengueRiskArea.state === FINDING_STATES.PRESENT, 'dengue risk should be present')
    assert(getCandidateById('malaria').safetyNotes.some((note) => note.includes('デング候補') || note.includes('渡航地域')), 'malaria safety note missing')
    assert(getCandidateById('dengue').safetyNotes.some((note) => note.includes('マラリア評価')), 'dengue should not hide malaria')
  })

  add('09 travel unknown is not converted to negative', () => {
    const context = normalizeClinicalContext(baseForm)
    assert(context.exposures.internationalTravel.state.state === FINDING_STATES.NOT_ASSESSED, 'travel should be not assessed')
    assert(context.exposures.internationalTravel.daysSinceReturn.measurementState === FINDING_STATES.UNKNOWN, 'return timing should be unknown')
  })

  add('10 return date unknown is not converted to irrelevant', () => {
    const context = normalizeClinicalContext({ ...baseForm, travelExposure: true, travelMalariaRiskArea: true })
    assert(context.exposures.internationalTravel.state.state === FINDING_STATES.PRESENT, 'travel should be present')
    assert(context.exposures.internationalTravel.daysSinceReturn.measurementState === FINDING_STATES.UNKNOWN, 'unknown return date should remain unknown')
  })

  add('11 free-text country is display-only and classification drives medical rules', () => {
    const context = normalizeClinicalContext({ ...baseForm, travelCountryText: 'Ghana' })
    assert(context.exposures.internationalTravel.countryText.value === 'Ghana', 'country raw text should be retained')
    assert(context.exposures.internationalTravel.countryText.ruleUse.includes('never compare'), 'country text must not drive rules')
    assert(context.exposures.internationalTravel.regionClassifications.malariaRiskArea.state === FINDING_STATES.NOT_ASSESSED, 'classification should remain controlled/not assessed')
  })

  add('12 chikungunya skeleton exists without active ranking connection', () => {
    const chikungunya = getCandidateById('chikungunya')
    assert(chikungunya.status === CANDIDATE_STATUS.FUTURE_PHASE, 'chikungunya should stay futurePhase')
    assert(chikungunya.supportingFindings.includes('symptomDomains.constitutional.prominentArthralgia'), 'prominent arthralgia support missing')
  })

  add('13 travel adaptive questions are futurePhase and capped to three per round', () => {
    const travelQuestions = ADAPTIVE_QUESTION_REGISTRY.filter((question) => question.id.startsWith('q_travel_'))
    assert(travelQuestions.length === 4, 'expected four travel adaptive questions')
    assert(travelQuestions.every((question) => question.activationRequirements.candidateStatus === CANDIDATE_STATUS.FUTURE_PHASE), 'travel questions should be futurePhase')
    const shadow = buildAdaptiveQuestionShadow({ ...baseForm, travelExposure: true, travelMalariaRiskArea: true, travelDengueRiskArea: true }, { allowFuturePhaseQuestions: true, limit: 99 })
    assert(shadow.roundQuestions.length <= 3, 'adaptive round should stay capped at 3')
  })

  add('14 initial screen should need only one travel entry question', () => {
    const initialQuestion = ADAPTIVE_QUESTION_REGISTRY.find((question) => question.id === 'q_travel_recent')
    assert(initialQuestion.label === '最近、海外への渡航・滞在がありましたか？', 'initial travel gate question mismatch')
  })

  add('15 tick safety regression is unchanged', () => {
    assert(TICK_SAFETY_INVARIANTS.includes('knownTickBite absent does not exclude tick-borne disease'), 'tick no-bite invariant missing')
    assert(TICK_SAFETY_INVARIANTS.includes('hyponatremia is a supporting clue, not a required condition'), 'tick low sodium invariant missing')
  })

  add('16 travel safety invariants are retained', () => {
    assert(TRAVEL_INFECTION_SAFETY_INVARIANTS.length >= 10, 'travel safety invariant count too low')
    assert(TRAVEL_INFECTION_SAFETY_INVARIANTS.some((item) => item.includes('single negative initial blood smear')), 'malaria initial negative smear invariant missing')
    assert(TRAVEL_INFECTION_SAFETY_INVARIANTS.some((item) => item.includes('early negative IgM')), 'dengue early IgM invariant missing')
  })

  add('17 travel candidate skeletons are not active candidates', () => {
    const activeIds = getActiveCandidates().map((item) => item.id)
    for (const id of ['malaria', 'dengue', 'chikungunya']) {
      assert(!activeIds.includes(id), `${id} should not be active`)
    }
  })

  add('18 imported infection grouping is available without replacing disease names', () => {
    for (const id of ['malaria', 'dengue', 'chikungunya']) {
      const candidate = getCandidateById(id)
      assert(candidate.medicalMetadata.presentationCategory === '渡航関連感染症', `${id} grouping missing`)
      assert(candidate.displayName.length > 0, `${id} should keep disease name`)
    }
  })

  add('19 future candidate count includes travel and tick skeletons', () => {
    const ids = getFutureCandidates().map((item) => item.id).sort()
    for (const id of ['malaria', 'dengue', 'chikungunya', 'sfts', 'japanese_spotted_fever', 'scrub_typhus']) {
      assert(ids.includes(id), `missing future candidate: ${id}`)
    }
  })

  add('20 active candidate count is unchanged at 49', () => {
    assert(getActiveCandidates().length === 49, `active candidate count changed: ${getActiveCandidates().length}`)
  })

  return tests
}

const phaseB = runPhaseBRegression()
const tests = runTests()
const failed = [
  ...(phaseB.result === 'Pass' ? [] : [{ name: 'Phase B regression', issues: phaseB.issues }]),
  ...tests.filter((item) => item.result === 'Fail'),
]

const report = {
  phaseB: phaseB.report?.total || null,
  travelSpecification: { total: tests.length, pass: tests.length - tests.filter((item) => item.result === 'Fail').length, fail: tests.filter((item) => item.result === 'Fail').length },
  registryCandidateCount: getActiveCandidates().length + getFutureCandidates().length,
  activeCandidateCount: getActiveCandidates().length,
  futureCandidateCount: getFutureCandidates().length,
  total: { total: (phaseB.report?.total.total || 0) + tests.length, fail: failed.length },
  failed,
  tests,
}

console.log(JSON.stringify(report, null, 2))

if (failed.length > 0) {
  process.exitCode = 1
}
