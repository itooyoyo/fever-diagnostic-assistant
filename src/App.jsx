import { useEffect, useMemo, useState } from 'react'
import heroImg from './assets/hero.png'
import './App.css'
import {
  assessEmergencySigns,
  assessInfectionLikelihood,
  assessRespiratoryFocus,
  assessUrinaryFocus,
  assessAbdominalFocus,
  assessSkinSoftTissueFocus,
  assessBoneJointFocus,
  assessCentralNervousFocus,
  assessBloodstreamFocus,
  assessBackPainFocus,
  assessNeckPainFocus,
  assessNoLocalizingFocus,
  assessNonInfectiousFocus,
  buildTestRecommendations,
  buildDiagnosticSummary,
  assessReevaluation,
  assessOverall,
  normalizeList,
  getDefaultTests,
  respiratoryRecommendedTests,
  urgentActions,
  warningSigns,
  relativeBradycardiaDifferentials,
  crpOnlyDifferentials,
  fuoCategoryCards,
} from './lib/feverLogic.js'

const STORAGE_KEY = 'fever-diagnostic-assistant:draft'

const stepOrder = ['step0', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6']

const stepInputGuides = {
  step0:
    'まず緊急対応が必要な危険サインを確認してください。該当する項目を選択してください。',
  step1:
    '体温・バイタル・炎症反応・背景から、感染症らしさと非感染症の可能性を評価してください。',
  step2:
    '患者の症候・局所症状を選択してください。選択した症候に応じて追加質問と鑑別が表示されます。',
  step3:
    '感染症が明らかでない場合や炎症反応が遷延する場合に、非感染症の鑑別を確認してください。',
  step4:
    'ここまでの入力内容から、次に検討する検査を優先度別に表示します。',
  step5:
    '入力された所見をもとに、考慮すべき疾患・根拠・次に行うことを整理します。',
  step6:
    '初期対応後も改善しない場合、感染巣・耐性菌・非感染症を再評価してください。',
}

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
const step2CategoryOptions = [
  {
    id: 'respiratory',
    label: '呼吸器症状',
    description: '咳、痰、呼吸困難、胸痛、SpO2低下など',
    symptomIds: ['symptomRespiratory'],
  },
  {
    id: 'urinary',
    label: '尿路症状',
    description: '排尿痛、頻尿、CVA叩打痛、尿カテーテルなど',
    symptomIds: ['symptomUrinary'],
  },
  {
    id: 'abdominal',
    label: '腹痛・下痢',
    description: '腹痛、右季肋部痛、黄疸、下痢、抗菌薬使用歴など',
    symptomIds: ['symptomAbdominalPain', 'symptomDiarrhea'],
  },
  {
    id: 'skin',
    label: '皮膚軟部組織',
    description: '発赤、腫脹、熱感、強い疼痛、水疱、壊死など',
    symptomIds: ['symptomSkinFindings'],
  },
  {
    id: 'boneJoint',
    label: '骨・関節',
    description: '関節痛、腰背部痛、人工関節、胸鎖関節痛など',
    symptomIds: ['symptomJointPain', 'symptomBackPain'],
  },
  {
    id: 'cns',
    label: '中枢神経',
    description: '頭痛、項部硬直、意識障害、急性頸部痛など',
    symptomIds: ['symptomHeadache', 'symptomNeckPain'],
  },
  {
    id: 'bloodstream',
    label: '血流感染・感染性心内膜炎',
    description: '悪寒戦慄、血液培養陽性、人工弁、ペースメーカーなど',
    symptomIds: ['symptomChills', 'symptomPositiveBloodCulture'],
  },
  {
    id: 'unknown',
    label: '局所症状なし',
    description: '感染臓器不明、FUO、LDH高値、B症状など',
    symptomIds: ['symptomNoLocalizing'],
  },
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

const mainProblemOptions = [
  { id: 'fever', label: '発熱がある' },
  { id: 'crpOnly', label: 'CRP高値のみ' },
  { id: 'feverAndCrp', label: '発熱＋CRP高値' },
  { id: 'fuo', label: '原因不明発熱（FUO）' },
  { id: 'persistentInflammation', label: '炎症反応遷延' },
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

function readSavedAppState() {
  if (typeof window === 'undefined') {
    return { form: initialForm, activeStep: 'step0', restored: false }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { form: initialForm, activeStep: 'step0', restored: false }
    const parsed = JSON.parse(raw)
    return {
      form: { ...initialForm, ...(parsed.form || {}) },
      activeStep: stepOrder.includes(parsed.activeStep)
        ? parsed.activeStep
        : 'step0',
      restored: true,
    }
  } catch {
    return { form: initialForm, activeStep: 'step0', restored: false }
  }
}

function App() {
  const [initialAppState] = useState(readSavedAppState)
  const [activeStep, setActiveStep] = useState(initialAppState.activeStep)
  const [form, setForm] = useState(initialAppState.form)
  const [restoredNotice, setRestoredNotice] = useState(
    initialAppState.restored,
  )

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

  function toggleStep2Category(symptomIds) {
    setForm((current) => {
      const hasEverySymptom = symptomIds.every((id) =>
        current.step2Symptoms.includes(id),
      )
      return {
        ...current,
        step2Symptoms: hasEverySymptom
          ? current.step2Symptoms.filter((item) => !symptomIds.includes(item))
          : [...new Set([...current.step2Symptoms, ...symptomIds])],
      }
    })
  }
  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetAll() {
    const confirmed = window.confirm(
      'すべての入力内容と保存データをリセットします。よろしいですか？',
    )
    if (!confirmed) return
    window.localStorage.removeItem(STORAGE_KEY)
    setForm(initialForm)
    setActiveStep('step0')
    setRestoredNotice(false)
  }

  useEffect(() => {
    if (activeStep === 'step0' && form === initialForm && !restoredNotice) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ form, activeStep }),
    )
  }, [form, activeStep, restoredNotice])

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Dr. Ito Medical Apps</p>
          <h1>Fever &amp; CRP Clinical Navigator</h1>
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
              すべてリセット
            </button>
          </div>

          {restoredNotice && (
            <div className="restore-notice" role="status">
              前回の入力内容を復元しました
            </div>
          )}

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

          <StepInputGuide activeStep={activeStep} />

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

              <fieldset className="choice-group step2-category-panel">
                <legend>Step2A 症候カテゴリ</legend>
                <p className="field-hint">
                  まず患者の症候を選択してください。選択したカテゴリだけ詳細質問が開きます。
                </p>
                <div className="step2-category-grid">
                  {step2CategoryOptions.map((category) => {
                    const isActive = category.symptomIds.some((id) =>
                      form.step2Symptoms.includes(id),
                    )
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`category-toggle-card ${isActive ? 'active' : ''}`}
                        aria-expanded={isActive}
                        onClick={() => toggleStep2Category(category.symptomIds)}
                      >
                        <span className="category-toggle-icon">{isActive ? '▼' : '▶'}</span>
                        <span>
                          <strong>{category.label}</strong>
                          <small>{category.description}</small>
                        </span>
                      </button>
                    )
                  })}
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

          <StepNavigation activeStep={activeStep} onStepChange={setActiveStep} onReset={resetAll} />
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

