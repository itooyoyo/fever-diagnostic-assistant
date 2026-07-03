import { useMemo, useState } from 'react'
import heroImg from './assets/hero.png'
import './App.css'

const emergencySignOptions = [
  { id: 'shock', label: 'ショック' },
  { id: 'alteredMentalStatus', label: '意識障害' },
  { id: 'respiratoryFailure', label: '呼吸不全' },
  { id: 'lowSpo2', label: 'SpO2低下' },
  { id: 'meningealSigns', label: '髄膜刺激徴候' },
  { id: 'neutropenia', label: '好中球減少' },
  { id: 'immunosuppression', label: '免疫抑制' },
  { id: 'severePain', label: '強い疼痛' },
  { id: 'necrotizingSkin', label: '壊死性筋膜炎を疑う皮膚所見' },
]

const step1ToggleOptions = [
  { id: 'chills', label: '悪寒戦慄' },
  { id: 'localSymptoms', label: '局所症状あり' },
  { id: 'recentDrugStart', label: '最近の薬剤開始' },
  { id: 'malignancyHistory', label: '悪性腫瘍既往' },
  { id: 'collagenDiseaseHistory', label: '膠原病既往' },
  { id: 'noClearInfectionFocus', label: '感染巣不明' },
  { id: 'noMarkedTachycardia', label: '頻脈が目立たない' },
  { id: 'betaBlocker', label: 'β遮断薬使用' },
  { id: 'calciumChannelBlocker', label: 'Ca拮抗薬使用' },
  { id: 'avBlock', label: '房室ブロック' },
  { id: 'pacemaker', label: 'ペースメーカー装着' },
]

const specialDifferentialOptions = [
  { id: 'legSwelling', label: '下肢腫脹' },
  { id: 'chestPain', label: '胸痛' },
  { id: 'dyspnea', label: '呼吸困難・息切れ' },
  { id: 'suspectedDvtPe', label: 'DVT/PEを疑う所見' },
  { id: 'palpitations', label: '動悸' },
  { id: 'ecgAbnormality', label: '心電図異常' },
  { id: 'troponinElevation', label: 'トロポニン上昇' },
  { id: 'ssriSnriUse', label: 'SSRI/SNRIなど使用' },
  { id: 'ckElevation', label: 'CK上昇' },
  { id: 'autonomicSymptoms', label: '自律神経症状' },
  { id: 'tremor', label: '振戦' },
  { id: 'muscleRigidity', label: '筋強剛' },
  { id: 'thrombocytopenia', label: '血小板低下' },
  { id: 'edema', label: '浮腫' },
  { id: 'renalDysfunction', label: '腎機能障害' },
  { id: 'organomegaly', label: '臓器腫大' },
]

const step2SymptomOptions = [
  { id: 'symptomRespiratory', label: '呼吸器症状', implemented: true },
  { id: 'symptomUrinary', label: '尿路症状', implemented: true },
  { id: 'symptomAbdominalPain', label: '腹痛', implemented: true },
  { id: 'symptomDiarrhea', label: '下痢', implemented: true },
  { id: 'symptomHeadache', label: '頭痛', implemented: true },
  { id: 'symptomNeckPain', label: '頸部痛', implemented: true },
  { id: 'symptomBackPain', label: '腰背部痛', implemented: true },
  { id: 'symptomJointPain', label: '関節痛', implemented: true },
  { id: 'symptomSkinFindings', label: '皮膚所見', implemented: true },
  { id: 'symptomChestPain', label: '胸痛' },
  { id: 'symptomChills', label: '悪寒戦慄', implemented: true },
  { id: 'symptomPositiveBloodCulture', label: '血液培養陽性', implemented: true },
  { id: 'symptomNoLocalizing', label: '局所症状なし', implemented: true },
]

const respiratoryOptions = [
  { id: 'respCough', label: '咳' },
  { id: 'respSputum', label: '痰' },
  { id: 'respDyspnea', label: '呼吸困難' },
  { id: 'respChestPain', label: '胸痛' },
  { id: 'respLowSpo2', label: 'SpO2低下' },
  { id: 'respImagingAbnormality', label: '胸部X線/CT異常' },
  { id: 'smokingHistory', label: '喫煙歴' },
  { id: 'copdHistory', label: 'COPD既往' },
  { id: 'respImmunosuppression', label: '免疫抑制' },
  { id: 'biologicsUse', label: '生物学的製剤使用' },
]

const respiratoryRecommendedTests = [
  '胸部X線',
  '必要に応じて胸部CT',
  '喀痰グラム染色・培養',
  '血液培養2セット',
  '尿中肺炎球菌抗原',
  '尿中レジオネラ抗原',
  '抗酸菌検査',
  'β-Dグルカン',
  'SpO2/酸素需要の評価',
]

const backPainOptions = [
  { id: 'cvaTenderness', label: 'CVA叩打痛' },
  { id: 'dysuria', label: '排尿痛' },
  { id: 'positiveBloodCulture', label: '血液培養陽性' },
  { id: 'backPainChills', label: '悪寒戦慄' },
  { id: 'prostheticValve', label: '人工弁' },
  { id: 'dialysis', label: '透析' },
  { id: 'lumbarTenderness', label: '腰椎叩打痛' },
  { id: 'walkingDifficulty', label: '歩行困難' },
  { id: 'movementDifficulty', label: '体動困難' },
  { id: 'severeBackPain', label: '強い腰背部痛・胸背部痛' },
]

const neckPainOptions = [
  { id: 'neckHeadache', label: '頭痛' },
  { id: 'neckStiffness', label: '項部硬直' },
  { id: 'neckAlteredMentalStatus', label: '意識障害' },
  { id: 'acuteNeckPain', label: '急性頸部痛' },
  { id: 'limitedNeckRotation', label: '頸部回旋制限' },
  { id: 'olderAdult', label: '高齢者' },
  { id: 'shoulderThighPain', label: '肩や大腿の痛み' },
  { id: 'neckBackPain', label: '腰背部痛' },
]

const noLocalizingOptions = [
  { id: 'unknownLdhHigh', label: 'LDH高値' },
  { id: 'unknownAnemia', label: '貧血' },
  { id: 'unknownThrombocytopenia', label: '血小板低下' },
  { id: 'unknownNightSweats', label: '夜間発汗' },
  { id: 'unknownWeightLoss', label: '体重減少' },
  { id: 'unknownBackPain', label: '腰背部痛' },
  { id: 'temporalArteryTenderness', label: '側頭動脈圧痛' },
  { id: 'unknownShoulderThighPain', label: '肩・大腿痛' },
  { id: 'thoracodorsalPain', label: '胸背部痛' },
  { id: 'unknownChills', label: '悪寒戦慄' },
  { id: 'unknownPositiveBloodCulture', label: '血液培養陽性' },
  { id: 'heartMurmur', label: '心雑音' },
  { id: 'unknownProstheticValve', label: '人工弁' },
  { id: 'unknownPacemaker', label: 'ペースメーカー' },
  { id: 'unknownDialysis', label: '透析' },
  { id: 'unknownRash', label: '発疹' },
  { id: 'ssriUse', label: 'SSRI使用' },
  { id: 'unknownCkHigh', label: 'CK高値' },
  { id: 'unknownEdema', label: '浮腫' },
  { id: 'unknownRenalDysfunction', label: '腎機能障害' },
  { id: 'unknownOrganomegaly', label: '臓器腫大' },
]

const urinaryOptions = [
  { id: 'urinaryDysuria', label: '排尿痛' },
  { id: 'urinaryFrequency', label: '頻尿' },
  { id: 'cloudyUrine', label: '尿混濁' },
  { id: 'urinaryCvaTenderness', label: 'CVA叩打痛' },
  { id: 'urinaryBackPain', label: '腰背部痛' },
  { id: 'urinaryChills', label: '悪寒戦慄' },
  { id: 'nauseaVomiting', label: '嘔気・嘔吐' },
  { id: 'urinaryCatheter', label: '尿道カテーテルあり' },
  { id: 'prostateSymptoms', label: '前立腺症状' },
  { id: 'perinealPain', label: '会陰部痛' },
  { id: 'urinaryRetention', label: '尿閉' },
  { id: 'diabetes', label: '糖尿病' },
  { id: 'ckd', label: 'CKD' },
  { id: 'urinaryDialysis', label: '透析' },
  { id: 'urinaryImmunosuppression', label: '免疫抑制' },
  { id: 'kidneyStoneHistory', label: '腎結石既往' },
  { id: 'suspectedUrinaryObstruction', label: '尿路閉塞疑い' },
]

const abdominalOptions = [
  { id: 'rightUpperQuadrantPain', label: '右季肋部痛' },
  { id: 'abdominalPainDetail', label: '腹痛' },
  { id: 'reboundTenderness', label: '反跳痛・筋性防御' },
  { id: 'jaundice', label: '黄疸' },
  { id: 'hepatobiliaryEnzymeElevation', label: '肝胆道系酵素上昇' },
  { id: 'diarrheaDetail', label: '下痢' },
  { id: 'wateryStool', label: '水様便' },
  { id: 'bloodyStool', label: '血便' },
  { id: 'recentAntibiotics', label: '最近3か月以内の抗菌薬使用' },
  { id: 'recentHospitalization', label: '最近の入院歴' },
  { id: 'abdominalSurgeryHistory', label: '腹部手術歴' },
  { id: 'abdominalChills', label: '悪寒戦慄' },
  { id: 'vomiting', label: '嘔吐' },
  { id: 'abdominalImmunosuppression', label: '免疫抑制' },
]

const skinSoftTissueOptions = [
  { id: 'skinRedness', label: '発赤' },
  { id: 'skinSwelling', label: '腫脹' },
  { id: 'skinWarmth', label: '熱感' },
  { id: 'severeSkinPain', label: '強い疼痛' },
  { id: 'painOutOfProportion', label: '皮膚所見に比して疼痛が強い' },
  { id: 'skinBlister', label: '水疱' },
  { id: 'skinNecrosis', label: '皮膚壊死' },
  { id: 'skinPeeling', label: '皮膚剥離' },
  { id: 'skinAbscess', label: '膿瘍' },
  { id: 'diabeticFoot', label: '糖尿病足' },
  { id: 'pressureUlcer', label: '褥瘡' },
  { id: 'skinTrauma', label: '外傷' },
  { id: 'postoperativeSkin', label: '手術後' },
  { id: 'skinImmunosuppression', label: '免疫抑制' },
  { id: 'skinHypotension', label: '低血圧' },
  { id: 'skinMultiOrganFailure', label: '多臓器障害' },
  { id: 'generalizedRash', label: '全身発疹' },
]

const boneJointOptions = [
  { id: 'acuteJointPain', label: '急性関節痛' },
  { id: 'jointSwelling', label: '関節腫脹' },
  { id: 'kneeJointPain', label: '膝関節痛' },
  { id: 'polyarthralgia', label: '多関節痛' },
  { id: 'jointRedness', label: '発赤' },
  { id: 'limitedRangeOfMotion', label: '可動域制限' },
  { id: 'prostheticJoint', label: '人工関節' },
  { id: 'boneBackPain', label: '腰背部痛' },
  { id: 'sternoclavicularPain', label: '胸鎖関節痛' },
  { id: 'boneDiabetes', label: '糖尿病' },
  { id: 'boneImmunosuppression', label: '免疫抑制' },
  { id: 'bonePostoperative', label: '手術後' },
  { id: 'boneTrauma', label: '外傷' },
  { id: 'feverOver38', label: '38℃以上の発熱' },
  { id: 'crpOver10', label: 'CRP 10以上' },
]

const centralNervousOptions = [
  { id: 'cnsHeadache', label: '頭痛' },
  { id: 'cnsNeckStiffness', label: '項部硬直' },
  { id: 'cnsAlteredMentalStatus', label: '意識障害' },
  { id: 'cnsSeizure', label: '痙攣' },
  { id: 'cnsAcuteNeckPain', label: '急性頸部痛' },
  { id: 'cnsLimitedNeckRotation', label: '頸部回旋制限' },
  { id: 'cnsOlderAdult', label: '高齢者' },
  { id: 'cnsImmunosuppression', label: '免疫抑制' },
  { id: 'cnsRash', label: '皮疹' },
  { id: 'cnsBackPain', label: '腰背部痛' },
  { id: 'cnsShoulderThighPain', label: '肩・大腿痛' },
  { id: 'focalNeurologicDeficit', label: '神経巣症状' },
  { id: 'suspectedPapilledema', label: '乳頭浮腫疑い' },
]

const bloodstreamOptions = [
  { id: 'bsiChills', label: '悪寒戦慄' },
  { id: 'bsiPositiveBloodCulture', label: '血液培養陽性' },
  { id: 'bsiGpc', label: 'GPC' },
  { id: 'bsiGnr', label: 'GNR' },
  { id: 'bsiMixedGpcGnr', label: 'GPC＋GNR混在' },
  { id: 'bsiCandida', label: 'Candida' },
  { id: 'bsiStaphAureus', label: 'Staphylococcus aureus' },
  { id: 'bsiStreptococcus', label: 'Streptococcus' },
  { id: 'bsiEnterococcus', label: 'Enterococcus' },
  { id: 'bsiHeartMurmur', label: '心雑音' },
  { id: 'bsiProstheticValve', label: '人工弁' },
  { id: 'bsiPacemaker', label: 'ペースメーカー' },
  { id: 'bsiDialysis', label: '透析' },
  { id: 'bsiCentralVenousCatheter', label: 'CVカテーテル' },
  { id: 'bsiPort', label: 'ポート' },
  { id: 'bsiProstheticJoint', label: '人工関節' },
  { id: 'bsiBackPain', label: '腰背部痛' },
  { id: 'bsiCerebralEmbolicSymptoms', label: '脳塞栓症状' },
  { id: 'bsiSkinFindings', label: '皮膚所見' },
  { id: 'bsiEyeSymptoms', label: '眼症状' },
]

const urgentActions = [
  'バイタル再評価',
  '血液培養2セット',
  '乳酸測定',
  '臓器障害評価',
  '感染巣検索',
  '必要に応じて培養採取後に経験的治療を検討',
]

const warningSigns = [
  '息苦しさ、胸や腹部の強い痛み・圧迫感',
  '意識がぼんやりする、起こしても反応が弱い',
  'けいれん、強いめまい、立てないほどの脱力',
  '尿が出ない、涙が出ない、口が乾くなど脱水が強い',
  '熱や咳が一度よくなった後に再び悪化した',
  '持病が悪化している',
]

const relativeBradycardiaDifferentials = [
  'チフス',
  'ブルセラ',
  'レプトスピラ',
  'レジオネラ',
  'サルモネラ',
  'オウム病',
  'マラリア',
  '薬剤熱',
  '腫瘍熱',
]

const mainProblemOptions = [
  { id: 'fever', label: '発熱がある' },
  { id: 'crpOnly', label: 'CRP高値のみ' },
  { id: 'feverAndCrp', label: '発熱＋CRP高値' },
  { id: 'fuo', label: '原因不明発熱（FUO）' },
  { id: 'persistentInflammation', label: '炎症反応遷延' },
]

const crpOnlyDifferentials = [
  {
    title: '感染症',
    tone: 'caution',
    items: ['感染性心内膜炎', '化膿性脊椎炎', '深部膿瘍', '結核'],
  },
  {
    title: '非感染症',
    tone: 'info',
    items: [
      '血管内リンパ腫',
      '悪性リンパ腫',
      '薬剤熱',
      'PMR',
      'GCA',
      'TAFRO',
      'ANCA関連血管炎',
      '偽痛風',
      'Crowned dens syndrome',
    ],
  },
]

const fuoCategoryCards = [
  '感染症',
  '悪性腫瘍',
  '自己免疫',
  '薬剤',
  '血栓症',
  '大動脈疾患',
]

const step3NonInfectiousOptions = [
  { id: 'nonInfRecentDrugStart', label: '最近開始した薬剤' },
  { id: 'nonInfAntibioticsUse', label: '抗菌薬使用中' },
  { id: 'nonInfMalignancyHistory', label: '悪性腫瘍既往' },
  { id: 'nonInfNightSweats', label: '夜間発汗' },
  { id: 'nonInfWeightLoss', label: '体重減少' },
  { id: 'nonInfLdhHigh', label: 'LDH高値' },
  { id: 'nonInfThrombocytopenia', label: '血小板低下' },
  { id: 'nonInfEdema', label: '浮腫' },
  { id: 'nonInfRenalDysfunction', label: '腎機能障害' },
  { id: 'nonInfShoulderThighPain', label: '肩・大腿痛' },
  { id: 'nonInfTemporalArteryTenderness', label: '側頭動脈圧痛' },
  { id: 'nonInfAcuteJointPain', label: '急性関節痛' },
  { id: 'nonInfKneeJointPain', label: '膝関節痛' },
  { id: 'nonInfLegSwelling', label: '下肢腫脹' },
  { id: 'nonInfChestPain', label: '胸痛' },
  { id: 'nonInfDyspnea', label: '呼吸困難' },
  { id: 'nonInfSsriSnriUse', label: 'SSRI/SNRI使用' },
  { id: 'nonInfCkHigh', label: 'CK高値' },
]

const step6ReevaluationOptions = [
  { id: 'reevalDefervesced', label: '解熱した' },
  { id: 'reevalInflammationImproved', label: 'CRP/WBCが改善した' },
  { id: 'reevalBloodCultureKnown', label: '血液培養結果が判明した' },
  { id: 'reevalImagingFocusFound', label: '画像で感染巣が見つかった' },
  { id: 'reevalDrainableAbscess', label: 'ドレナージが必要な膿瘍がある' },
  { id: 'reevalAntibioticDoseAppropriate', label: '抗菌薬投与量は適切' },
  { id: 'reevalRenalDoseAdjusted', label: '腎機能に応じた投与量調整済み' },
  { id: 'reevalDeEscalationConsidered', label: '培養結果に応じてde-escalation検討済み' },
  { id: 'reevalNonInfectionReevaluated', label: '非感染症を再評価した' },
  { id: 'reevalFungalTbAtypicalReevaluated', label: '真菌・結核・非定型感染を再評価した' },
]

const step6CriticalOptions = [
  { id: 'reevalPersistentShock', label: 'ショック持続' },
  { id: 'reevalLactateHigh', label: '乳酸高値' },
  { id: 'reevalPersistentPositiveBloodCulture', label: '血液培養陽性持続' },
  { id: 'reevalNecFasciitisConcern', label: '壊死性筋膜炎疑い' },
  { id: 'reevalIeConcern', label: 'IE疑い' },
]

