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
} from '../src/lib/feverLogic.js'

const baseForm = {
  emergencySigns: [],
  step2Symptoms: [],
  temperature: '38.5',
  heartRate: '105',
  wbc: '12000',
  crp: '10',
}

function textOf(value) {
  return JSON.stringify(value)
}

const cases = [
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

const results = cases.map((testCase) => {
  let actual
  let text
  let missing = []
  try {
    actual = testCase.actual()
    text = textOf(actual)
    missing = testCase.expect.filter((needle) => !text.includes(needle))
  } catch (error) {
    missing = [`crashed: ${error instanceof Error ? error.message : String(error)}`]
    text = ''
  }
  return {
    name: testCase.name,
    expected: testCase.expect,
    result: missing.length === 0 ? 'Pass' : 'Fail',
    issues: missing,
  }
})

const failed = results.filter((item) => item.result === 'Fail')
console.log(JSON.stringify({ total: results.length, pass: results.length - failed.length, fail: failed.length, failed, results }, null, 2))

if (failed.length > 0) {
  process.exitCode = 1
}