function StepInputGuide({ activeStep }) {
  return (
    <details className="input-guide-card input-guide-disclosure">
      <summary>
        <span className="result-label">入力ガイド</span>
        <small>詳しく見る</small>
      </summary>
      <p>{stepInputGuides[activeStep]}</p>
    </details>
  )
}

function StepNavigation({ activeStep, onStepChange, onReset }) {
  const currentIndex = stepOrder.indexOf(activeStep)
  const previousStep = stepOrder[currentIndex - 1]
  const nextStep = stepOrder[currentIndex + 1]

  return (
    <nav className="step-bottom-nav" aria-label="ステップ移動">
      <button
        type="button"
        className="secondary-nav-button"
        disabled={!previousStep}
        onClick={() => previousStep && onStepChange(previousStep)}
      >
        戻る
      </button>
      <button type="button" className="reset-nav-button" onClick={onReset}>
        リセット
      </button>
      <button
        type="button"
        className="primary-nav-button"
        disabled={!nextStep}
        onClick={() => nextStep && onStepChange(nextStep)}
      >
        次へ
      </button>
    </nav>
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

      <details className="step-card info clinical-pearl-disclosure">
        <summary>
          <span className="result-label">Dr. Ito Clinical Pearl</span>
          <strong>{result.clinicalPearl.title}</strong>
          <small>詳しく見る</small>
        </summary>
        <p>{result.clinicalPearl.message}</p>
      </details>

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
  if (item.name === '感染性心内膜炎') {
    return <InfectiveEndocarditisDiseaseCard item={item} tone={tone} />
  }

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

function InfectiveEndocarditisDiseaseCard({ item, tone }) {
  const redFlags = [
    '人工弁、ペースメーカー、血液培養陽性、心雑音、塞栓症状がある場合は優先して評価を検討',
    '心不全、弁周囲膿瘍、大きな疣贅、反復塞栓では心臓血管外科への早期相談を検討',
    '黄色ブドウ球菌菌血症では感染性心内膜炎と転移性感染巣を必ず評価',
  ]

  const nextConfirmations = [
    '血液培養3セットを採取し、原因菌推定につなげる',
    '経胸壁心エコーを行い、必要時はTEEを検討',
    '脳梗塞、腎梗塞、脾梗塞、腸腰筋膿瘍など転移性感染巣を検索',
    '感染症科・循環器への相談を検討',
  ]

  return (
    <article className={`step-card ${tone} disease-card ie-disease-card`}>
      <div className="summary-card-heading disease-card-heading">
        <div>
          <div className="result-label">{item.category}</div>
          <h3>感染性心内膜炎</h3>
        </div>
        <strong className="match-count">{item.matchCount}項目一致</strong>
      </div>

      <section className="disease-card-section red-flag-section">
        <h4>Red Flag</h4>
        <ul>
          {redFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      </section>

      <section className="disease-card-section">
        <h4>なぜ考えるか</h4>
        <ul>
          {item.matchedFindings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      </section>

      <section className="disease-card-section">
        <h4>次に確認すること</h4>
        <ul>
          {[...item.nextActions, ...nextConfirmations].map((action, index) => (
            <li key={`${action}-${index}`}>{action}</li>
          ))}
        </ul>
      </section>

      <details className="disease-card-details">
        <summary>
          <span>詳しく見る</span>
          <small>症状、塞栓、初期対応、治療方針</small>
        </summary>

        <div className="disease-detail-grid">
          <section>
            <h4>典型的な症状</h4>
            <ul>
              <li>発熱（ほぼ全例）</li>
              <li>悪寒戦慄（約50％）</li>
              <li>易疲労感（約45％）</li>
              <li>食欲不振・体重減少（約30％）</li>
              <li>弁破壊による心不全症状</li>
            </ul>
          </section>

          <section>
            <h4>塞栓症状</h4>
            <ul>
              <li>脳梗塞、TIA</li>
              <li>腎梗塞、脾梗塞</li>
              <li>腸腰筋膿瘍</li>
              <li>関節痛、筋肉痛</li>
              <li>糸球体腎炎</li>
            </ul>
            <p className="clinical-pearl-mini">
              感染巣不明の発熱では、塞栓症状が診断の手掛かりになることがあります。
            </p>
          </section>

          <section>
            <h4>身体所見</h4>
            <ul>
              <li>心雑音：約80％（ペースメーカーリード感染では聴取しにくい場合があります）</li>
              <li>肝脾腫：約20％</li>
              <li>点状出血：約30％</li>
              <li>Janeway病変（手掌・足底の無痛性紅斑）</li>
            </ul>
          </section>

          <section>
            <h4>初期対応</h4>
            <ul>
              <li>血液培養3セット</li>
              <li>経胸壁心エコー</li>
              <li>必要時TEE</li>
              <li>転移性感染巣検索</li>
              <li>感染症科・循環器相談を検討</li>
            </ul>
          </section>

          <section>
            <h4>治療の考え方</h4>
            <p>
              培養採取後に経験的抗菌薬を検討します。原因菌、人工弁、市中・院内発症、腎機能、アレルギー等で選択は変わるため、培養結果に応じてde-escalationを検討してください。
            </p>
            <p>
              適切な抗菌薬投与にもかかわらず感染制御困難、心不全、弁周囲膿瘍、大きな疣贅、反復塞栓などがある場合は、心臓血管外科への早期コンサルトを検討してください。
            </p>
          </section>

          <section>
            <h4>Clinical Pearl</h4>
            <ul>
              <li>黄色ブドウ球菌菌血症では感染性心内膜炎を必ず評価する。</li>
              <li>熱源が別に見えても転移性感染巣を検索する。</li>
              <li>ペースメーカー感染では心雑音を欠くことがある。</li>
            </ul>
          </section>
        </div>
      </details>
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


export default App