const initialForm = {
  mainProblem: 'fever',
  emergencySigns: [],
  temperature: '',
  heartRate: '',
  systolicBp: '',
  spo2: '',
  wbc: '',
  crp: '',
  chills: false,
  localSymptoms: false,
  recentDrugStart: false,
  malignancyHistory: false,
  collagenDiseaseHistory: false,
  noClearInfectionFocus: false,
  noMarkedTachycardia: false,
  betaBlocker: false,
  calciumChannelBlocker: false,
  avBlock: false,
  pacemaker: false,
  legSwelling: false,
  chestPain: false,
  dyspnea: false,
  suspectedDvtPe: false,
  palpitations: false,
  ecgAbnormality: false,
  troponinElevation: false,
  ssriSnriUse: false,
  ckElevation: false,
  autonomicSymptoms: false,
  tremor: false,
  muscleRigidity: false,
  thrombocytopenia: false,
  edema: false,
  renalDysfunction: false,
  organomegaly: false,
  step2Symptoms: [],
  respCough: false,
  respSputum: false,
  respDyspnea: false,
  respChestPain: false,
  respLowSpo2: false,
  respImagingAbnormality: false,
  smokingHistory: false,
  copdHistory: false,
  respImmunosuppression: false,
  biologicsUse: false,
  cvaTenderness: false,
  dysuria: false,
  positiveBloodCulture: false,
  backPainChills: false,
  prostheticValve: false,
  dialysis: false,
  lumbarTenderness: false,
  walkingDifficulty: false,
  movementDifficulty: false,
  severeBackPain: false,
  neckHeadache: false,
  neckStiffness: false,
  neckAlteredMentalStatus: false,
  acuteNeckPain: false,
  limitedNeckRotation: false,
  olderAdult: false,
  shoulderThighPain: false,
  neckBackPain: false,
  unknownLdhHigh: false,
  unknownAnemia: false,
  unknownThrombocytopenia: false,
  unknownNightSweats: false,
  unknownWeightLoss: false,
  unknownBackPain: false,
  temporalArteryTenderness: false,
  unknownShoulderThighPain: false,
  thoracodorsalPain: false,
  unknownChills: false,
  unknownPositiveBloodCulture: false,
  heartMurmur: false,
  unknownProstheticValve: false,
  unknownPacemaker: false,
  unknownDialysis: false,
  unknownRash: false,
  ssriUse: false,
  unknownCkHigh: false,
  unknownEdema: false,
  unknownRenalDysfunction: false,
  unknownOrganomegaly: false,
  urinaryDysuria: false,
  urinaryFrequency: false,
  cloudyUrine: false,
  urinaryCvaTenderness: false,
  urinaryBackPain: false,
  urinaryChills: false,
  nauseaVomiting: false,
  urinaryCatheter: false,
  prostateSymptoms: false,
  perinealPain: false,
  urinaryRetention: false,
  diabetes: false,
  ckd: false,
  urinaryDialysis: false,
  urinaryImmunosuppression: false,
  kidneyStoneHistory: false,
  suspectedUrinaryObstruction: false,
  rightUpperQuadrantPain: false,
  abdominalPainDetail: false,
  reboundTenderness: false,
  jaundice: false,
  hepatobiliaryEnzymeElevation: false,
  diarrheaDetail: false,
  wateryStool: false,
  bloodyStool: false,
  recentAntibiotics: false,
  recentHospitalization: false,
  abdominalSurgeryHistory: false,
  abdominalChills: false,
  vomiting: false,
  abdominalImmunosuppression: false,
  skinRedness: false,
  skinSwelling: false,
  skinWarmth: false,
  severeSkinPain: false,
  painOutOfProportion: false,
  skinBlister: false,
  skinNecrosis: false,
  skinPeeling: false,
  skinAbscess: false,
  diabeticFoot: false,
  pressureUlcer: false,
  skinTrauma: false,
  postoperativeSkin: false,
  skinImmunosuppression: false,
  skinHypotension: false,
  skinMultiOrganFailure: false,
  generalizedRash: false,
  acuteJointPain: false,
  jointSwelling: false,
  kneeJointPain: false,
  polyarthralgia: false,
  jointRedness: false,
  limitedRangeOfMotion: false,
  prostheticJoint: false,
  boneBackPain: false,
  sternoclavicularPain: false,
  boneDiabetes: false,
  boneImmunosuppression: false,
  bonePostoperative: false,
  boneTrauma: false,
  feverOver38: false,
  crpOver10: false,
  cnsHeadache: false,
  cnsNeckStiffness: false,
  cnsAlteredMentalStatus: false,
  cnsSeizure: false,
  cnsAcuteNeckPain: false,
  cnsLimitedNeckRotation: false,
  cnsOlderAdult: false,
  cnsImmunosuppression: false,
  cnsRash: false,
  cnsBackPain: false,
  cnsShoulderThighPain: false,
  focalNeurologicDeficit: false,
  suspectedPapilledema: false,
  bsiChills: false,
  bsiPositiveBloodCulture: false,
  bsiGpc: false,
  bsiGnr: false,
  bsiMixedGpcGnr: false,
  bsiCandida: false,
  bsiStaphAureus: false,
  bsiStreptococcus: false,
  bsiEnterococcus: false,
  bsiHeartMurmur: false,
  bsiProstheticValve: false,
  bsiPacemaker: false,
  bsiDialysis: false,
  bsiCentralVenousCatheter: false,
  bsiPort: false,
  bsiProstheticJoint: false,
  bsiBackPain: false,
  bsiCerebralEmbolicSymptoms: false,
  bsiSkinFindings: false,
  bsiEyeSymptoms: false,
  nonInfRecentDrugStart: false,
  nonInfAntibioticsUse: false,
  nonInfMalignancyHistory: false,
  nonInfNightSweats: false,
  nonInfWeightLoss: false,
  nonInfLdhHigh: false,
  nonInfThrombocytopenia: false,
  nonInfEdema: false,
  nonInfRenalDysfunction: false,
  nonInfShoulderThighPain: false,
  nonInfTemporalArteryTenderness: false,
  nonInfAcuteJointPain: false,
  nonInfKneeJointPain: false,
  nonInfLegSwelling: false,
  nonInfChestPain: false,
  nonInfDyspnea: false,
  nonInfSsriSnriUse: false,
  nonInfCkHigh: false,
  reevalDefervesced: false,
  reevalInflammationImproved: false,
  reevalBloodCultureKnown: false,
  reevalImagingFocusFound: false,
  reevalDrainableAbscess: false,
  reevalAntibioticDoseAppropriate: false,
  reevalRenalDoseAdjusted: false,
  reevalDeEscalationConsidered: false,
  reevalNonInfectionReevaluated: false,
  reevalFungalTbAtypicalReevaluated: false,
  reevalPersistentShock: false,
  reevalLactateHigh: false,
  reevalPersistentPositiveBloodCulture: false,
  reevalNecFasciitisConcern: false,
  reevalIeConcern: false,
}

function App() {
  const [activeStep, setActiveStep] = useState('step0')
  const [form, setForm] = useState(initialForm)

  const step0Result = useMemo(
    () => assessEmergencySigns(form.emergencySigns),
    [form.emergencySigns],
  )
  const step1Result = useMemo(() => assessInfectionLikelihood(form), [form])
  const respiratoryResult = useMemo(() => assessRespiratoryFocus(form), [form])
  const urinaryResult = useMemo(() => assessUrinaryFocus(form), [form])
  const abdominalResult = useMemo(() => assessAbdominalFocus(form), [form])
  const skinResult = useMemo(() => assessSkinSoftTissueFocus(form), [form])
  const boneJointResult = useMemo(() => assessBoneJointFocus(form), [form])
  const centralNervousResult = useMemo(
    () => assessCentralNervousFocus(form),
    [form],
  )
  const bloodstreamResult = useMemo(() => assessBloodstreamFocus(form), [form])
  const backPainResult = useMemo(() => assessBackPainFocus(form), [form])
  const neckPainResult = useMemo(() => assessNeckPainFocus(form), [form])
  const noLocalizingResult = useMemo(
    () => assessNoLocalizingFocus(form),
    [form],
  )
  const nonInfectiousResult = useMemo(
    () => assessNonInfectiousFocus(form),
    [form],
  )
  const testRecommendationResult = useMemo(
    () =>
      buildTestRecommendations({
        form,
        step0Result,
        respiratoryResult,
        urinaryResult,
        abdominalResult,
        skinResult,
        boneJointResult,
        centralNervousResult,
        bloodstreamResult,
        nonInfectiousResult,
      }),
    [
      form,
      step0Result,
      respiratoryResult,
      urinaryResult,
      abdominalResult,
      skinResult,
      boneJointResult,
      centralNervousResult,
      bloodstreamResult,
      nonInfectiousResult,
    ],
  )
  const diagnosticSummaryResult = useMemo(
    () =>
      buildDiagnosticSummary({
        form,
        step0Result,
        step1Result,
        respiratoryResult,
        urinaryResult,
        abdominalResult,
        skinResult,
        boneJointResult,
        centralNervousResult,
        bloodstreamResult,
        backPainResult,
        neckPainResult,
        noLocalizingResult,
        nonInfectiousResult,
        testRecommendationResult,
      }),
    [
      form,
      step0Result,
      step1Result,
      respiratoryResult,
      urinaryResult,
      abdominalResult,
      skinResult,
      boneJointResult,
      centralNervousResult,
      bloodstreamResult,
      backPainResult,
      neckPainResult,
      noLocalizingResult,
      nonInfectiousResult,
      testRecommendationResult,
    ],
  )
  const reevaluationResult = useMemo(
    () => assessReevaluation(form),
    [form],
  )
  const result = useMemo(
    () => assessOverall(step0Result, step1Result),
    [step0Result, step1Result],
  )
  const selectedSymptomLabels = form.step2Symptoms.length
    ? form.step2Symptoms
        .map(
          (id) => step2SymptomOptions.find((symptom) => symptom.id === id)?.label,
        )
        .filter(Boolean)
        .join('、')
    : '未選択'

  const selectedEmergencySigns = form.emergencySigns.length
    ? form.emergencySigns
        .map((id) => emergencySignOptions.find((sign) => sign.id === id)?.label)
        .filter(Boolean)
        .join('、')
    : '未入力'
  const selectedMainProblem =
    mainProblemOptions.find((item) => item.id === form.mainProblem)?.label ||
    '未選択'

  function toggleEmergencySign(value) {
    setForm((current) => {
      const exists = current.emergencySigns.includes(value)
      return {
        ...current,
        emergencySigns: exists
          ? current.emergencySigns.filter((item) => item !== value)
          : [...current.emergencySigns, value],
      }
    })
  }

  function toggleStep2Symptom(value) {
    setForm((current) => {
      const exists = current.step2Symptoms.includes(value)
      return {
        ...current,
        step2Symptoms: exists
          ? current.step2Symptoms.filter((item) => item !== value)
          : [...current.step2Symptoms, value],
      }
    })
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetAll() {
    setForm(initialForm)
    setActiveStep('step0')
  }

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">General Internal Medicine</p>
          <h1>総合内科 発熱・CRP高値診断支援</h1>
          <p className="lead">
            発熱・炎症反応高値・原因不明発熱を総合内科的に順番に評価する診断支援ツール
          </p>
          <div className="hero-actions" aria-label="主要操作">
            <a href="#checker" className="primary-action">
              チェックを始める
            </a>
            <a href="#warning-signs" className="secondary-action">
              緊急サインを見る
            </a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src={heroImg} alt="" />
          <div className="vital-card">
            <span>38.5 C</span>
            <small>fever log</small>
          </div>
        </div>
      </section>

      <section className="workspace" id="checker">
        <form className="panel input-panel">
          <div className="panel-heading input-toolbar">
            <div>
              <p className="eyebrow">Assessment</p>
              <h2>発熱・炎症反応の評価を入力</h2>
            </div>
            <button type="button" className="reset-button" onClick={resetAll}>
              リセット
            </button>
          </div>

          <nav className="step-tabs" aria-label="評価ステップ">
            <button
              type="button"
              className={activeStep === 'step0' ? 'active' : ''}
              onClick={() => setActiveStep('step0')}
            >
              Step0 緊急性
            </button>
            <button
              type="button"
              className={activeStep === 'step1' ? 'active' : ''}
              onClick={() => setActiveStep('step1')}
            >
              Step1 感染/非感染
            </button>
            <button
              type="button"
              className={activeStep === 'step2' ? 'active' : ''}
              onClick={() => setActiveStep('step2')}
            >
              Step2 感染臓器
            </button>
            <button
              type="button"
              className={activeStep === 'step3' ? 'active' : ''}
              onClick={() => setActiveStep('step3')}
            >
              Step3 非感染症
            </button>
            <button
              type="button"
              className={activeStep === 'step4' ? 'active' : ''}
              onClick={() => setActiveStep('step4')}
            >
              Step4 推奨検査
            </button>
            <button
              type="button"
              className={activeStep === 'step5' ? 'active' : ''}
              onClick={() => setActiveStep('step5')}
            >
              Step5 サマリー
            </button>
            <button
              type="button"
              className={activeStep === 'step6' ? 'active' : ''}
              onClick={() => setActiveStep('step6')}
            >
              Step6 再評価
            </button>
          </nav>

          {diagnosticSummaryResult.redFlags.length > 0 && (
            <RedFlagBanner items={diagnosticSummaryResult.redFlags} />
          )}

          {activeStep === 'step0' && (
            <section className="step-section" aria-labelledby="step0-heading">
              <div className="step-heading">
                <span className="step-badge">Step0</span>
                <div>
                  <h3 id="step0-heading">緊急性評価</h3>
                  <p>発熱患者で最初に確認したい危険サインを選択してください。</p>
                </div>
              </div>

              <div className="toggle-grid">
                {emergencySignOptions.map((sign) => (
                  <label key={sign.id} className="toggle-card danger-toggle">
                    <input
                      type="checkbox"
                      checked={form.emergencySigns.includes(sign.id)}
                      onChange={() => toggleEmergencySign(sign.id)}
                    />
                    <span>{sign.label}</span>
                  </label>
                ))}
              </div>

              <div className={`step-summary ${step0Result.tone}`} role="status">
                <div className="result-label">{step0Result.label}</div>
                <h3>{step0Result.title}</h3>
                <p>{step0Result.message}</p>
                {step0Result.hasEmergency && (
                  <>
                    <CardBlock
                      title="考慮する理由"
                      items={selectedEmergencySigns.split('、')}
                    />
                    <CardBlock title="推奨追加検査" items={urgentActions} />
                    <CardBlock
                      title="見逃しポイント"
                      items={step0Result.considerations}
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                className="next-step-button"
                onClick={() => setActiveStep('step1')}
              >
                Step1へ進む
              </button>
            </section>
          )}

          {activeStep === 'step1' && (
            <section className="step-section" aria-labelledby="step1-heading">
              <div className="step-heading">
                <span className="step-badge">Step1</span>
                <div>
                  <h3 id="step1-heading">感染症らしさ・非感染症の入口評価</h3>
                  <p>発熱だけでなく、CRP高値、炎症反応遷延、FUOも含めて感染症と非感染症の両方を検討します。</p>
                </div>
              </div>

              <fieldset className="choice-group">
                <legend>今回の主な問題</legend>
                <div className="toggle-grid problem-grid">
                  {mainProblemOptions.map((item) => (
                    <label key={item.id} className="toggle-card radio-card">
                      <input
                        type="radio"
                        name="mainProblem"
                        checked={form.mainProblem === item.id}
                        onChange={() => updateField('mainProblem', item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <MainProblemGuide mainProblem={form.mainProblem} />

              <div className="field-row">
                <NumberField
                  label="体温"
                  value={form.temperature}
                  min="34"
                  max="43"
                  step="0.1"
                  unit="C"
                  onChange={(value) => updateField('temperature', value)}
                />
                <NumberField
                  label="心拍数"
                  value={form.heartRate}
                  min="20"
                  max="240"
                  unit="/分"
                  onChange={(value) => updateField('heartRate', value)}
                />
              </div>

              <div className="field-row">
                <NumberField
                  label="収縮期血圧"
                  value={form.systolicBp}
                  min="40"
                  max="260"
                  unit="mmHg"
                  onChange={(value) => updateField('systolicBp', value)}
                />
                <NumberField
                  label="SpO2"
                  value={form.spo2}
                  min="50"
                  max="100"
                  unit="%"
                  onChange={(value) => updateField('spo2', value)}
                />
              </div>

              <div className="field-row">
                <NumberField
                  label="WBC"
                  value={form.wbc}
                  min="0"
                  max="100000"
                  unit="/uL"
                  onChange={(value) => updateField('wbc', value)}
                />
                <NumberField
                  label="CRP"
                  value={form.crp}
                  min="0"
                  max="60"
                  step="0.1"
                  unit="mg/dL"
                  onChange={(value) => updateField('crp', value)}
                />
              </div>

              <fieldset className="choice-group">
                <legend>Step1 所見・背景</legend>
                <div className="toggle-grid">
                  {step1ToggleOptions.map((item) => (
                    <label key={item.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={form[item.id]}
                        onChange={(event) =>
                          updateField(item.id, event.target.checked)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice-group">
                <legend>非感染症・特殊感染症を考慮する入口</legend>
                <div className="toggle-grid">
                  {specialDifferentialOptions.map((item) => (
                    <label key={item.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={form[item.id]}
                        onChange={(event) =>
                          updateField(item.id, event.target.checked)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="result-stack">
                {step1Result.cards.map((card) => (
                  <ClinicalCard key={card.title} card={card} />
                ))}
              </div>
            </section>
          )}

          {activeStep === 'step2' && (
            <section className="step-section" aria-labelledby="step2-heading">
              <div className="step-heading">
                <span className="step-badge">Step2</span>
                <div>
                  <h3 id="step2-heading">感染臓器の深掘り</h3>
                  <p>症候・局所症状から、どこが怪しいかを順番に深掘りします。</p>
                </div>
              </div>

              <fieldset className="choice-group">
                <legend>Step2A 症候・局所症状</legend>
                <div className="toggle-grid symptom-grid">
                  {step2SymptomOptions.map((symptom) => (
                    <label key={symptom.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={form.step2Symptoms.includes(symptom.id)}
                        onChange={() => toggleStep2Symptom(symptom.id)}
                      />
                      <span>{symptom.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.step2Symptoms.length === 0 && (
                <article className="step-card neutral">
                  <div className="result-label">Step2A</div>
                  <h3>症候・局所症状を選択してください</h3>
                  <p>複数選択できます。選択した症候ごとに追加質問と鑑別を表示します。</p>
                </article>
              )}

              {form.step2Symptoms.includes('symptomRespiratory') && (
                <section className="focus-section" aria-labelledby="resp-heading">
                  <div className="focus-heading">
                    <h3 id="resp-heading">呼吸器症状の深掘り</h3>
                    <p>呼吸器症状から肺炎、COPD増悪、結核、PCPなどを検討します。</p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>呼吸器の追加質問</legend>
                    <div className="toggle-grid">
                      {respiratoryOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="result-stack">
                    {respiratoryResult.cards.length > 0 ? (
                      respiratoryResult.cards.map((card) => (
                        <ClinicalCard key={card.title} card={card} />
                      ))
                    ) : (
                      <article className="step-card neutral">
                        <div className="result-label">呼吸器</div>
                        <h3>呼吸器感染症の所見を確認中です</h3>
                        <p>
                          咳、痰、呼吸困難、SpO2低下、画像異常などの有無を入力してください。
                        </p>
                      </article>
                    )}
                  </div>

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>呼吸器で推奨する検査</h3>
                    <ul>
                      {respiratoryRecommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="step-card neutral">
                    <div className="result-label">注意</div>
                    <h3>非感染症も鑑別してください</h3>
                    <p>
                      呼吸器感染症を疑う場合でも、肺塞栓、心不全、薬剤性肺炎、膠原病関連肺疾患などの非感染症も鑑別してください。
                    </p>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomUrinary') && (
                <section
                  className="focus-section"
                  aria-labelledby="urinary-heading"
                >
                  <div className="focus-heading">
                    <h3 id="urinary-heading">尿路症状の深掘り</h3>
                    <p>
                      膀胱炎、腎盂腎炎、前立腺炎、カテーテル関連尿路感染、複雑性尿路感染を順番に検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>尿路症状の追加質問</legend>
                    <div className="toggle-grid">
                      {urinaryOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={urinaryResult.cards}
                    emptyTitle="尿路感染症の鑑別所見を確認中です"
                    emptyMessage="排尿痛、頻尿、尿混濁、CVA叩打痛、腰背部痛、悪寒戦慄などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>尿路症状で推奨する検査</h3>
                    <ul>
                      {urinaryResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="step-card neutral">
                    <div className="result-label">注意</div>
                    <h3>尿所見だけで断定しないでください</h3>
                    <p>
                      高齢者では無症候性細菌尿と尿路感染症の鑑別が重要です。尿所見だけで発熱原因を尿路感染と断定せず、バイタル、症状、血液培養、画像所見を総合して判断してください。
                    </p>
                  </article>
                </section>
              )}

              {(form.step2Symptoms.includes('symptomAbdominalPain') ||
                form.step2Symptoms.includes('symptomDiarrhea')) && (
                <section
                  className="focus-section"
                  aria-labelledby="abdominal-heading"
                >
                  <div className="focus-heading">
                    <h3 id="abdominal-heading">腹腔内・胆道の深掘り</h3>
                    <p>
                      腹痛や下痢を入口に、胆管炎、胆嚢炎、憩室炎、虫垂炎、腹腔内膿瘍、CDIを検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>腹腔内・胆道の追加質問</legend>
                    <div className="toggle-grid">
                      {abdominalOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={abdominalResult.cards}
                    emptyTitle="腹腔内・胆道感染の鑑別所見を確認中です"
                    emptyMessage="右季肋部痛、腹痛、黄疸、肝胆道系酵素上昇、下痢、抗菌薬使用歴などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>腹腔内・胆道で推奨する検査</h3>
                    <ul>
                      {abdominalResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomSkinFindings') && (
                <section className="focus-section" aria-labelledby="skin-heading">
                  <div className="focus-heading">
                    <h3 id="skin-heading">皮膚軟部組織の深掘り</h3>
                    <p>
                      蜂窩織炎だけでなく、壊死性筋膜炎、糖尿病足感染、褥瘡感染、SSSS、中毒性ショック症候群を検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>皮膚軟部組織の追加質問</legend>
                    <div className="toggle-grid">
                      {skinSoftTissueOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={skinResult.cards}
                    emptyTitle="皮膚軟部組織感染の鑑別所見を確認中です"
                    emptyMessage="発赤、腫脹、熱感、強い疼痛、水疱、皮膚壊死、膿瘍などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>皮膚軟部組織で推奨する検査</h3>
                    <ul>
                      {skinResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomJointPain') && (
                <section
                  className="focus-section"
                  aria-labelledby="bone-joint-heading"
                >
                  <div className="focus-heading">
                    <h3 id="bone-joint-heading">骨・関節の深掘り</h3>
                    <p>
                      化膿性関節炎、偽痛風（CPPD）、胸鎖関節炎、化膿性脊椎炎、腸腰筋膿瘍を検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>骨・関節の追加質問</legend>
                    <div className="toggle-grid">
                      {boneJointOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={boneJointResult.cards}
                    emptyTitle="骨・関節感染症の鑑別所見を確認中です"
                    emptyMessage="急性関節痛、関節腫脹、可動域制限、38℃以上の発熱、腰背部痛などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>骨・関節で推奨する検査</h3>
                    <ul>
                      {boneJointResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>
                </section>
              )}

              {(form.step2Symptoms.includes('symptomHeadache') ||
                form.step2Symptoms.includes('symptomNeckPain')) && (
                <section className="focus-section" aria-labelledby="cns-heading">
                  <div className="focus-heading">
                    <h3 id="cns-heading">中枢神経の深掘り</h3>
                    <p>
                      頭痛・意識障害・頸部痛から、髄膜炎、脳炎、Crowned dens syndrome、化膿性脊椎炎を検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>中枢神経の追加質問</legend>
                    <div className="toggle-grid">
                      {centralNervousOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={centralNervousResult.cards}
                    emptyTitle="中枢神経感染症・鑑別疾患の所見を確認中です"
                    emptyMessage="頭痛、項部硬直、意識障害、痙攣、急性頸部痛、頸部回旋制限などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>中枢神経で推奨する検査</h3>
                    <ul>
                      {centralNervousResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomBackPain') && (
                <section className="focus-section" aria-labelledby="back-heading">
                  <div className="focus-heading">
                    <h3 id="back-heading">腰背部痛の深掘り</h3>
                    <p>尿路感染だけでなく、脊椎感染、菌血症、大動脈疾患も検討します。</p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>腰背部痛の追加質問</legend>
                    <div className="toggle-grid">
                      {backPainOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <DifferentialCards
                    cards={backPainResult.cards}
                    emptyTitle="腰背部痛の鑑別所見を確認中です"
                    emptyMessage="CVA叩打痛、排尿痛、腰椎叩打痛、歩行困難、血液培養陽性などを入力してください。"
                  />

                  <article className="step-card caution">
                    <div className="result-label">注意</div>
                    <h3>尿路感染以外も鑑別してください</h3>
                    <p>
                      発熱＋腰背部痛では、尿路感染だけでなく、化膿性脊椎炎、腸腰筋膿瘍、感染性心内膜炎、大動脈疾患も鑑別してください。
                    </p>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomNeckPain') && (
                <section className="focus-section" aria-labelledby="neck-heading">
                  <div className="focus-heading">
                    <h3 id="neck-heading">頸部痛の深掘り</h3>
                    <p>髄膜炎・脳炎、Crowned dens syndrome、PMRなどを検討します。</p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>頸部痛の追加質問</legend>
                    <div className="toggle-grid">
                      {neckPainOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <DifferentialCards
                    cards={neckPainResult.cards}
                    emptyTitle="頸部痛の鑑別所見を確認中です"
                    emptyMessage="頭痛、項部硬直、意識障害、急性頸部痛、頸部回旋制限などを入力してください。"
                  />

                  <article className="step-card caution">
                    <div className="result-label">注意</div>
                    <h3>Crowned dens syndromeも考慮してください</h3>
                    <p>
                      高齢者の発熱＋急性頸部痛ではCrowned dens syndromeも考慮してください。CTで軸椎歯突起周囲の石灰化を確認します。MRIでは石灰化を評価しにくい点に注意してください。
                    </p>
                  </article>
                </section>
              )}

              {(form.step2Symptoms.includes('symptomChills') ||
                form.step2Symptoms.includes('symptomPositiveBloodCulture') ||
                form.step2Symptoms.includes('symptomNoLocalizing')) && (
                <section
                  className="focus-section"
                  aria-labelledby="bloodstream-heading"
                >
                  <div className="focus-heading">
                    <h3 id="bloodstream-heading">
                      血流感染・感染性心内膜炎の深掘り
                    </h3>
                    <p>
                      悪寒戦慄、血液培養陽性、局所症状なしを入口に、菌血症、感染性心内膜炎、深部感染巣を検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>血流感染・感染性心内膜炎の追加質問</legend>
                    <div className="toggle-grid">
                      {bloodstreamOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={bloodstreamResult.cards}
                    emptyTitle="血流感染・感染性心内膜炎の所見を確認中です"
                    emptyMessage="悪寒戦慄、血液培養陽性、菌種、心雑音、人工弁、ペースメーカー、透析、デバイス、腰背部痛などを入力してください。"
                  />

                  <article className="step-card info">
                    <div className="result-label">推奨検査</div>
                    <h3>血流感染・感染性心内膜炎で推奨する検査</h3>
                    <ul>
                      {bloodstreamResult.recommendedTests.map((test) => (
                        <li key={test}>{test}</li>
                      ))}
                    </ul>
                  </article>
                </section>
              )}

              {form.step2Symptoms.includes('symptomNoLocalizing') && (
                <section
                  className="focus-section"
                  aria-labelledby="no-localizing-heading"
                >
                  <div className="focus-heading">
                    <h3 id="no-localizing-heading">
                      局所症状なし（感染臓器不明）の深掘り
                    </h3>
                    <p>
                      感染症だけでなく、悪性腫瘍、血管炎、薬剤関連、TAFRO症候群なども検討します。
                    </p>
                  </div>
                  <fieldset className="choice-group">
                    <legend>局所症状なしの追加質問</legend>
                    <div className="toggle-grid">
                      {noLocalizingOptions.map((item) => (
                        <label key={item.id} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={form[item.id]}
                            onChange={(event) =>
                              updateField(item.id, event.target.checked)
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <StructuredDifferentialCards
                    cards={noLocalizingResult.cards}
                    emptyTitle="感染臓器不明の鑑別所見を確認中です"
                    emptyMessage="LDH高値、貧血、血小板低下、夜間発汗、悪寒戦慄、血液培養陽性などを入力してください。"
                  />
                </section>
              )}

              {step2SymptomOptions
                .filter(
                  (symptom) =>
                    form.step2Symptoms.includes(symptom.id) &&
                    !symptom.implemented,
                )
                .map((symptom) => (
                  <article key={symptom.id} className="step-card neutral">
                    <div className="result-label">{symptom.label}</div>
                    <h3>今後実装予定</h3>
                    <p>{symptom.label}の詳細評価は今後実装予定です。</p>
                  </article>
                ))}
            </section>
          )}

          {activeStep === 'step3' && (
            <section className="step-section" aria-labelledby="step3-heading">
              <div className="step-heading">
                <span className="step-badge">Step3</span>
                <div>
                  <h3 id="step3-heading">非感染症の深掘り</h3>
                  <p>
                    感染症が明らかでない発熱・CRP高値で、非感染性炎症、悪性腫瘍、薬剤性、血栓症などを体系的に検討します。
                  </p>
                </div>
              </div>

              <fieldset className="choice-group">
                <legend>非感染症を考慮する入力項目</legend>
                <div className="toggle-grid symptom-grid">
                  {step3NonInfectiousOptions.map((item) => (
                    <label key={item.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={form[item.id]}
                        onChange={(event) =>
                          updateField(item.id, event.target.checked)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <StructuredDifferentialCards
                cards={nonInfectiousResult.cards}
                emptyTitle="非感染症の鑑別所見を確認中です"
                emptyMessage="薬剤歴、悪性腫瘍既往、B症状、LDH高値、血小板低下、肩・大腿痛、関節痛、胸痛、呼吸困難などを入力してください。"
              />
            </section>
          )}

          {activeStep === 'step4' && (
            <section className="step-section" aria-labelledby="step4-heading">
              <div className="step-heading">
                <span className="step-badge">Step4</span>
                <div>
                  <h3 id="step4-heading">推奨検査</h3>
                  <p>
                    Step0〜Step3の入力内容から、次に検討する検査を優先順位付きで整理します。
                  </p>
                </div>
              </div>

              <article className="step-card neutral">
                <div className="result-label">検査検討支援</div>
                <h3>診断確定ではなく、検査の抜け漏れ確認として使用してください</h3>
                <p>
                  入力された症候や鑑別に応じて自動集約しています。患者状態、施設体制、既に提出済みの検査に応じて調整してください。
                </p>
              </article>

              <RecommendedTests result={testRecommendationResult} />
            </section>
          )}

          {activeStep === 'step5' && (
            <section className="step-section" aria-labelledby="step5-heading">
              <div className="step-heading">
                <span className="step-badge">Step5</span>
                <div>
                  <h3 id="step5-heading">診断サマリー</h3>
                  <p>
                    Step0〜Step4の入力内容から、考えられる疾患、根拠、次に行う検査、見逃してはいけない疾患を一覧表示します。
                  </p>
                </div>
              </div>

              <DiagnosticSummary result={diagnosticSummaryResult} />
            </section>
          )}

          {activeStep === 'step6' && (
            <section className="step-section" aria-labelledby="step6-heading">
              <div className="step-heading">
                <span className="step-badge">Step6</span>
                <div>
                  <h3 id="step6-heading">48〜72時間後の再評価</h3>
                  <p>
                    初期対応後も改善が乏しい場合に、感染巣の見落とし、ドレナージ不足、耐性菌、非感染症を再評価します。
                  </p>
                </div>
              </div>

              <fieldset className="choice-group">
                <legend>48〜72時間後の経過</legend>
                <div className="toggle-grid symptom-grid">
                  {step6ReevaluationOptions.map((item) => (
                    <label key={item.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={form[item.id]}
                        onChange={(event) =>
                          updateField(item.id, event.target.checked)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice-group">
                <legend>重症化・緊急再評価サイン</legend>
                <div className="toggle-grid">
                  {step6CriticalOptions.map((item) => (
                    <label key={item.id} className="toggle-card danger-toggle">
                      <input
                        type="checkbox"
                        checked={form[item.id]}
                        onChange={(event) =>
                          updateField(item.id, event.target.checked)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <ReevaluationCards result={reevaluationResult} />
            </section>
          )}
        </form>

        <aside className={`panel result-panel ${result.tone}`}>
          <div className="result-label">{result.label}</div>
          <h2>{result.title}</h2>
          <p>{result.message}</p>
          <ul className="action-list">
            {result.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <div className="handoff">
            <h3>医療者に伝えるメモ</h3>
            <dl>
              <div>
                <dt>主な問題</dt>
                <dd>{selectedMainProblem}</dd>
              </div>
              <div>
                <dt>Step0</dt>
                <dd>{selectedEmergencySigns}</dd>
              </div>
              <div>
                <dt>体温</dt>
                <dd>{form.temperature || '-'} C</dd>
              </div>
              <div>
                <dt>心拍</dt>
                <dd>{form.heartRate || '-'} /分</dd>
              </div>
              <div>
                <dt>SpO2</dt>
                <dd>{form.spo2 || '-'} %</dd>
              </div>
              <div>
                <dt>Step1</dt>
                <dd>{step1Result.summary}</dd>
              </div>
              <div>
                <dt>Step2</dt>
                <dd>{selectedSymptomLabels}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <section className="reference-grid" id="warning-signs">
        <article>
          <p className="eyebrow">Emergency</p>
          <h2>すぐ相談・受診したいサイン</h2>
          <ul>
            {warningSigns.map((sign) => (
              <li key={sign}>{sign}</li>
            ))}
          </ul>
        </article>
        <article>
          <p className="eyebrow">Differential</p>
          <h2>相対的徐脈で検討する鑑別</h2>
          <ul>
            {relativeBradycardiaDifferentials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="medical-note">
        このツールは診断を確定するものではありません。表示は「疑い」「考慮」「検討」に留め、患者の状態変化や地域の診療体制に応じて医療機関へ相談してください。
      </footer>
    </main>
  )
}

function MainProblemGuide({ mainProblem }) {
  if (mainProblem === 'crpOnly') {
    return (
      <section className="main-problem-guide" aria-label="CRP高値のみの早期鑑別">
        <article className="step-card caution">
          <div className="result-label">CRP高値のみ</div>
          <h3>感染症と非感染症を並行して検討してください</h3>
          <p>
            発熱が明らかでないCRP高値でも、深部感染症や非感染性炎症を早期に考慮します。
          </p>
        </article>
        <div className="early-differential-grid">
          {crpOnlyDifferentials.map((group) => (
            <article key={group.title} className={`step-card ${group.tone}`}>
              <div className="result-label">{group.title}</div>
              <h3>{group.title}を考慮</h3>
              <CardBlock title="早期に確認したい鑑別" items={group.items} />
              <CardBlock
                title="推奨追加検査"
                items={['病歴・身体所見の再確認', '血液培養や画像検査を症例に応じて検討']}
              />
              <CardBlock
                title="見逃しポイント"
                items={['発熱が目立たなくても重症感染症や非感染性疾患は否定できません']}
              />
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (mainProblem === 'fuo') {
    return (
      <section className="main-problem-guide" aria-label="FUOの大分類">
        <article className="step-card info">
          <div className="result-label">FUO</div>
          <h3>原因不明発熱（FUO）の大分類から検討してください</h3>
          <p>
            感染症だけに寄せすぎず、悪性腫瘍、自己免疫、薬剤、血栓症、大動脈疾患も並行して検討します。
          </p>
        </article>
        <div className="fuo-category-grid">
          {fuoCategoryCards.map((category) => (
            <details key={category} className="fuo-category-card">
              <summary>{category}</summary>
              <p>今後追加予定</p>
            </details>
          ))}
        </div>
      </section>
    )
  }

  if (mainProblem === 'persistentInflammation') {
    return (
      <article className="step-card info">
        <div className="result-label">炎症反応遷延</div>
        <h3>感染症・非感染症の両面から再評価してください</h3>
        <p>
          炎症反応が遷延する場合は、深部感染症、悪性腫瘍、自己免疫疾患、薬剤、血栓症などを経時的に検討します。
        </p>
      </article>
    )
  }

  if (mainProblem === 'feverAndCrp') {
    return (
      <article className="step-card caution">
        <div className="result-label">発熱＋CRP高値</div>
        <h3>感染症を軸にしつつ非感染症も検討してください</h3>
        <p>
          危険サイン、局所症状、炎症反応、背景因子を組み合わせて、Step2の症候別評価へ進んでください。
        </p>
      </article>
    )
  }

  return (
    <article className="step-card neutral">
      <div className="result-label">発熱</div>
      <h3>発熱の初期評価として進めてください</h3>
      <p>
        Step0の緊急性評価に続き、感染症らしさ、非感染症、局所症状の有無を順番に確認します。
      </p>
    </article>
  )
}

function NumberField({ label, value, min, max, step = '1', unit, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="unit-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <small>{unit}</small>
      </div>
    </label>
  )
}

function DifferentialCards({ cards, emptyTitle, emptyMessage }) {
  return (
    <div className="result-stack">
      {cards.length > 0 ? (
        cards.map((card) => (
          <ClinicalCard key={card.title} card={card} />
        ))
      ) : (
        <article className="step-card neutral">
          <div className="result-label">鑑別</div>
          <h3>{emptyTitle}</h3>
          <p>{emptyMessage}</p>
        </article>
      )}
    </div>
  )
}

function StructuredDifferentialCards({ cards, emptyTitle, emptyMessage }) {
  return (
    <div className="result-stack">
      {cards.length > 0 ? (
        cards.map((card) => <ClinicalCard key={card.title} card={card} />)
      ) : (
        <article className="step-card neutral">
          <div className="result-label">鑑別</div>
          <h3>{emptyTitle}</h3>
          <p>{emptyMessage}</p>
        </article>
      )}
    </div>
  )
}

function ClinicalCard({ card }) {
  const reasons = normalizeList(card.reasons || card.items || card.evidence)
  const providedTests = normalizeList(card.tests || card.recommendedTests)
  const tests = providedTests.length ? providedTests : getDefaultTests(card.label)
  const misses = normalizeList(card.misses).length
    ? normalizeList(card.misses)
    : normalizeList(card.message || '経時的な悪化や重症化サインに注意')

  return (
    <article className={`step-card ${card.tone}`}>
      <div className="result-label">{card.label}</div>
      <h3>{card.title}</h3>
      <CardBlock title="考慮する理由" items={reasons} />
      <CardBlock title="推奨追加検査" items={tests} />
      <CardBlock title="見逃しポイント" items={misses} />
    </article>
  )
}

function RecommendedTests({ result }) {
  const sections = [
    { key: 'priority', title: '最優先', label: 'すぐ確認・提出を検討する検査', tone: 'danger' },
    { key: 'additional', title: '追加評価', label: '病態や鑑別に応じて追加する検査', tone: 'caution' },
    { key: 'consult', title: '専門科相談・画像', label: '必要に応じて検討する検査・相談', tone: 'info' },
  ]

  return (
    <div className="test-recommendation-stack">
      {sections.map((section) => (
        <article key={section.key} className={`step-card ${section.tone}`}>
          <div className="result-label">{section.title}</div>
          <h3>{section.label}</h3>
          {result[section.key].length > 0 ? (
            <div className="test-list">
              {result[section.key].map((item) => (
                <div key={item.name} className="test-item">
                  <strong>{item.name}</strong>
                  <span>{item.reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>現時点の入力では、この分類に自動追加される検査・相談はありません。</p>
          )}
        </article>
      ))}
    </div>
  )
}

function RedFlagBanner({ items }) {
  return (
    <aside className="red-flag-banner" aria-label="絶対に除外したい疾患">
      <div>
        <div className="result-label">Red Flag</div>
        <h3>絶対に除外したい疾患</h3>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  )
}

function DiagnosticSummary({ result }) {
  return (
    <div className="diagnostic-summary-stack">
      {result.inputWarnings.length > 0 && (
        <article className="step-card caution">
          <div className="result-label">入力確認</div>
          <h3>入力内容を再確認してください。</h3>
          <ul>
            {result.inputWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </article>
      )}

      <section className="summary-section">
        <div className="focus-heading">
          <h3>🚨見逃してはいけない疾患</h3>
          <p>重症度や見逃しリスクが高い疾患を優先表示します。</p>
        </div>
        <div className="result-stack">
          {result.mustNotMiss.length > 0 ? (
            result.mustNotMiss.map((item) => (
              <DiseaseSummaryCard key={item.name} item={item} tone="danger" />
            ))
          ) : (
            <article className="step-card clear">
              <div className="result-label">見逃し注意</div>
              <h3>現時点で赤カード相当の疾患は自動抽出されていません</h3>
              <p>ただし、経時的な悪化や新しい局所症状には注意してください。</p>
            </article>
          )}
        </div>
      </section>

      <section className="summary-section">
        <div className="focus-heading">
          <h3>考えられる疾患ランキング</h3>
          <p>入力項目数、重症度、代表所見から総合的に並べ、一致した所見を表示します。</p>
        </div>
        <div className="result-stack">
          {result.ranking.length > 0 ? (
            result.ranking.map((item) => (
              <DiseaseSummaryCard key={item.name} item={item} tone={item.tone} />
            ))
          ) : (
            <article className="step-card neutral">
              <div className="result-label">ランキング</div>
              <h3>入力所見を追加してください</h3>
              <p>Step0〜Step3の入力に応じて、考慮する疾患をランキング表示します。</p>
            </article>
          )}
        </div>
      </section>

      <section className="summary-section">
        <article className="step-card info">
          <div className="result-label">今日やること</div>
          <h3>次に行う検査・確認</h3>
          <div className="todo-list">
            {result.todayChecklist.map((item) => (
              <label key={item} className="todo-item">
                <input type="checkbox" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="summary-section">
        <article className="step-card caution">
          <div className="result-label">鑑別漏れチェック</div>
          <h3>まだ除外できていない重要疾患</h3>
          {result.notYetExcluded.length > 0 ? (
            <div className="todo-list">
              {result.notYetExcluded.map((item) => (
                <label key={item} className="todo-item">
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          ) : (
            <p>現時点の入力では、追加で固定表示する重要疾患はありません。</p>
          )}
        </article>
      </section>

      <article className="step-card info">
        <div className="result-label">Dr. Ito Clinical Pearl</div>
        <h3>{result.clinicalPearl.title}</h3>
        <p>{result.clinicalPearl.message}</p>
      </article>

      <article className="step-card neutral">
        <div className="result-label">注意事項</div>
        <h3>診断確定ではありません</h3>
        <ul>
          <li>診断を確定するものではありません。</li>
          <li>入力された所見から考慮すべき疾患を表示しています。</li>
          <li>臨床経過・身体診察・画像・培養結果と合わせて総合的に判断してください。</li>
        </ul>
      </article>
    </div>
  )
}

function ReevaluationCards({ result }) {
  return (
    <div className="result-stack">
      {result.cards.map((card) => (
        <article key={card.title} className={`step-card ${card.tone}`}>
          <div className="result-label">{card.label}</div>
          <h3>{card.title}</h3>
          <p>{card.message}</p>
          {card.blocks.map((block) => (
            <CardBlock key={block.title} title={block.title} items={block.items} />
          ))}
        </article>
      ))}
    </div>
  )
}

function DiseaseSummaryCard({ item, tone }) {
  return (
    <article className={`step-card ${tone}`}>
      <div className="summary-card-heading">
        <div>
          <div className="result-label">{item.category}</div>
          <h3>{item.name}</h3>
        </div>
        <strong className="match-count">{item.matchCount}項目一致</strong>
      </div>
      <CardBlock title="一致した所見" items={item.matchedFindings} />
      <CardBlock title="次にやること" items={item.nextActions} />
    </article>
  )
}

function CardBlock({ title, items }) {
  return (
    <div className="structured-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split('、').filter(Boolean)
  }
  return []
}

function getDefaultTests(label) {
  const defaults = {
    感染症を考慮: ['血液培養2セット', '感染巣検索', '臓器障害評価'],
    感染症所見を確認: ['体温・バイタル再評価', 'WBC/CRP再評価', '局所症状の再確認'],
    非感染症も考慮: ['薬剤歴確認', '悪性腫瘍・膠原病の背景確認', '必要に応じて画像検査'],
    薬剤熱: ['薬剤歴確認', '原因薬剤の中止可否を検討', '感染症除外の再評価'],
    腫瘍熱: ['CBC', 'LDH', '画像検査', '必要に応じて腫瘍評価'],
    血栓症: ['D-dimerを検討', '下肢静脈エコー', '造影CTを検討'],
    心筋炎: ['心電図', 'トロポニン', '心エコー'],
    セロトニン症候群: ['薬剤歴確認', 'CK', '神経筋症状・自律神経症状の評価'],
    TAFRO症候群: ['血小板', '腎機能', '臓器腫大評価'],
    相対的徐脈: ['薬剤歴確認', '渡航・曝露歴確認', '必要に応じて培養・抗原検査'],
    肺炎: ['胸部X線', '必要に応じて胸部CT', '喀痰グラム染色・培養', '血液培養2セット'],
    COPD増悪: ['胸部X線', 'SpO2/酸素需要評価', '血液ガスを検討'],
    胸膜炎: ['胸部X線', '胸部CTを検討', '胸水評価を検討'],
    肺結核: ['胸部X線/CT', '抗酸菌検査', '喀痰検査'],
    PCP: ['胸部CT', 'β-Dグルカン', 'SpO2/酸素需要評価'],
    真菌症: ['胸部CT', 'β-Dグルカン', '真菌関連検査を検討'],
    非感染性肺疾患: ['胸部CT', '薬剤歴確認', '膠原病関連検査を検討'],
    腎盂腎炎: ['尿検査', '尿培養', '血液培養2セット', '必要に応じて腹部CT'],
    化膿性脊椎炎: ['血液培養2セット', '脊椎MRI', '炎症反応'],
    '菌血症/感染性心内膜炎': ['血液培養複数セット', '心エコー', '深部感染巣検索'],
    腸腰筋膿瘍: ['血液培養2セット', '腹部造影CT', '外科・整形外科相談を検討'],
    大動脈疾患: ['バイタル再評価', '造影CTを検討', '救急・循環器評価を検討'],
    '髄膜炎/脳炎': ['血液培養2セット', '頭部画像を検討', '髄液検査を検討'],
    'Crowned dens syndrome': ['頸椎CT', '炎症反応', '他疾患除外'],
    PMR: ['炎症反応', '巨細胞性動脈炎の確認', '感染症・悪性腫瘍の除外'],
  }

  return defaults[label] || ['必要に応じて追加検査を検討']
}

function assessEmergencySigns(selectedSigns) {
  const selected = new Set(selectedSigns)
  const hasEmergency = selectedSigns.length > 0
  const considerations = []

  if (selected.has('meningealSigns')) {
    considerations.push('髄膜炎を考慮')
  }
  if (selected.has('necrotizingSkin') || selected.has('severePain')) {
    considerations.push('壊死性筋膜炎を考慮')
  }
  if (selected.has('neutropenia')) {
    considerations.push('好中球減少性発熱として緊急対応を検討')
  }
  if (
    selected.has('shock') ||
    selected.has('alteredMentalStatus') ||
    selected.has('respiratoryFailure') ||
    selected.has('lowSpo2')
  ) {
    considerations.push('敗血症または重症感染症を考慮')
  }
  if (selected.has('immunosuppression')) {
    considerations.push('免疫抑制患者の重症感染症を考慮')
  }

  if (hasEmergency) {
    return {
      hasEmergency,
      tone: 'danger',
      label: '危険サインあり',
      title: '緊急対応が必要な可能性',
      message:
        '敗血症、髄膜炎、壊死性筋膜炎、好中球減少性発熱、重症感染症などを考慮してください。',
      considerations,
    }
  }

  return {
    hasEmergency,
    tone: 'clear',
    label: '危険サイン未入力',
    title: 'Step0 サマリー',
    message:
      '現時点で明らかな緊急サインは未入力です。ただし、経時的な悪化には注意してください。',
    considerations,
  }
}

function assessInfectionLikelihood(form) {
  const temp = Number.parseFloat(form.temperature)
  const heartRate = Number.parseFloat(form.heartRate)
  const wbc = Number.parseFloat(form.wbc)
  const crp = Number.parseFloat(form.crp)

  const hasFever = Number.isFinite(temp) && temp >= 38
  const hasHighWbc = Number.isFinite(wbc) && wbc >= 10000
  const hasHighCrp = Number.isFinite(crp) && crp >= 5
  const hasInflammation = hasHighWbc || hasHighCrp
  const suggestsInfection = form.chills && hasInflammation
  const nonInfectiousItems = []

  if (!form.localSymptoms) {
    nonInfectiousItems.push('局所症状がないため感染症以外も鑑別')
  }
  if (form.recentDrugStart) {
    nonInfectiousItems.push('薬剤熱も考慮')
  }
  if (form.malignancyHistory) {
    nonInfectiousItems.push('腫瘍熱も考慮')
  }
  if (form.collagenDiseaseHistory) {
    nonInfectiousItems.push('膠原病関連発熱も考慮')
  }

  const threshold = Number.isFinite(temp) ? temp * 10 - 323 : null
  const hasRelativeBradycardia =
    Number.isFinite(heartRate) &&
    Number.isFinite(threshold) &&
    heartRate < threshold
  const bradycardiaModifiers = []

  if (form.betaBlocker) bradycardiaModifiers.push('β遮断薬使用')
  if (form.calciumChannelBlocker) bradycardiaModifiers.push('Ca拮抗薬使用')
  if (form.avBlock) bradycardiaModifiers.push('房室ブロック')
  if (form.pacemaker) bradycardiaModifiers.push('ペースメーカー装着')

  const cards = []

  cards.push({
    tone: suggestsInfection ? 'caution' : 'neutral',
    label: suggestsInfection ? '感染症を考慮' : '感染症所見を確認',
    title: suggestsInfection
      ? '感染症を考慮する所見があります'
      : '感染症らしさは入力所見から確認中です',
    message: suggestsInfection
      ? '悪寒戦慄に加えて、WBC高値またはCRP高値が入力されています。感染症を考慮してください。'
      : '体温、悪寒戦慄、WBC、CRP、局所症状を組み合わせて感染症らしさを検討してください。',
    items: [
      hasFever ? '体温38.0C以上を発熱として扱います' : '体温38.0C未満または未入力です',
      hasHighWbc ? 'WBC高値の入力があります' : 'WBC高値は未入力です',
      hasHighCrp ? 'CRP高値の入力があります' : 'CRP高値は未入力です',
    ],
  })

  if (nonInfectiousItems.length > 0) {
    cards.push({
      tone: 'info',
      label: '非感染症も考慮',
      title: '感染症以外の発熱も鑑別してください',
      message:
        '背景や局所症状の乏しさから、非感染性発熱を併せて検討します。',
      items: nonInfectiousItems,
    })
  }

  if (form.recentDrugStart) {
    cards.push({
      tone: 'info',
      label: '薬剤熱',
      title: '薬剤熱を考慮',
      message:
        '最近開始した薬剤がある場合は、感染症と並行して薬剤熱も検討してください。',
      items: [
        '原因薬剤の中止後72〜96時間で解熱することがあります',
        'ペニシリン、セファロスポリン、フェニトイン、スルホンアミドを考慮',
        '抗菌薬、抗てんかん薬なども原因薬剤として検討',
      ],
    })
  }

  if (
    form.malignancyHistory &&
    form.noClearInfectionFocus &&
    form.noMarkedTachycardia
  ) {
    cards.push({
      tone: 'info',
      label: '腫瘍熱',
      title: '腫瘍熱を考慮',
      message:
        '悪性腫瘍既往、感染巣不明、頻脈が目立たない場合は腫瘍熱も鑑別に挙げます。',
      items: [
        'NSAIDs反応性を参考にする',
        'リンパ腫、白血病、腎細胞癌、肝細胞癌などを考慮',
      ],
    })
  }

  if (
    form.legSwelling ||
    form.chestPain ||
    form.dyspnea ||
    form.suspectedDvtPe
  ) {
    cards.push({
      tone: 'info',
      label: '血栓症',
      title: '血栓症に伴う発熱も考慮',
      message:
        '下肢腫脹、胸痛、呼吸困難、DVT/PEを疑う所見がある場合は血栓症関連の発熱も検討してください。',
      items: [
        '37〜38℃程度の発熱が多いとされます',
        '抗凝固開始後も1週間以上発熱が持続する場合は感染症を再評価',
      ],
    })
  }

  if (
    hasFever &&
    (form.chestPain ||
      form.palpitations ||
      form.dyspnea ||
      form.ecgAbnormality ||
      form.troponinElevation)
  ) {
    cards.push({
      tone: 'caution',
      label: '心筋炎',
      title: '心筋炎を考慮',
      message:
        '発熱に胸部症状、動悸、息切れ、心電図異常、トロポニン上昇がある場合は心筋炎を検討してください。',
      items: ['胸部症状が乏しい場合もあり、想起が重要です'],
    })
  }

  if (
    form.ssriSnriUse ||
    form.ckElevation ||
    form.autonomicSymptoms ||
    form.tremor ||
    form.muscleRigidity
  ) {
    cards.push({
      tone: 'caution',
      label: 'セロトニン症候群',
      title: 'セロトニン症候群を考慮',
      message:
        'SSRI/SNRIなどの使用、CK上昇、自律神経症状、振戦、筋強剛がある場合は鑑別に挙げます。',
      items: [
        '薬剤歴、神経筋症状、自律神経症状の組み合わせを確認',
        '重症度に応じて緊急対応を検討',
      ],
    })
  }

  if (
    hasFever &&
    form.thrombocytopenia &&
    form.edema &&
    form.renalDysfunction &&
    form.organomegaly
  ) {
    cards.push({
      tone: 'info',
      label: 'TAFRO症候群',
      title: 'TAFRO症候群を鑑別に挙げる',
      message:
        '血小板低下、浮腫、発熱、腎機能障害、臓器腫大がそろう場合はTAFRO症候群も検討してください。',
      items: ['感染症、悪性腫瘍、自己免疫疾患などとの鑑別を検討'],
    })
  }

  if (hasRelativeBradycardia) {
    cards.push({
      tone: 'brady',
      label: '相対的徐脈',
      title: '相対的徐脈の可能性',
      message: `心拍数が 体温 x 10 - 323 の目安値（${threshold.toFixed(
        1,
      )}/分）を下回っています。`,
      items: [
        '房室ブロック、ペースメーカー、β遮断薬、Ca拮抗薬使用時は解釈に注意',
        ...relativeBradycardiaDifferentials.map((item) => `${item}を考慮`),
        ...bradycardiaModifiers.map(
          (item) => `${item}があり、心拍評価の解釈に注意`,
        ),
      ],
    })
  } else if (bradycardiaModifiers.length > 0) {
    cards.push({
      tone: 'neutral',
      label: '心拍評価の注意',
      title: '相対的徐脈の判定には注意が必要です',
      message:
        '薬剤や刺激伝導系の背景がある場合、心拍数の解釈に注意してください。',
      items: bradycardiaModifiers,
    })
  }

  return {
    suggestsInfection,
    hasNonInfectiousConsideration: nonInfectiousItems.length > 0,
    hasRelativeBradycardia,
    cards,
    summary: [
      suggestsInfection ? '感染症を考慮' : '感染症所見を確認中',
      nonInfectiousItems.length > 0 ? '非感染症も鑑別' : null,
      hasRelativeBradycardia ? '相対的徐脈の可能性' : null,
      form.recentDrugStart ? '薬剤熱を考慮' : null,
      form.malignancyHistory &&
      form.noClearInfectionFocus &&
      form.noMarkedTachycardia
        ? '腫瘍熱を考慮'
        : null,
    ]
      .filter(Boolean)
      .join('、'),
  }
}

function assessRespiratoryFocus(form) {
  const cards = []

  const addCard = ({ condition, tone, label, title, message, evidence }) => {
    if (!condition) return
    cards.push({
      tone,
      label,
      title,
      message,
      evidence: evidence.join('、'),
    })
  }

  addCard({
    condition:
      form.respCough ||
      form.respSputum ||
      form.respLowSpo2 ||
      form.respImagingAbnormality,
    tone: form.respLowSpo2 ? 'danger' : 'caution',
    label: '肺炎',
    title: '肺炎を考慮',
    message:
      '発熱に呼吸器症状または画像異常を伴う場合、肺炎を考慮してください。',
    evidence: collectEvidence(form, [
      ['respCough', '咳'],
      ['respSputum', '痰'],
      ['respLowSpo2', 'SpO2低下'],
      ['respImagingAbnormality', '胸部X線/CT異常'],
    ]),
  })

  addCard({
    condition:
      form.copdHistory &&
      (form.respCough || form.respSputum || form.respDyspnea),
    tone: form.respDyspnea || form.respLowSpo2 ? 'danger' : 'caution',
    label: 'COPD増悪',
    title: 'COPD増悪を考慮',
    message:
      'COPD既往があり、咳・痰・呼吸困難を伴う場合、COPD増悪を考慮してください。明らかな肺陰影を伴わないこともあります。',
    evidence: collectEvidence(form, [
      ['copdHistory', 'COPD既往'],
      ['respCough', '咳'],
      ['respSputum', '痰'],
      ['respDyspnea', '呼吸困難'],
    ]),
  })

  addCard({
    condition: form.respChestPain,
    tone: 'caution',
    label: '胸膜炎',
    title: '胸膜炎を考慮',
    message:
      '発熱に胸痛を伴う場合、胸膜炎、肺炎随伴胸水、肺塞栓などを考慮してください。',
    evidence: collectEvidence(form, [['respChestPain', '胸痛']]),
  })

  addCard({
    condition:
      form.respCough && (form.respImmunosuppression || form.biologicsUse),
    tone: 'caution',
    label: '肺結核',
    title: '肺結核を考慮',
    message:
      '免疫抑制や生物学的製剤使用中の発熱・咳では、肺結核を考慮してください。',
    evidence: collectEvidence(form, [
      ['respCough', '咳'],
      ['respImmunosuppression', '免疫抑制'],
      ['biologicsUse', '生物学的製剤使用'],
    ]),
  })

  addCard({
    condition:
      form.respImmunosuppression && (form.respDyspnea || form.respLowSpo2),
    tone: 'danger',
    label: 'PCP',
    title: 'PCPを考慮',
    message:
      '免疫抑制患者で呼吸困難やSpO2低下を伴う場合、ニューモシスチス肺炎（PCP）を考慮してください。',
    evidence: collectEvidence(form, [
      ['respImmunosuppression', '免疫抑制'],
      ['respDyspnea', '呼吸困難'],
      ['respLowSpo2', 'SpO2低下'],
    ]),
  })

  addCard({
    condition: form.respImmunosuppression || form.biologicsUse,
    tone: 'caution',
    label: '真菌症',
    title: '真菌症を考慮',
    message: '免疫抑制患者では、真菌症も鑑別に含めてください。',
    evidence: collectEvidence(form, [
      ['respImmunosuppression', '免疫抑制'],
      ['biologicsUse', '生物学的製剤使用'],
    ]),
  })

  addCard({
    condition:
      (form.respDyspnea || form.respLowSpo2) && form.respImagingAbnormality,
    tone: form.respLowSpo2 ? 'danger' : 'caution',
    label: '非感染性肺疾患',
    title: '薬剤性肺炎・リウマチ肺を考慮',
    message:
      '感染症だけでなく、薬剤性肺炎や膠原病関連肺疾患も考慮してください。',
    evidence: collectEvidence(form, [
      ['respDyspnea', '呼吸困難'],
      ['respLowSpo2', 'SpO2低下'],
      ['respImagingAbnormality', '胸部X線/CT異常'],
    ]),
  })

  return { cards }
}

function assessUrinaryFocus(form) {
  const cards = []
  const hasFever = true
  const recommendedTests = [
    '尿定性',
    '尿沈渣',
    '尿培養',
    '血液培養2セット',
    '腎機能',
    '乳酸',
    '腹部エコー',
    '必要に応じて腹部CT',
    '尿路閉塞評価',
  ]
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition:
      form.urinaryDysuria || form.urinaryFrequency || form.cloudyUrine,
    tone: 'info',
    label: '膀胱炎',
    title: '膀胱炎を考慮してください',
    reasons: collectEvidence(form, [
      ['urinaryDysuria', '排尿痛'],
      ['urinaryFrequency', '頻尿'],
      ['cloudyUrine', '尿混濁'],
    ]),
    tests: ['尿定性', '尿沈渣', '尿培養を検討'],
    misses: ['発熱を伴う場合は上部尿路感染や前立腺炎も評価してください'],
  })

  addCard({
    condition:
      form.urinaryCvaTenderness ||
      form.urinaryBackPain ||
      form.urinaryChills ||
      form.nauseaVomiting,
    tone: form.urinaryChills ? 'danger' : 'caution',
    label: '腎盂腎炎',
    title: '腎盂腎炎を考慮してください',
    reasons: collectEvidence(form, [
      ['urinaryCvaTenderness', 'CVA叩打痛'],
      ['urinaryBackPain', '腰背部痛'],
      ['urinaryChills', '悪寒戦慄'],
      ['nauseaVomiting', '嘔気・嘔吐'],
    ]),
    tests: [
      '尿検査',
      '尿培養',
      '血液培養2セット',
      '重症または閉塞疑いなら腹部エコー/CTを検討',
    ],
    misses: ['尿路閉塞や敗血症を疑う場合は緊急性を上げて検討してください'],
  })

  addCard({
    condition:
      form.prostateSymptoms || form.perinealPain || form.urinaryRetention,
    tone: 'caution',
    label: '前立腺炎',
    title: '急性前立腺炎を考慮してください',
    reasons: collectEvidence(form, [
      ['prostateSymptoms', '前立腺症状'],
      ['perinealPain', '会陰部痛'],
      ['urinaryRetention', '尿閉'],
    ]),
    tests: ['尿検査', '尿培養', '血液培養2セット', '尿閉の評価'],
    misses: ['発熱、排尿症状、会陰部痛、尿閉を伴う場合に考慮してください'],
  })

  addCard({
    condition: form.urinaryCatheter,
    tone: 'info',
    label: 'カテーテル関連尿路感染',
    title: 'カテーテル関連尿路感染を考慮してください',
    reasons: collectEvidence(form, [['urinaryCatheter', '尿道カテーテルあり']]),
    tests: ['尿培養', '血液培養2セット', 'カテーテル交換の要否を検討'],
    misses: [
      '尿道カテーテル留置中は無症候性細菌尿も多く、発熱の原因として本当に尿路感染症かを臨床的に評価してください',
    ],
  })

  addCard({
    condition:
      form.diabetes ||
      form.ckd ||
      form.urinaryDialysis ||
      form.urinaryImmunosuppression ||
      form.kidneyStoneHistory ||
      form.suspectedUrinaryObstruction,
    tone: 'caution',
    label: '複雑性尿路感染',
    title: '複雑性尿路感染を考慮してください',
    reasons: collectEvidence(form, [
      ['diabetes', '糖尿病'],
      ['ckd', 'CKD'],
      ['urinaryDialysis', '透析'],
      ['urinaryImmunosuppression', '免疫抑制'],
      ['kidneyStoneHistory', '腎結石既往'],
      ['suspectedUrinaryObstruction', '尿路閉塞疑い'],
    ]),
    tests: ['尿培養', '血液培養2セット', '腹部エコー', '必要に応じて腹部CT'],
    misses: [
      '基礎疾患や尿路閉塞がある場合は、画像検査や泌尿器科相談も検討してください',
    ],
  })

  addCard({
    condition:
      form.diabetes &&
      (form.urinaryCvaTenderness || form.urinaryBackPain) &&
      (form.urinaryChills || hasFever),
    tone: 'danger',
    label: '気腫性腎盂腎炎',
    title: '気腫性腎盂腎炎を考慮してください',
    reasons: [
      ...collectEvidence(form, [
        ['diabetes', '糖尿病'],
        ['urinaryCvaTenderness', 'CVA叩打痛'],
        ['urinaryBackPain', '腰背部痛'],
        ['urinaryChills', '悪寒戦慄'],
      ]),
      '発熱',
    ],
    tests: ['腹部CTを検討', '血液培養2セット', '腎機能', '泌尿器科相談を検討'],
    misses: [
      '糖尿病患者の重症尿路感染では、気腫性腎盂腎炎を見逃さないでください',
    ],
  })

  return { cards, recommendedTests }
}

function assessAbdominalFocus(form) {
  const cards = []
  const recommendedTests = [
    'CBC',
    'CRP',
    '肝胆道系酵素',
    '血液培養2セット',
    '腹部エコー',
    '腹部CT',
    '便検査（必要時）',
  ]
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition:
      form.rightUpperQuadrantPain &&
      (form.jaundice || form.hepatobiliaryEnzymeElevation),
    tone: 'danger',
    label: '急性胆管炎',
    title: '急性胆管炎を考慮してください',
    reasons: collectEvidence(form, [
      ['rightUpperQuadrantPain', '右季肋部痛'],
      ['jaundice', '黄疸'],
      ['hepatobiliaryEnzymeElevation', '肝胆道系酵素上昇'],
    ]),
    tests: [
      '血液培養2セット',
      '腹部エコー',
      '腹部CT',
      '必要に応じてERCPを検討',
    ],
    misses: ['敗血症へ進展しやすいため早期評価が重要です'],
  })

  addCard({
    condition: form.rightUpperQuadrantPain,
    tone: 'caution',
    label: '急性胆嚢炎',
    title: '急性胆嚢炎を考慮してください',
    reasons: collectEvidence(form, [['rightUpperQuadrantPain', '右季肋部痛']]),
    tests: ['腹部エコー', '腹部CT'],
    misses: ['胆管炎の所見や重症化サインも併せて確認してください'],
  })

  addCard({
    condition: form.abdominalPainDetail,
    tone: 'info',
    label: '憩室炎',
    title: '憩室炎を考慮してください',
    reasons: collectEvidence(form, [
      ['abdominalPainDetail', '腹痛'],
      ['reboundTenderness', '反跳痛・筋性防御'],
    ]),
    tests: ['腹部CTを検討', 'CBC', 'CRP'],
    misses: ['穿孔や膿瘍形成を疑う所見がないか確認してください'],
  })

  addCard({
    condition: form.abdominalPainDetail,
    tone: 'caution',
    label: '虫垂炎',
    title: '虫垂炎を考慮してください',
    reasons: collectEvidence(form, [
      ['abdominalPainDetail', '腹痛'],
      ['vomiting', '嘔吐'],
      ['reboundTenderness', '反跳痛・筋性防御'],
    ]),
    tests: ['腹部CT', '腹部エコーを検討', 'CBC', 'CRP'],
    misses: ['高齢者では典型的症状に乏しいことがあります'],
  })

  addCard({
    condition:
      form.abdominalChills ||
      form.abdominalSurgeryHistory ||
      form.abdominalImmunosuppression,
    tone: 'danger',
    label: '腹腔内膿瘍',
    title: '腹腔内膿瘍を考慮してください',
    reasons: collectEvidence(form, [
      ['abdominalChills', '悪寒戦慄'],
      ['abdominalSurgeryHistory', '腹部手術歴'],
      ['abdominalImmunosuppression', '免疫抑制'],
    ]),
    tests: ['腹部造影CT', '外科相談', '血液培養2セット'],
    misses: ['術後や免疫抑制では症状が乏しいこともあるため注意してください'],
  })

  addCard({
    condition: form.diarrheaDetail && form.recentAntibiotics,
    tone: 'caution',
    label: 'CDI',
    title: 'Clostridioides difficile感染症（CDI）を考慮してください',
    reasons: collectEvidence(form, [
      ['diarrheaDetail', '下痢'],
      ['recentAntibiotics', '最近3か月以内の抗菌薬使用'],
      ['wateryStool', '水様便'],
      ['bloodyStool', '血便'],
      ['recentHospitalization', '最近の入院歴'],
    ]),
    tests: ['便中毒素', 'GDH', 'NAAT/PCR'],
    misses: ['抗菌薬使用後の発熱・下痢では必ず鑑別してください'],
  })

  return { cards, recommendedTests }
}

function assessSkinSoftTissueFocus(form) {
  const cards = []
  const recommendedTests = [
    'CBC',
    'CRP',
    '腎機能',
    'CK',
    '乳酸',
    '血液培養2セット',
    '必要に応じて創部培養',
    '膿瘍疑いではエコー/CT',
    '壊死性筋膜炎疑いでは外科相談を優先',
  ]
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition: form.skinRedness || form.skinSwelling || form.skinWarmth,
    tone: 'info',
    label: '蜂窩織炎',
    title: '蜂窩織炎を考慮してください',
    reasons: collectEvidence(form, [
      ['skinRedness', '発赤'],
      ['skinSwelling', '腫脹'],
      ['skinWarmth', '熱感'],
      ['skinAbscess', '膿瘍'],
    ]),
    tests: [
      '血液培養は重症例や全身状態不良で検討',
      '膿瘍が疑われる場合はエコーやCTを検討',
      '必要に応じて創部培養',
    ],
    misses: ['膿瘍形成がある場合はドレナージの必要性を評価してください'],
  })

  addCard({
    condition:
      form.severeSkinPain ||
      form.painOutOfProportion ||
      form.skinBlister ||
      form.skinNecrosis ||
      form.skinHypotension ||
      form.skinMultiOrganFailure,
    tone: 'danger',
    label: '壊死性筋膜炎',
    title: '壊死性筋膜炎を考慮してください',
    reasons: collectEvidence(form, [
      ['severeSkinPain', '強い疼痛'],
      ['painOutOfProportion', '皮膚所見に比して疼痛が強い'],
      ['skinBlister', '水疱'],
      ['skinNecrosis', '皮膚壊死'],
      ['skinHypotension', '低血圧'],
      ['skinMultiOrganFailure', '多臓器障害'],
    ]),
    tests: [
      '緊急外科相談',
      '血液培養2セット',
      '乳酸',
      '造影CTを検討',
      '早期デブリードマンの要否を評価',
    ],
    misses: [
      '疼痛が皮膚所見に比して強い場合は、皮膚所見が軽くても壊死性筋膜炎を考慮してください',
    ],
  })

  addCard({
    condition: form.diabeticFoot,
    tone: 'caution',
    label: '糖尿病足感染',
    title: '糖尿病足感染を考慮してください',
    reasons: collectEvidence(form, [['diabeticFoot', '糖尿病足']]),
    tests: [
      '創部評価',
      '深部感染の評価',
      '骨髄炎の評価',
      '必要に応じて画像検査',
      '外科/整形外科/形成外科相談を検討',
    ],
    misses: ['糖尿病足では深部膿瘍、骨髄炎、混合感染を考慮してください'],
  })

  addCard({
    condition: form.pressureUlcer,
    tone: 'caution',
    label: '褥瘡感染',
    title: '褥瘡感染を考慮してください',
    reasons: collectEvidence(form, [['pressureUlcer', '褥瘡']]),
    tests: ['創部評価', '深部感染の評価', '骨髄炎の評価', '必要に応じて画像検査'],
    misses: [
      '表面の培養だけでなく、深部感染や骨髄炎の評価が必要になることがあります',
    ],
  })

  addCard({
    condition:
      form.skinPeeling ||
      (form.generalizedRash && form.skinHypotension) ||
      (form.generalizedRash && form.skinMultiOrganFailure),
    tone: form.skinHypotension || form.skinMultiOrganFailure ? 'danger' : 'caution',
    label: 'SSSS/TSS',
    title:
      '黄色ブドウ球菌関連疾患、SSSS、中毒性ショック症候群を考慮してください',
    reasons: collectEvidence(form, [
      ['skinPeeling', '皮膚剥離'],
      ['generalizedRash', '全身発疹'],
      ['skinHypotension', '低血圧'],
      ['skinMultiOrganFailure', '多臓器障害'],
    ]),
    tests: ['血液培養2セット', '臓器障害評価', '腎機能', 'CK', '乳酸'],
    misses: [
      '成人のSSSSはまれですが、重症化しやすいため全身状態を評価してください',
    ],
  })

  return { cards, recommendedTests }
}

function assessBoneJointFocus(form) {
  const cards = []
  const recommendedTests = [
    'CBC',
    'CRP',
    '血液培養2セット',
    '関節穿刺',
    '関節液培養',
    '必要に応じてMRIまたはCT',
  ]
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition:
      form.jointSwelling ||
      form.limitedRangeOfMotion ||
      form.feverOver38,
    tone: 'danger',
    label: '化膿性関節炎',
    title: '化膿性関節炎を考慮してください',
    reasons: collectEvidence(form, [
      ['jointSwelling', '関節腫脹'],
      ['limitedRangeOfMotion', '可動域制限'],
      ['feverOver38', '38℃以上の発熱'],
      ['prostheticJoint', '人工関節'],
    ]),
    tests: ['関節穿刺', 'グラム染色', '細菌培養', '血液培養2セット'],
    misses: ['診断がつくまで化膿性関節炎を否定しないでください'],
  })

  addCard({
    condition: form.kneeJointPain || form.polyarthralgia || form.crpOver10,
    tone: 'caution',
    label: '偽痛風（CPPD）',
    title: '偽痛風（CPPD）を考慮してください',
    reasons: collectEvidence(form, [
      ['kneeJointPain', '膝関節痛'],
      ['polyarthralgia', '多関節痛'],
      ['crpOver10', 'CRP 10以上'],
      ['feverOver38', '38℃以上の発熱'],
    ]),
    tests: [
      '関節穿刺',
      '偏光顕微鏡',
      '関節液中ピロリン酸カルシウム結晶',
      'Ca、P、Mg、ALP',
      'Fe、トランスフェリン',
      'PTH',
      '甲状腺機能',
      'X線で線状・層状石灰化を確認',
    ],
    misses: [
      '38℃以上の発熱を伴うことがあります',
      '高齢者で多く、膝関節が最多ですが肩・肘・手・足・股関節にも発症します',
      '多関節型は約40%です',
      '急性期は化膿性関節炎との鑑別が困難です。必要に応じて入院や経験的抗菌薬も検討してください',
    ],
  })

  addCard({
    condition: form.sternoclavicularPain,
    tone: 'caution',
    label: '胸鎖関節炎',
    title: '胸鎖関節炎を考慮してください',
    reasons: collectEvidence(form, [['sternoclavicularPain', '胸鎖関節痛']]),
    tests: ['血液培養2セット', 'CTまたはMRIを検討', '膿瘍評価'],
    misses: [
      '発熱と肩痛・前胸部痛で発症することがあります',
      '重症例では膿瘍形成を伴います',
    ],
  })

  addCard({
    condition: form.boneBackPain,
    tone: 'danger',
    label: '化膿性脊椎炎',
    title: '化膿性脊椎炎を考慮してください',
    reasons: collectEvidence(form, [['boneBackPain', '腰背部痛']]),
    tests: ['MRI', '血液培養', '感染性心内膜炎検索'],
    misses: ['腰背部痛を伴う発熱では、初期画像が目立たなくても経時的に再評価してください'],
  })

  addCard({
    condition: form.boneBackPain,
    tone: 'caution',
    label: '腸腰筋膿瘍',
    title: '腸腰筋膿瘍を考慮してください',
    reasons: collectEvidence(form, [['boneBackPain', '腰背部痛']]),
    tests: ['腹部造影CT'],
    misses: ['腰背部痛に発熱がある場合は、深部膿瘍も鑑別に含めてください'],
  })

  return { cards, recommendedTests }
}

function assessCentralNervousFocus(form) {
  const cards = []
  const hasFever = true
  const hasNeckPainSymptom = form.step2Symptoms.includes('symptomNeckPain')
  const recommendedTests = [
    '血液培養2セット',
    'CBC',
    'CRP',
    '頭部CT/MRI',
    '髄液検査',
    '頸椎CT',
    '脊椎MRI',
    '必要に応じて感染性心内膜炎検索',
  ]
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition:
      form.cnsHeadache ||
      form.cnsNeckStiffness ||
      form.cnsAlteredMentalStatus ||
      (hasFever && hasNeckPainSymptom),
    tone:
      form.cnsAlteredMentalStatus ||
      form.cnsSeizure ||
      form.focalNeurologicDeficit ||
      form.suspectedPapilledema ||
      form.cnsImmunosuppression
        ? 'danger'
        : 'caution',
    label: '髄膜炎',
    title: '髄膜炎を考慮してください',
    reasons: [
      ...collectEvidence(form, [
        ['cnsHeadache', '頭痛'],
        ['cnsNeckStiffness', '項部硬直'],
        ['cnsAlteredMentalStatus', '意識障害'],
      ]),
      ...(hasNeckPainSymptom ? ['発熱＋頸部痛'] : []),
    ],
    tests: [
      '血液培養2セット',
      '頭部画像の要否を評価',
      '髄液検査を検討',
      '意識障害、痙攣、神経巣症状、乳頭浮腫疑い、免疫抑制がある場合は頭部画像を先行検討',
    ],
    misses: ['高齢者では項部硬直が明らかでないことがあります'],
  })

  addCard({
    condition:
      form.cnsAlteredMentalStatus ||
      form.cnsSeizure ||
      form.focalNeurologicDeficit,
    tone: 'danger',
    label: '脳炎',
    title: '脳炎を考慮してください',
    reasons: collectEvidence(form, [
      ['cnsAlteredMentalStatus', '意識障害'],
      ['cnsSeizure', '痙攣'],
      ['focalNeurologicDeficit', '神経巣症状'],
    ]),
    tests: ['頭部MRI/CT', '髄液検査', '脳波', 'HSVなどの評価を検討'],
    misses: ['意識障害や痙攣を伴う発熱では脳炎を鑑別してください'],
  })

  addCard({
    condition:
      form.cnsOlderAdult &&
      (form.cnsAcuteNeckPain || form.cnsLimitedNeckRotation),
    tone: 'caution',
    label: 'Crowned dens syndrome',
    title: 'Crowned dens syndromeを考慮してください',
    reasons: collectEvidence(form, [
      ['cnsOlderAdult', '高齢者'],
      ['cnsAcuteNeckPain', '急性頸部痛'],
      ['cnsLimitedNeckRotation', '頸部回旋制限'],
    ]),
    tests: ['頸椎CT', '軸椎歯突起周囲の石灰化を確認'],
    misses: [
      'MRIでは石灰化を評価しにくいことがあります',
      '髄膜炎、PMR、化膿性脊椎炎との鑑別が重要です',
    ],
  })

  addCard({
    condition: form.cnsBackPain || (hasFever && hasNeckPainSymptom),
    tone: 'danger',
    label: '化膿性脊椎炎',
    title: '化膿性脊椎炎を考慮してください',
    reasons: [
      ...collectEvidence(form, [['cnsBackPain', '腰背部痛']]),
      ...(hasNeckPainSymptom ? ['頸部痛＋発熱'] : []),
    ],
    tests: ['MRI', '血液培養2セット', '感染性心内膜炎検索を検討'],
    misses: ['発熱と頸部痛・腰背部痛では脊椎感染も鑑別してください'],
  })

  addCard({
    condition: form.cnsShoulderThighPain,
    tone: 'info',
    label: 'PMR',
    title: 'リウマチ性多発筋痛症を考慮してください',
    reasons: collectEvidence(form, [['cnsShoulderThighPain', '肩・大腿痛']]),
    tests: ['CBC', 'CRP', '感染症やCrowned dens syndromeとの鑑別を検討'],
    misses: [
      '発熱、頸部痛、肩・大腿痛を伴う場合、Crowned dens syndromeや感染症との鑑別が必要です',
    ],
  })

  return { cards, recommendedTests }
}

function assessBloodstreamFocus(form) {
  const cards = []
  const hasChillsSymptom = form.step2Symptoms.includes('symptomChills')
  const hasPositiveBloodCultureSymptom = form.step2Symptoms.includes(
    'symptomPositiveBloodCulture',
  )

  const recommendedTests = [
    '血液培養2セット以上',
    'CBC',
    'CRP',
    '腎機能',
    '肝機能',
    '乳酸',
    '尿検査',
    '胸腹部CT',
    '心エコー',
    '必要に応じて脊椎MRI',
    'デバイス感染評価',
  ]

  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  const bacteremiaReasons = collectEvidence(form, [
    ['bsiChills', '悪寒戦慄'],
    ['bsiPositiveBloodCulture', '血液培養陽性'],
  ])
  if (hasChillsSymptom) bacteremiaReasons.unshift('Step2A：悪寒戦慄')
  if (hasPositiveBloodCultureSymptom) {
    bacteremiaReasons.unshift('Step2A：血液培養陽性')
  }

  addCard({
    condition:
      hasChillsSymptom ||
      hasPositiveBloodCultureSymptom ||
      form.bsiChills ||
      form.bsiPositiveBloodCulture,
    tone: 'danger',
    label: '菌血症',
    title: '菌血症を考慮してください',
    reasons: bacteremiaReasons,
    tests: ['血液培養2セット以上', '感染巣検索', '臓器障害評価', '培養採取後に経験的治療を検討'],
    misses: ['悪寒戦慄を伴う発熱では菌血症を強く考慮してください'],
  })

  addCard({
    condition:
      form.bsiPositiveBloodCulture ||
      hasPositiveBloodCultureSymptom ||
      form.bsiHeartMurmur ||
      form.bsiProstheticValve ||
      form.bsiPacemaker ||
      form.bsiDialysis ||
      form.bsiCerebralEmbolicSymptoms ||
      form.bsiSkinFindings,
    tone: 'danger',
    label: '感染性心内膜炎',
    title: '感染性心内膜炎を考慮してください',
    reasons: [
      ...(hasPositiveBloodCultureSymptom ? ['Step2A：血液培養陽性'] : []),
      ...collectEvidence(
        form,
        [
          ['bsiPositiveBloodCulture', '血液培養陽性'],
          ['bsiHeartMurmur', '心雑音'],
          ['bsiProstheticValve', '人工弁'],
          ['bsiPacemaker', 'ペースメーカー'],
          ['bsiDialysis', '透析'],
          ['bsiCerebralEmbolicSymptoms', '脳塞栓症状'],
          ['bsiSkinFindings', '皮膚所見'],
        ],
      ),
    ],
    tests: [
      '血液培養複数セット',
      '経胸壁心エコー',
      '必要に応じて経食道心エコー',
      '塞栓症状の評価',
      '化膿性脊椎炎など深部感染巣検索',
    ],
    misses: [
      '血液培養陰性でも感染性心内膜炎は否定できません',
      '人工弁、ペースメーカー、透析患者では特に注意してください',
    ],
  })

  addCard({
    condition: form.bsiStaphAureus,
    tone: 'danger',
    label: '黄色ブドウ球菌菌血症',
    title: '黄色ブドウ球菌菌血症を考慮してください',
    reasons: ['Staphylococcus aureus'],
    tests: [
      '心エコーを検討',
      '血液培養陰性化確認',
      '深部感染巣検索',
      '化膿性脊椎炎、腸腰筋膿瘍、感染性心内膜炎を評価',
    ],
    misses: [
      '黄色ブドウ球菌菌血症では感染性心内膜炎や転移性感染巣を常に考慮してください',
    ],
  })

  addCard({
    condition: form.bsiCandida,
    tone: 'danger',
    label: 'Candida血症',
    title: 'Candida血症を考慮してください',
    reasons: ['Candida'],
    tests: ['眼科診察を検討', 'CVカテーテル関連感染の評価', '深部感染巣検索'],
    misses: ['Candida血症では眼内炎評価が重要です'],
  })

  addCard({
    condition: form.bsiMixedGpcGnr,
    tone: 'caution',
    label: '混合感染',
    title: '混合感染を考慮してください',
    reasons: ['GPC＋GNR混在'],
    tests: [
      '腹腔内感染の評価',
      '糖尿病足感染の評価',
      '褥瘡感染の評価',
      '嫌気性菌を含む混合感染の評価',
      'デバイス感染の評価',
    ],
    misses: [
      'GPCとGNRが混在する場合は、単一菌感染ではなく混合感染や深部感染巣を考慮してください',
    ],
  })

  addCard({
    condition:
      form.bsiCentralVenousCatheter ||
      form.bsiPort ||
      form.bsiPacemaker ||
      form.bsiProstheticValve ||
      form.bsiProstheticJoint,
    tone: 'caution',
    label: 'デバイス関連感染',
    title: 'デバイス関連感染を考慮してください',
    reasons: collectEvidence(
      form,
      [
        ['bsiCentralVenousCatheter', 'CVカテーテル'],
        ['bsiPort', 'ポート'],
        ['bsiPacemaker', 'ペースメーカー'],
        ['bsiProstheticValve', '人工弁'],
        ['bsiProstheticJoint', '人工関節'],
      ],
    ),
    tests: [
      'デバイス刺入部や周囲の評価',
      '血液培養',
      '必要に応じてデバイス抜去や専門科相談を検討',
    ],
    misses: ['デバイス留置中は明らかな局所所見が乏しくても関連感染を検討してください'],
  })

  addCard({
    condition:
      form.bsiBackPain ||
      form.bsiPositiveBloodCulture ||
      hasPositiveBloodCultureSymptom ||
      form.bsiStaphAureus,
    tone: 'caution',
    label: '深部感染巣',
    title: '深部感染巣を考慮してください',
    reasons: [
      ...(hasPositiveBloodCultureSymptom ? ['Step2A：血液培養陽性'] : []),
      ...collectEvidence(
        form,
        [
          ['bsiBackPain', '腰背部痛'],
          ['bsiPositiveBloodCulture', '血液培養陽性'],
          ['bsiStaphAureus', 'Staphylococcus aureus'],
        ],
      ),
    ],
    tests: ['脊椎MRI', '造影CT', '心エコー', '血液培養フォロー'],
    misses: ['化膿性脊椎炎、腸腰筋膿瘍、感染性心内膜炎、深部膿瘍を鑑別してください'],
  })

  return { cards, recommendedTests }
}

function assessBackPainFocus(form) {
  const cards = []
  const addCard = ({ condition, tone, label, title, message, evidence }) => {
    if (!condition) return
    cards.push({ tone, label, title, message, evidence: evidence.join('、') })
  }

  addCard({
    condition: form.cvaTenderness || form.dysuria,
    tone: 'caution',
    label: '腎盂腎炎',
    title: '腎盂腎炎を考慮',
    message: 'CVA叩打痛や排尿痛を伴う発熱では、腎盂腎炎を考慮してください。',
    evidence: collectEvidence(form, [
      ['cvaTenderness', 'CVA叩打痛'],
      ['dysuria', '排尿痛'],
    ]),
  })

  addCard({
    condition:
      form.lumbarTenderness ||
      form.walkingDifficulty ||
      form.movementDifficulty,
    tone: 'danger',
    label: '化膿性脊椎炎',
    title: '化膿性脊椎炎を考慮',
    message:
      '腰椎叩打痛、歩行困難、体動困難がある場合は、化膿性脊椎炎を疑い評価を検討してください。',
    evidence: collectEvidence(form, [
      ['lumbarTenderness', '腰椎叩打痛'],
      ['walkingDifficulty', '歩行困難'],
      ['movementDifficulty', '体動困難'],
    ]),
  })

  addCard({
    condition:
      form.backPainChills ||
      form.positiveBloodCulture ||
      form.prostheticValve ||
      form.dialysis,
    tone: 'danger',
    label: '菌血症/感染性心内膜炎',
    title: '感染性心内膜炎や菌血症を考慮',
    message:
      '悪寒戦慄、血液培養陽性、人工弁、透析がある場合は、感染性心内膜炎や菌血症を検討してください。',
    evidence: collectEvidence(form, [
      ['backPainChills', '悪寒戦慄'],
      ['positiveBloodCulture', '血液培養陽性'],
      ['prostheticValve', '人工弁'],
      ['dialysis', '透析'],
    ]),
  })

  addCard({
    condition:
      form.lumbarTenderness ||
      form.walkingDifficulty ||
      form.movementDifficulty ||
      form.backPainChills,
    tone: 'caution',
    label: '腸腰筋膿瘍',
    title: '腸腰筋膿瘍を考慮',
    message:
      '発熱と腰背部痛に移動困難や強い炎症所見を伴う場合は、腸腰筋膿瘍も鑑別に含めてください。',
    evidence: collectEvidence(form, [
      ['lumbarTenderness', '腰椎叩打痛'],
      ['walkingDifficulty', '歩行困難'],
      ['movementDifficulty', '体動困難'],
      ['backPainChills', '悪寒戦慄'],
    ]),
  })

  addCard({
    condition: form.severeBackPain,
    tone: 'danger',
    label: '大動脈疾患',
    title: '腹部大動脈瘤・大動脈解離を考慮',
    message:
      '強い腰背部痛や胸背部痛がある場合は、感染症だけでなく大動脈疾患も検討してください。',
    evidence: collectEvidence(form, [['severeBackPain', '強い腰背部痛・胸背部痛']]),
  })

  return { cards }
}

function assessNeckPainFocus(form) {
  const cards = []
  const addCard = ({ condition, tone, label, title, message, evidence }) => {
    if (!condition) return
    cards.push({ tone, label, title, message, evidence: evidence.join('、') })
  }

  addCard({
    condition:
      form.neckHeadache || form.neckStiffness || form.neckAlteredMentalStatus,
    tone: 'danger',
    label: '髄膜炎/脳炎',
    title: '髄膜炎・脳炎を考慮',
    message:
      '頭痛、項部硬直、意識障害がある場合は、髄膜炎・脳炎を疑い評価を検討してください。',
    evidence: collectEvidence(form, [
      ['neckHeadache', '頭痛'],
      ['neckStiffness', '項部硬直'],
      ['neckAlteredMentalStatus', '意識障害'],
    ]),
  })

  addCard({
    condition:
      form.olderAdult && form.acuteNeckPain && form.limitedNeckRotation,
    tone: 'caution',
    label: 'Crowned dens syndrome',
    title: 'Crowned dens syndromeを考慮',
    message:
      '高齢者の発熱と急性頸部痛、頸部回旋制限ではCrowned dens syndromeも検討してください。',
    evidence: collectEvidence(form, [
      ['olderAdult', '高齢者'],
      ['acuteNeckPain', '急性頸部痛'],
      ['limitedNeckRotation', '頸部回旋制限'],
    ]),
  })

  addCard({
    condition: form.neckBackPain,
    tone: 'caution',
    label: '化膿性脊椎炎',
    title: '化膿性脊椎炎も考慮',
    message:
      '頸部痛に腰背部痛を伴う場合は、化膿性脊椎炎も鑑別に含めてください。',
    evidence: collectEvidence(form, [['neckBackPain', '腰背部痛']]),
  })

  addCard({
    condition: form.shoulderThighPain,
    tone: 'info',
    label: 'PMR',
    title: 'リウマチ性多発筋痛症を考慮',
    message:
      '肩や大腿の痛みを伴う場合は、リウマチ性多発筋痛症も検討してください。',
    evidence: collectEvidence(form, [['shoulderThighPain', '肩や大腿の痛み']]),
  })

  return { cards }
}

function assessNoLocalizingFocus(form) {
  const cards = []
  const addCard = ({ condition, tone, label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition:
      form.unknownChills ||
      form.unknownPositiveBloodCulture ||
      form.heartMurmur ||
      form.unknownProstheticValve ||
      form.unknownPacemaker ||
      form.unknownDialysis,
    tone: 'danger',
    label: '感染性心内膜炎',
    title: '感染性心内膜炎を考慮してください',
    reasons: collectEvidence(form, [
      ['unknownChills', '悪寒戦慄'],
      ['unknownPositiveBloodCulture', '血液培養陽性'],
      ['heartMurmur', '心雑音'],
      ['unknownProstheticValve', '人工弁'],
      ['unknownPacemaker', 'ペースメーカー'],
      ['unknownDialysis', '透析'],
    ]),
    tests: ['血液培養複数セット', '心エコー', '深部感染巣検索'],
    misses: [
      '局所症状が乏しくても、菌血症リスクや心雑音があれば検討してください',
    ],
  })

  addCard({
    condition: form.unknownChills || form.unknownPositiveBloodCulture,
    tone: 'danger',
    label: '菌血症',
    title: '菌血症を考慮してください',
    reasons: collectEvidence(form, [
      ['unknownChills', '悪寒戦慄'],
      ['unknownPositiveBloodCulture', '血液培養陽性'],
    ]),
    tests: ['血液培養複数セット', '感染巣検索', '臓器障害評価'],
    misses: ['悪寒戦慄のみでも菌血症を疑う入口にしてください'],
  })

  addCard({
    condition: form.unknownLdhHigh,
    tone: 'caution',
    label: 'IVL',
    title: '血管内リンパ腫を考慮してください',
    reasons: ['LDH高値', '感染巣不明'],
    tests: ['可溶性IL-2R', 'PET-CT', 'ランダム皮膚生検を検討'],
    misses: ['皮疹がなくても否定できません'],
  })

  addCard({
    condition:
      form.unknownNightSweats ||
      form.unknownWeightLoss ||
      form.unknownAnemia,
    tone: 'info',
    label: '悪性腫瘍',
    title: '悪性腫瘍を考慮してください',
    reasons: collectEvidence(form, [
      ['unknownNightSweats', '夜間発汗'],
      ['unknownWeightLoss', '体重減少'],
      ['unknownAnemia', '貧血'],
    ]),
    tests: ['末梢血液像', 'LDH', '画像検査', '必要に応じて血液内科・腫瘍評価'],
    misses: ['悪性リンパ腫、白血病、腎細胞癌、肝細胞癌などを考慮'],
  })

  addCard({
    condition: form.unknownShoulderThighPain,
    tone: 'info',
    label: 'PMR',
    title: 'リウマチ性多発筋痛症を考慮してください',
    reasons: collectEvidence(form, [['unknownShoulderThighPain', '肩・大腿痛']]),
    tests: ['炎症反応', '筋力低下の有無', '巨細胞性動脈炎の合併確認'],
    misses: ['感染症や悪性腫瘍を除外しながら検討してください'],
  })

  addCard({
    condition: form.temporalArteryTenderness,
    tone: 'danger',
    label: '巨細胞性動脈炎',
    title: '巨細胞性動脈炎を考慮してください',
    reasons: collectEvidence(form, [
      ['temporalArteryTenderness', '側頭動脈圧痛'],
    ]),
    tests: ['眼症状の確認', '失明予防のため早期評価', '炎症反応・画像評価を検討'],
    misses: ['視力障害や顎跛行を伴う場合は緊急性を上げて検討してください'],
  })

  addCard({
    condition: form.thoracodorsalPain,
    tone: 'danger',
    label: '大動脈疾患',
    title: '大動脈瘤・大動脈解離を考慮してください',
    reasons: collectEvidence(form, [['thoracodorsalPain', '胸背部痛']]),
    tests: ['バイタル再評価', '造影CTを検討', '循環器・救急評価を検討'],
    misses: ['発熱があっても感染症だけに寄せすぎないでください'],
  })

  addCard({
    condition: form.unknownThrombocytopenia && form.unknownEdema,
    tone: 'caution',
    label: 'TAFRO症候群',
    title: 'TAFRO症候群を考慮してください',
    reasons: [
      ...collectEvidence(form, [
        ['unknownThrombocytopenia', '血小板低下'],
        ['unknownEdema', '浮腫'],
      ]),
      '発熱',
    ],
    tests: ['腎機能評価', '臓器腫大の確認', '血液内科評価を検討'],
    misses: collectEvidence(form, [
      ['unknownRenalDysfunction', '参考所見：腎機能障害'],
      ['unknownOrganomegaly', '参考所見：臓器腫大'],
    ]).concat('感染症、悪性腫瘍、自己免疫疾患との鑑別を検討'),
  })

  addCard({
    condition: form.ssriUse && form.unknownCkHigh,
    tone: 'caution',
    label: 'セロトニン症候群',
    title: 'セロトニン症候群を考慮してください',
    reasons: collectEvidence(form, [
      ['ssriUse', 'SSRI使用'],
      ['unknownCkHigh', 'CK高値'],
    ]),
    tests: ['薬剤歴の確認', '神経筋症状の確認', '自律神経症状の確認'],
    misses: ['感染症に見える発熱でも薬剤関連の可能性を検討してください'],
  })

  return { cards }
}

function assessNonInfectiousFocus(form) {
  const cards = []

  const addCard = ({ condition, tone = 'info', label, title, reasons, tests, misses }) => {
    if (!condition) return
    cards.push({ tone, label, title, reasons, tests, misses })
  }

  addCard({
    condition: form.nonInfRecentDrugStart || form.nonInfAntibioticsUse,
    label: '薬剤熱',
    title: '薬剤熱を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfRecentDrugStart', '最近開始した薬剤'],
      ['nonInfAntibioticsUse', '抗菌薬使用中'],
    ]),
    tests: ['薬剤開始時期と発熱経過の確認', '原因薬剤の中止可否を検討', '感染症除外の再評価'],
    misses: ['薬剤熱は感染症らしく見えることがあり、中止後72〜96時間で解熱することがあります'],
  })

  addCard({
    condition:
      form.nonInfMalignancyHistory ||
      form.nonInfNightSweats ||
      form.nonInfWeightLoss,
    label: '腫瘍熱',
    title: '腫瘍熱を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfMalignancyHistory', '悪性腫瘍既往'],
      ['nonInfNightSweats', '夜間発汗'],
      ['nonInfWeightLoss', '体重減少'],
    ]),
    tests: ['CBC', 'LDH', '画像検査', '必要に応じて悪性腫瘍評価'],
    misses: ['感染巣が明らかでない場合でも、悪性リンパ腫、白血病、腎細胞癌、肝細胞癌などを検討してください'],
  })

  addCard({
    condition: form.nonInfLdhHigh,
    label: '血管内リンパ腫',
    title: '血管内リンパ腫を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfLdhHigh', 'LDH高値'],
      ['nonInfNightSweats', '夜間発汗'],
      ['nonInfWeightLoss', '体重減少'],
    ]),
    tests: ['可溶性IL-2R', 'PET-CT', 'ランダム皮膚生検を検討'],
    misses: ['皮疹がなくても血管内リンパ腫は否定できません'],
  })

  addCard({
    condition:
      form.nonInfShoulderThighPain ||
      form.nonInfTemporalArteryTenderness,
    tone: form.nonInfTemporalArteryTenderness ? 'caution' : 'info',
    label: 'PMR/GCA',
    title: 'PMR/GCAを考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfShoulderThighPain', '肩・大腿痛'],
      ['nonInfTemporalArteryTenderness', '側頭動脈圧痛'],
    ]),
    tests: ['ESR/CRP', '眼症状の確認', '側頭動脈エコーや生検を検討'],
    misses: ['側頭動脈圧痛や眼症状がある場合は、失明予防のため早期評価を検討してください'],
  })

  addCard({
    condition: form.nonInfAcuteJointPain || form.nonInfKneeJointPain,
    label: '偽痛風/CPPD',
    title: '偽痛風/CPPDを考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfAcuteJointPain', '急性関節痛'],
      ['nonInfKneeJointPain', '膝関節痛'],
    ]),
    tests: ['関節穿刺', '偏光顕微鏡', '関節液中ピロリン酸カルシウム結晶', '関節X線'],
    misses: ['急性期は化膿性関節炎との鑑別が困難なため、必要に応じて培養も検討してください'],
  })

  addCard({
    condition:
      form.nonInfThrombocytopenia &&
      form.nonInfEdema &&
      form.nonInfRenalDysfunction,
    tone: 'caution',
    label: 'TAFRO症候群',
    title: 'TAFRO症候群を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfThrombocytopenia', '血小板低下'],
      ['nonInfEdema', '浮腫'],
      ['nonInfRenalDysfunction', '腎機能障害'],
    ]),
    tests: ['CBC', '腎機能', '画像で臓器腫大や胸腹水を評価', '血液内科相談を検討'],
    misses: ['感染症や悪性腫瘍に見えることがあり、血小板低下、浮腫、腎機能障害の組み合わせに注意してください'],
  })

  addCard({
    condition:
      form.nonInfLegSwelling ||
      form.nonInfChestPain ||
      form.nonInfDyspnea,
    tone: 'caution',
    label: 'DVT/肺塞栓',
    title: 'DVT/肺塞栓を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfLegSwelling', '下肢腫脹'],
      ['nonInfChestPain', '胸痛'],
      ['nonInfDyspnea', '呼吸困難'],
    ]),
    tests: ['D-dimerを検討', '下肢静脈エコー', '造影CTを検討', '酸素化と循環動態の評価'],
    misses: ['血栓症に伴う発熱やCRP高値では、感染症だけに寄せすぎないでください'],
  })

  addCard({
    condition: form.nonInfChestPain || form.nonInfDyspnea || form.nonInfCkHigh,
    tone: 'caution',
    label: '心筋炎',
    title: '心筋炎を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfChestPain', '胸痛'],
      ['nonInfDyspnea', '呼吸困難'],
      ['nonInfCkHigh', 'CK高値'],
    ]),
    tests: ['心電図', 'トロポニン', '心エコー', '必要に応じて心臓MRIを検討'],
    misses: ['胸部症状が乏しい場合もあり、発熱・炎症反応高値に循環器症状を伴う場合は想起してください'],
  })

  addCard({
    condition: form.nonInfSsriSnriUse && form.nonInfCkHigh,
    tone: 'caution',
    label: 'セロトニン症候群',
    title: 'セロトニン症候群を考慮してください',
    reasons: collectEvidence(form, [
      ['nonInfSsriSnriUse', 'SSRI/SNRI使用'],
      ['nonInfCkHigh', 'CK高値'],
    ]),
    tests: ['薬剤歴の確認', '体温・自律神経症状の評価', '振戦・筋強剛の確認', 'CKと腎機能の再評価'],
    misses: ['感染症に見える発熱でも、薬剤関連の神経筋症状があれば検討してください'],
  })

  return { cards }
}

function buildTestRecommendations({
  form,
  step0Result,
  respiratoryResult,
  urinaryResult,
  abdominalResult,
  skinResult,
  boneJointResult,
  centralNervousResult,
  bloodstreamResult,
  nonInfectiousResult,
}) {
  const ranks = { priority: 0, additional: 1, consult: 2 }
  const tests = new Map()

  const add = (section, name, reason) => {
    const current = tests.get(name)
    if (!current) {
      tests.set(name, { section, name, reasons: new Set([reason]) })
      return
    }
    current.reasons.add(reason)
    if (ranks[section] < ranks[current.section]) current.section = section
  }

  const addMany = (section, names, reason) => {
    names.forEach((name) => add(section, name, reason))
  }

  addMany(
    'priority',
    ['CBC', '生化学', 'CRP', '血液培養2セット', '尿検査', '尿培養', '乳酸', '胸部X線'],
    '発熱・CRP高値の基本評価',
  )
  addMany(
    'additional',
    ['胸腹部CT', '肝胆道系酵素', 'CK', 'LDH', '凝固系', 'フェリチン'],
    '発熱・炎症反応高値の追加評価',
  )

  if (step0Result.hasEmergency) {
    addMany(
      'priority',
      ['血液培養2セット', '乳酸', '臓器障害評価', '感染巣検索'],
      '敗血症・重症感染症を考慮',
    )
    addMany(
      'additional',
      ['胸腹部CT', '尿培養', '喀痰培養', '画像検査'],
      '重症感染症の感染巣評価',
    )
  }

  if (
    form.step2Symptoms.includes('symptomRespiratory') ||
    respiratoryResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['胸部X線', 'SpO2/酸素需要評価', '喀痰グラム染色・培養'],
      '呼吸器感染を考慮',
    )
    addMany(
      'additional',
      ['胸部CT', '尿中肺炎球菌抗原', '尿中レジオネラ抗原', '抗酸菌検査', 'β-Dグルカン'],
      '肺炎・結核・PCPなどの追加評価',
    )
  }

  if (form.step2Symptoms.includes('symptomUrinary') || urinaryResult.cards.length > 0) {
    addMany(
      'priority',
      ['尿定性', '尿沈渣', '尿培養', '血液培養2セット'],
      '尿路感染を考慮',
    )
    addMany(
      'additional',
      ['腎機能', '腹部エコー', '腹部CT', '尿路閉塞評価'],
      '腎盂腎炎・複雑性尿路感染の評価',
    )
  }

  if (
    form.step2Symptoms.includes('symptomAbdominalPain') ||
    form.step2Symptoms.includes('symptomDiarrhea') ||
    abdominalResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['肝胆道系酵素', '血液培養2セット', '腹部エコー', '腹部CT'],
      '腹腔内・胆道感染を考慮',
    )
    addMany(
      'additional',
      ['便検査', 'CDI検査'],
      '下痢・腹腔内感染の追加評価',
    )
    add('consult', '外科/消化器相談', '腹腔内・胆道感染で処置適応を検討')
  }

  if (
    form.step2Symptoms.includes('symptomSkinFindings') ||
    skinResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['CBC', 'CRP', '腎機能', 'CK', '乳酸', '血液培養2セット'],
      '皮膚軟部組織感染を考慮',
    )
    addMany('additional', ['創部培養', 'エコー/CT'], '膿瘍や深部感染の評価')
    add('consult', '壊死性筋膜炎疑いでは外科相談を優先', '壊死性筋膜炎を見逃さないため')
  }

  if (
    form.step2Symptoms.includes('symptomJointPain') ||
    boneJointResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['関節穿刺', '関節液グラム染色', '関節液培養', '血液培養2セット'],
      '骨関節感染・偽痛風を考慮',
    )
    addMany(
      'additional',
      ['偏光顕微鏡', '関節液結晶確認', 'X線', 'CT/MRI', 'Ca', 'P', 'Mg', 'ALP', 'PTH', 'Fe/トランスフェリン'],
      'CPPDや深部骨関節感染の評価',
    )
  }

  if (
    form.step2Symptoms.includes('symptomHeadache') ||
    form.step2Symptoms.includes('symptomNeckPain') ||
    centralNervousResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['血液培養2セット', '頭部画像の要否評価', '髄液検査'],
      '中枢神経感染を考慮',
    )
    addMany(
      'additional',
      ['頭部CT/MRI', '髄液培養', 'HSVなどの評価', '脳波'],
      '髄膜炎・脳炎の追加評価',
    )
  }

  if (
    form.step2Symptoms.includes('symptomChills') ||
    form.step2Symptoms.includes('symptomPositiveBloodCulture') ||
    bloodstreamResult.cards.length > 0
  ) {
    addMany(
      'priority',
      ['血液培養複数セット', '経胸壁心エコー'],
      '血流感染・感染性心内膜炎を考慮',
    )
    addMany(
      'additional',
      ['経食道心エコー', '脊椎MRI', '胸腹部CT', '深部感染巣検索'],
      '感染性心内膜炎・深部感染巣の評価',
    )
  }

  const nonInfectiousLabels = new Set(nonInfectiousResult.cards.map((card) => card.label))

  if (nonInfectiousLabels.has('血管内リンパ腫')) {
    addMany(
      'priority',
      ['LDH', '可溶性IL-2R', 'CBC', '末梢血塗抹'],
      '血管内リンパ腫を考慮',
    )
    addMany(
      'additional',
      ['PET-CT', 'ランダム皮膚生検', '骨髄検査'],
      '血管内リンパ腫の追加評価',
    )
  }

  if (nonInfectiousLabels.has('PMR/GCA')) {
    addMany(
      'priority',
      ['ESR', 'CRP', 'CK', '眼症状確認'],
      'PMR/GCAを考慮',
    )
    addMany(
      'additional',
      ['側頭動脈エコー', '側頭動脈生検', '大血管評価'],
      'GCAや大血管病変の評価',
    )
  }

  if (nonInfectiousLabels.has('薬剤熱')) {
    addMany(
      'priority',
      ['薬剤開始時期の確認', '薬剤中止後の経過確認'],
      '薬剤熱を考慮',
    )
    addMany(
      'additional',
      ['好酸球', '肝機能', '皮疹確認'],
      '薬剤関連発熱の追加評価',
    )
  }

  if (nonInfectiousLabels.has('腫瘍熱')) {
    addMany(
      'priority',
      ['CBC', 'LDH', 'フェリチン', '可溶性IL-2R'],
      '腫瘍熱を考慮',
    )
    addMany('additional', ['CT', 'PET-CT'], '悪性腫瘍の検索')
    add('consult', '血液内科相談', 'リンパ腫や血液悪性腫瘍を検討')
  }

  if (nonInfectiousLabels.has('TAFRO症候群')) {
    addMany(
      'priority',
      ['血小板', '腎機能', 'CRP', 'アルブミン'],
      'TAFRO症候群を考慮',
    )
    addMany(
      'additional',
      ['CT', '骨髄検査', '臓器腫大評価'],
      'TAFRO症候群の追加評価',
    )
  }

  return ['priority', 'additional', 'consult'].reduce(
    (acc, section) => ({
      ...acc,
      [section]: [...tests.values()]
        .filter((item) => item.section === section)
        .map((item) => ({
          name: item.name,
          reason: [...item.reasons].join('、'),
        })),
    }),
    {},
  )
}

function buildDiagnosticSummary({
  form,
  step0Result,
  step1Result,
  respiratoryResult,
  urinaryResult,
  abdominalResult,
  skinResult,
  boneJointResult,
  centralNervousResult,
  bloodstreamResult,
  backPainResult,
  neckPainResult,
  noLocalizingResult,
  nonInfectiousResult,
  testRecommendationResult,
}) {
  const diseaseMap = new Map()
  const genericLabels = new Set([
    '感染症を考慮',
    '感染症所見を確認',
    '非感染症も考慮',
    '判定注意',
  ])
  const criticalKeywords = [
    '感染性心内膜炎',
    '壊死性筋膜炎',
    '髄膜炎',
    '脳炎',
    '大動脈',
    '血管内リンパ腫',
    '敗血症',
    '重症感染症',
    '黄色ブドウ球菌菌血症',
    'Candida血症',
    '深部感染巣',
  ]
  const toneWeight = { danger: 4, caution: 2, brady: 1, info: 1, neutral: 0, clear: 0 }

  const upsertDisease = ({ name, tone = 'info', reasons = [], tests = [], misses = [] }) => {
    if (!name || genericLabels.has(name)) return
    const current =
      diseaseMap.get(name) ||
      {
        name,
        tone,
        reasons: new Set(),
        nextActions: new Set(),
        misses: new Set(),
        score: 0,
      }
    normalizeList(reasons).forEach((reason) => current.reasons.add(reason))
    normalizeList(tests).forEach((test) => current.nextActions.add(test))
    normalizeList(misses).forEach((miss) => current.misses.add(miss))
    if ((toneWeight[tone] || 0) > (toneWeight[current.tone] || 0)) current.tone = tone
    current.score += (toneWeight[tone] || 0) + normalizeList(reasons).length
    diseaseMap.set(name, current)
  }

  const addCards = (cards) => {
    cards.forEach((card) => {
      const name = normalizeDiseaseName(card.label || card.title)
      const reasons = normalizeList(card.reasons || card.items || card.evidence)
      const tests = normalizeList(card.tests || card.recommendedTests)
      const nextActions = tests.length ? tests : getDefaultTests(card.label)
      const misses = normalizeList(card.misses || card.message)
      upsertDisease({
        name,
        tone: card.tone,
        reasons,
        tests: nextActions,
        misses,
      })
    })
  }

  if (step0Result.hasEmergency) {
    upsertDisease({
      name: '敗血症・重症感染症',
      tone: 'danger',
      reasons: ['Step0で緊急サインあり', step0Result.message],
      tests: ['血液培養2セット', '乳酸', '臓器障害評価', '感染巣検索'],
      misses: step0Result.considerations,
    })
  }

  addCards(step1Result.cards)
  addCards(respiratoryResult.cards)
  addCards(urinaryResult.cards)
  addCards(abdominalResult.cards)
  addCards(skinResult.cards)
  addCards(boneJointResult.cards)
  addCards(centralNervousResult.cards)
  addCards(bloodstreamResult.cards)
  addCards(backPainResult.cards)
  addCards(neckPainResult.cards)
  addCards(noLocalizingResult.cards)
  addCards(nonInfectiousResult.cards)

  const diseases = [...diseaseMap.values()].map((item) => {
    const isCritical = criticalKeywords.some((keyword) => item.name.includes(keyword))
    const score = item.score + (isCritical ? 3 : 0) + Math.min(item.reasons.size, 4)
    return {
      name: item.name,
      tone: item.tone,
      category: isCritical ? '見逃し注意' : '鑑別',
      matchedFindings: [...item.reasons].length
        ? [...item.reasons].map((reason) => `✓${reason}`)
        : ['✓入力所見から検討'],
      reasons: [...item.reasons].length ? [...item.reasons] : ['入力所見から検討'],
      nextActions: [...item.nextActions].length
        ? [...item.nextActions].slice(0, 6)
        : ['必要に応じて追加検査を検討'],
      score,
      matchCount: Math.max(1, item.reasons.size),
      isCritical,
    }
  })

  const ranking = diseases.sort((a, b) => b.score - a.score).slice(0, 12)
  const mustNotMiss = ranking.filter((item) => item.isCritical).slice(0, 8)
  const redFlags = buildRedFlags(form, ranking, step0Result)
  const inputWarnings = buildInputWarnings({
    form,
    ranking,
    step0Result,
    bloodstreamResult,
    centralNervousResult,
    backPainResult,
    noLocalizingResult,
  })
  const notYetExcluded = buildNotYetExcluded(form, ranking)
  const clinicalPearl = buildClinicalPearl(form)
  const todayChecklist = dedupeList([
    ...testRecommendationResult.priority.map((item) => item.name),
    ...testRecommendationResult.additional
      .map((item) => item.name)
      .filter((name) =>
        [
          '胸腹部CT',
          '腹部CT',
          '胸部CT',
          '心エコー',
          '経胸壁心エコー',
          '脊椎MRI',
          '髄液検査',
          '関節穿刺',
          '可溶性IL-2R',
          'PET-CT',
        ].includes(name),
      ),
    ...testRecommendationResult.consult.map((item) => item.name),
  ]).slice(0, 18)

  return {
    redFlags,
    inputWarnings,
    mustNotMiss,
    ranking,
    notYetExcluded,
    clinicalPearl,
    todayChecklist: todayChecklist.length ? todayChecklist : ['Step0〜Step4の入力を追加してください'],
  }
}

function buildRedFlags(form, ranking, step0Result) {
  const flags = new Set()
  const names = ranking.map((item) => item.name).join('、')
  if (step0Result.hasEmergency) flags.add('敗血症')
  if (names.includes('感染性心内膜炎') || form.bsiHeartMurmur || form.bsiProstheticValve) {
    flags.add('感染性心内膜炎')
  }
  if (names.includes('髄膜炎') || form.cnsNeckStiffness || form.meningealSigns) {
    flags.add('髄膜炎')
  }
  if (
    names.includes('壊死性筋膜炎') ||
    form.severeSkinPain ||
    form.painOutOfProportion ||
    form.skinNecrosis
  ) {
    flags.add('壊死性筋膜炎')
  }
  if (names.includes('大動脈') || form.thoracodorsalPain || form.severeBackPain) {
    flags.add('大動脈解離')
  }
  if (names.includes('血管内リンパ腫') || (form.nonInfLdhHigh && form.noClearInfectionFocus)) {
    flags.add('血管内リンパ腫')
  }
  return [...flags]
}

function buildInputWarnings({
  form,
  ranking,
  step0Result,
  bloodstreamResult,
  centralNervousResult,
  backPainResult,
  noLocalizingResult,
}) {
  const warnings = []
  const names = ranking.map((item) => item.name).join('、')
  const spo2 = Number(form.spo2)
  const temperature = Number(form.temperature)
  const wbc = Number(form.wbc)
  const crp = Number(form.crp)
  const bloodCulturePositive =
    form.bsiPositiveBloodCulture ||
    form.positiveBloodCulture ||
    form.unknownPositiveBloodCulture ||
    form.step2Symptoms.includes('symptomPositiveBloodCulture')
  const alteredMentalStatus =
    form.emergencySigns.includes('alteredMentalStatus') ||
    form.cnsAlteredMentalStatus ||
    form.neckAlteredMentalStatus

  if (spo2 > 0 && spo2 < 90 && !form.respDyspnea && !form.dyspnea && !form.nonInfDyspnea) {
    warnings.push('SpO2 90%未満ですが、呼吸困難が未入力です。')
  }
  if (
    temperature >= 38.5 &&
    (!crp || crp < 1) &&
    (!wbc || (wbc >= 3500 && wbc <= 9000))
  ) {
    warnings.push('38.5℃以上ですが、CRP・WBCが正常域または未入力です。')
  }
  if (
    bloodCulturePositive &&
    !names.includes('菌血症') &&
    !names.includes('感染性心内膜炎') &&
    bloodstreamResult.cards.length === 0
  ) {
    warnings.push('血液培養陽性ですが、菌血症・感染性心内膜炎候補が表示されていません。')
  }
  if (
    alteredMentalStatus &&
    !step0Result.hasEmergency &&
    !names.includes('重症感染症') &&
    centralNervousResult.cards.length === 0
  ) {
    warnings.push('意識障害がありますが、重症感染症や中枢神経感染の候補が乏しい状態です。')
  }
  if ((form.thoracodorsalPain || form.severeBackPain) && !names.includes('大動脈')) {
    warnings.push('胸背部痛がありますが、大動脈疾患候補が表示されていません。')
  }
  if (
    (form.backPainChills || form.unknownBackPain || form.bsiBackPain || form.cnsBackPain) &&
    temperature >= 38 &&
    !names.includes('化膿性脊椎炎') &&
    backPainResult.cards.length === 0
  ) {
    warnings.push('腰背部痛＋発熱がありますが、化膿性脊椎炎候補が表示されていません。')
  }
  if (form.unknownLdhHigh && noLocalizingResult.cards.length === 0) {
    warnings.push('LDH高値がありますが、感染巣不明・悪性腫瘍系の評価が乏しい状態です。')
  }
  return warnings
}

function buildNotYetExcluded(form, ranking) {
  const names = ranking.map((item) => item.name).join('、')
  const candidates = [
    ['感染性心内膜炎', form.bsiChills || form.bsiPositiveBloodCulture || form.bsiProstheticValve || form.bsiPacemaker || form.unknownChills],
    ['大動脈解離', form.thoracodorsalPain || form.severeBackPain],
    ['髄膜炎', form.cnsHeadache || form.cnsNeckStiffness || form.cnsAlteredMentalStatus || form.neckHeadache],
    ['壊死性筋膜炎', form.severeSkinPain || form.painOutOfProportion || form.skinBlister || form.skinNecrosis],
    ['血管内リンパ腫', form.unknownLdhHigh || form.nonInfLdhHigh],
    ['化膿性脊椎炎', form.unknownBackPain || form.bsiBackPain || form.cnsBackPain || form.boneBackPain],
  ]
  return candidates
    .filter(([name, shouldCheck]) => shouldCheck && !names.includes(name))
    .map(([name]) => name)
}

function buildClinicalPearl(form) {
  if (
    form.bsiChills &&
    form.bsiStaphAureus
  ) {
    return {
      title: '黄色ブドウ球菌菌血症',
      message: '黄色ブドウ球菌菌血症では感染性心内膜炎を必ず評価してください。',
    }
  }
  if (form.unknownLdhHigh || form.nonInfLdhHigh) {
    return {
      title: 'LDH高値＋感染巣不明',
      message: '血管内リンパ腫では皮疹がなくてもランダム皮膚生検を検討してください。',
    }
  }
  if (form.cnsOlderAdult && form.cnsAcuteNeckPain) {
    return {
      title: '高齢＋急性頸部痛',
      message: 'Crowned dens syndromeではMRIではなくCTが有用です。',
    }
  }
  if (form.kneeJointPain && form.feverOver38) {
    return {
      title: '膝関節炎＋38℃以上',
      message: '偽痛風でも高熱になります。化膿性関節炎との鑑別が重要です。',
    }
  }
  if (
    form.unknownBackPain ||
    form.bsiBackPain ||
    form.cnsBackPain ||
    form.boneBackPain ||
    form.backPainChills
  ) {
    return {
      title: '発熱＋腰背部痛',
      message: '化膿性脊椎炎ではMRIが最も重要です。',
    }
  }
  return {
    title: '総合内科の基本',
    message: '発熱・CRP高値では、感染症と非感染症を並行して考え、経時的変化で再評価してください。',
  }
}

function assessReevaluation(form) {
  const improved = form.reevalDefervesced && form.reevalInflammationImproved
  const notImproved = !improved
  const urgentReasons = collectEvidence(form, [
    ['reevalPersistentShock', 'ショック持続'],
    ['reevalLactateHigh', '乳酸高値'],
    ['reevalPersistentPositiveBloodCulture', '血液培養陽性持続'],
    ['reevalDrainableAbscess', 'ドレナージ未実施の膿瘍'],
    ['reevalNecFasciitisConcern', '壊死性筋膜炎疑い'],
    ['reevalIeConcern', 'IE疑い'],
  ])
  if (form.emergencySigns.includes('shock')) urgentReasons.push('Step0：ショック')
  if (form.emergencySigns.includes('alteredMentalStatus')) urgentReasons.push('Step0：意識障害')

  const cards = []

  if (urgentReasons.length > 0) {
    cards.push({
      tone: 'danger',
      label: '緊急再評価',
      title: '重症化サインを再評価してください',
      message:
        'ショック持続、乳酸高値、血液培養陽性持続、ドレナージ未実施の膿瘍、壊死性筋膜炎疑い、IE疑いがある場合は、早急な再評価を検討してください。',
      blocks: [
        { title: '該当所見', items: urgentReasons },
        {
          title: '次に行うこと',
          items: ['バイタル再評価', '乳酸・臓器障害評価', '感染巣コントロール確認', '専門科相談を検討'],
        },
      ],
    })
  }

  if (improved) {
    cards.push({
      tone: 'clear',
      label: '治療反応',
      title: '治療反応は良好と考えられます',
      message:
        '治療反応は良好と考えられます。培養結果、感染巣、抗菌薬の適正化を確認してください。',
      blocks: [
        {
          title: '根拠',
          items: ['解熱した', 'CRP/WBCが改善した'],
        },
        {
          title: '次に行うこと',
          items: ['培養結果確認', '抗菌薬のde-escalation検討', '投与期間の確認', '感染巣コントロールの確認'],
        },
      ],
    })
  }

  if (notImproved) {
    cards.push({
      tone: 'caution',
      label: '改善乏しい',
      title: '診断と治療方針を再評価してください',
      message:
        '48〜72時間で改善が乏しい場合、診断と治療方針を再評価してください。',
      blocks: [
        {
          title: '感染巣が違う可能性',
          items: ['肺炎と思っていたが胆道感染', '尿路感染と思っていたがIE', '腰背部痛を見落として化膿性脊椎炎'],
        },
        {
          title: 'ドレナージ不足',
          items: ['腹腔内膿瘍', '腸腰筋膿瘍', '皮下膿瘍', '胆道閉塞', '膿胸'],
        },
        {
          title: '耐性菌・薬剤量不足',
          items: ['ESBL', 'MRSA', '緑膿菌', 'Enterococcus', 'Candida', '腎機能調整過剰', '体重過多', '透析患者', '移行性不良部位'],
        },
      ],
    })
  }

  cards.push({
    tone:
      form.reevalFungalTbAtypicalReevaluated || form.reevalNonInfectionReevaluated
        ? 'info'
        : 'caution',
    label: '再評価',
    title: '再評価すべき感染症・非感染症',
    message:
      '改善が乏しい場合は、特殊感染症と非感染症の両方を再評価してください。',
    blocks: [
      {
        title: '特殊感染症',
        items: ['結核', '真菌症', 'PCP', '非定型感染', 'レプトスピラ', 'ブルセラ'],
      },
      {
        title: '非感染症',
        items: ['薬剤熱', '腫瘍熱', 'PMR/GCA', '偽痛風', '血管内リンパ腫', 'TAFRO', '血栓症', '大動脈疾患', '心筋炎'],
      },
    ],
  })

  cards.push({
    tone: form.reevalBloodCultureKnown ? 'info' : 'caution',
    label: '培養結果',
    title: '血液培養結果に応じて再評価してください',
    message:
      '血液培養結果は、感染巣検索、de-escalation、深部感染巣評価の起点として確認してください。',
    blocks: [
      {
        title: '血液培養陽性',
        items: ['菌種同定を確認', '感受性を確認', '感染巣検索', 'de-escalationを検討'],
      },
      {
        title: '血液培養陰性',
        items: ['感染症を否定しない', '深部感染巣、IE、結核、真菌、非感染症を再評価'],
      },
      {
        title: 'Candida / Staphylococcus aureus',
        items: [
          'Candidaでは眼科診察、カテーテル関連感染、深部感染巣を評価',
          'Staphylococcus aureusでは心エコー、血液培養陰性化確認、化膿性脊椎炎、腸腰筋膿瘍、IEを再評価',
        ],
      },
    ],
  })

  cards.push({
    tone: 'neutral',
    label: '次に行うこと',
    title: '48〜72時間後に確認したい項目',
    message:
      '治療反応、培養結果、画像、抗菌薬投与設計、感染巣コントロールを順番に確認してください。',
    blocks: [
      {
        title: 'チェックリスト',
        items: [
          '解熱とCRP/WBC改善の確認',
          '血液培養・各種培養結果の確認',
          '画像で感染巣を再検索',
          '膿瘍や閉塞があればドレナージを検討',
          '抗菌薬投与量と腎機能調整を確認',
          '培養結果に応じてde-escalationを検討',
          '非感染症、真菌、結核、非定型感染を再評価',
        ],
      },
    ],
  })

  return { cards }
}

function normalizeDiseaseName(value) {
  return String(value || '')
    .replace(/を考慮してください/g, '')
    .replace(/を考慮/g, '')
    .replace(/として緊急対応を検討/g, '')
    .trim()
}

function dedupeList(items) {
  return [...new Set(items.filter(Boolean))]
}

function collectEvidence(form, pairs) {
  return pairs
    .filter(([key]) => form[key])
    .map(([, label]) => label)
}

function assessOverall(step0Result, step1Result) {
  if (step0Result.hasEmergency) {
    return {
      tone: 'urgent',
      label: '緊急度 高',
      title: '早急な医療対応を検討してください',
      message:
        'Step0で危険サインが入力されています。重症感染症などを考慮し、優先的な再評価を検討してください。',
      actions: urgentActions,
    }
  }

  if (step1Result.suggestsInfection) {
    return {
      tone: 'caution',
      label: '感染症を考慮',
      title: '感染症らしさを踏まえて評価してください',
      message:
        '悪寒戦慄と炎症反応の入力から、感染症を考慮する状態です。感染巣検索や経過観察を検討してください。',
      actions: [
        'バイタルと全身状態を再確認する',
        '局所症状、曝露歴、検査値の推移を確認する',
        '非感染症の鑑別も併せて検討する',
      ],
    }
  }

  return {
    tone: 'stable',
    label: '評価継続',
    title: '入力所見をもとに経時的に再評価してください',
    message:
      '現時点でStep0の危険サインは未入力です。Step1の所見を追加しながら、感染症と非感染症の両方を検討してください。',
    actions: [
      '体温、心拍数、血圧、SpO2を再測定する',
      'WBC、CRP、局所症状、薬剤歴、既往歴を確認する',
      '悪化や危険サイン出現時はStep0に戻って再評価する',
    ],
  }
}

export default App
