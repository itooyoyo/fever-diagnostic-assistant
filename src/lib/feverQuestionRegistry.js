import { CANDIDATE_STATUS } from './candidateRegistry.js'
import { ADAPTIVE_DOMAINS } from './feverAdaptiveContext.js'

export const PRIORITY_CLASS = Object.freeze({
  CRITICAL: 'CRITICAL',
  CURRENT_CONTEXT_HIGH: 'CURRENT_CONTEXT_HIGH',
  DISCRIMINATION_HIGH: 'DISCRIMINATION_HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
})

export const RELEVANCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'NONE',
})

export const ANSWER_OPTIONS = Object.freeze([
  { value: 'present', label: 'あり' },
  { value: 'absent', label: 'なし' },
  { value: 'unknown', label: '不明' },
  { value: 'not_assessed', label: '未評価' },
  { value: 'indeterminate', label: '判定困難' },
])

export const ADAPTIVE_QUESTION_REGISTRY = [
  q('q_resp_cough', '咳がありますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'symptomDomains.respiratory.cough', ['pneumonia', 'pulmonary_tuberculosis'], PRIORITY_CLASS.CURRENT_CONTEXT_HIGH),
  q('q_resp_sputum', '痰がありますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'symptomDomains.respiratory.sputum', ['pneumonia', 'copd_exacerbation'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_resp_dyspnea', '呼吸困難や酸素需要がありますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'symptomDomains.respiratory.dyspnea', ['pneumonia', 'pcp', 'noninfectious_lung_disease'], PRIORITY_CLASS.CRITICAL, 'oxygenation'),
  q('q_resp_chest_pain', '胸痛を伴いますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'symptomDomains.respiratory.chestPain', ['pleuritis', 'dvt_pe'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_resp_immunosuppression', '免疫抑制や生物学的製剤使用がありますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'hostFactors.immunosuppression', ['pcp', 'fungal_pneumonia', 'pulmonary_tuberculosis'], PRIORITY_CLASS.CRITICAL),
  q('q_resp_aspiration', '誤嚥を疑う経過がありますか？', ADAPTIVE_DOMAINS.RESPIRATORY, 'symptomDomains.respiratory.aspirationContext', ['pneumonia'], PRIORITY_CLASS.MODERATE),

  q('q_uri_dysuria', '排尿痛がありますか？', ADAPTIVE_DOMAINS.URINARY, 'symptomDomains.urinary.dysuria', ['cystitis', 'pyelonephritis'], PRIORITY_CLASS.CURRENT_CONTEXT_HIGH),
  q('q_uri_frequency', '頻尿や尿混濁がありますか？', ADAPTIVE_DOMAINS.URINARY, 'symptomDomains.urinary.frequency', ['cystitis'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_uri_flank', '側腹部痛またはCVA叩打痛がありますか？', ADAPTIVE_DOMAINS.URINARY, 'physicalFindings.cvaTenderness', ['pyelonephritis', 'emphysematous_pyelonephritis'], PRIORITY_CLASS.CRITICAL),
  q('q_uri_catheter', '尿道カテーテルや尿路閉塞を疑う状況がありますか？', ADAPTIVE_DOMAINS.URINARY, 'devicesProcedures.urinaryCatheter', ['cauti', 'complicated_uti'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_uri_prostate', '前立腺症状、会陰部痛、尿閉がありますか？', ADAPTIVE_DOMAINS.URINARY, 'symptomDomains.urinary.prostateSymptoms', ['acute_prostatitis'], PRIORITY_CLASS.DISCRIMINATION_HIGH),

  q('q_abd_ruq', '右季肋部痛がありますか？', ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY, 'symptomDomains.abdominal.rightUpperQuadrantPain', ['acute_cholangitis', 'acute_cholecystitis'], PRIORITY_CLASS.CRITICAL),
  q('q_abd_jaundice', '黄疸または肝胆道系酵素上昇がありますか？', ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY, 'physicalFindings.jaundice', ['acute_cholangitis'], PRIORITY_CLASS.CRITICAL),
  q('q_abd_diarrhea', '下痢、血便、水様便がありますか？', ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY, 'symptomDomains.abdominal.diarrhea', ['cdi'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_abd_antibiotics', '最近3か月以内の抗菌薬使用がありますか？', ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY, 'medications.recentAntibiotics', ['cdi'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_abd_surgery_immune', '腹部手術歴または免疫抑制がありますか？', ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY, 'devicesProcedures.abdominalSurgeryHistory', ['intra_abdominal_abscess'], PRIORITY_CLASS.MODERATE),

  q('q_skin_redness_swelling', '発赤、腫脹、熱感がありますか？', ADAPTIVE_DOMAINS.SKIN_SOFT_TISSUE, 'symptomDomains.skinSoftTissue.redness', ['cellulitis'], PRIORITY_CLASS.CURRENT_CONTEXT_HIGH),
  q('q_skin_pain_out_of_proportion', '皮膚所見に比して疼痛が強いですか？', ADAPTIVE_DOMAINS.SKIN_SOFT_TISSUE, 'symptomDomains.skinSoftTissue.painOutOfProportion', ['necrotizing_fasciitis'], PRIORITY_CLASS.CRITICAL, 'necrotizing-fasciitis-safety'),
  q('q_skin_blister_necrosis', '水疱、皮膚壊死、低血圧、多臓器障害がありますか？', ADAPTIVE_DOMAINS.SKIN_SOFT_TISSUE, 'physicalFindings.skinNecrosis', ['necrotizing_fasciitis', 'ssss_tss'], PRIORITY_CLASS.CRITICAL),
  q('q_skin_wound_foot_ulcer', '糖尿病足、褥瘡、創傷、術後創がありますか？', ADAPTIVE_DOMAINS.SKIN_SOFT_TISSUE, 'physicalFindings.diabeticFoot', ['diabetic_foot_infection', 'pressure_ulcer_infection'], PRIORITY_CLASS.DISCRIMINATION_HIGH),

  q('q_neuro_altered', '意識変容、痙攣、神経巣症状がありますか？', ADAPTIVE_DOMAINS.NEUROLOGIC, 'symptomDomains.neurologic.alteredMentalStatus', ['meningitis', 'encephalitis'], PRIORITY_CLASS.CRITICAL),
  q('q_neuro_headache', '頭痛がありますか？', ADAPTIVE_DOMAINS.NEUROLOGIC, 'symptomDomains.neurologic.headache', ['meningitis'], PRIORITY_CLASS.CURRENT_CONTEXT_HIGH),
  q('q_neuro_neck_stiffness', '項部硬直または髄膜刺激徴候がありますか？', ADAPTIVE_DOMAINS.NEUROLOGIC, 'physicalFindings.neckStiffness', ['meningitis'], PRIORITY_CLASS.CRITICAL),
  q('q_neck_acute_rotation', '急性頸部痛や頸部回旋制限がありますか？', ADAPTIVE_DOMAINS.NECK, 'symptomDomains.neck.acutePain', ['crowned_dens_syndrome'], PRIORITY_CLASS.DISCRIMINATION_HIGH),

  q('q_bsi_positive_culture', '血液培養陽性または悪寒戦慄がありますか？', ADAPTIVE_DOMAINS.BLOODSTREAM, 'infectionPatterns.positiveBloodCulture', ['bacteremia', 'infective_endocarditis'], PRIORITY_CLASS.CRITICAL),
  q('q_bsi_device_valve', '人工弁、ペースメーカー、透析、CVカテーテルがありますか？', ADAPTIVE_DOMAINS.BLOODSTREAM, 'devicesProcedures.prostheticValve', ['infective_endocarditis', 'device_related_infection'], PRIORITY_CLASS.CRITICAL),
  q('q_bsi_murmur_emboli', '心雑音、塞栓症状、皮膚・眼症状がありますか？', ADAPTIVE_DOMAINS.BLOODSTREAM, 'physicalFindings.heartMurmur', ['infective_endocarditis'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_bsi_staph_candida', 'S. aureusまたはCandidaが検出されていますか？', ADAPTIVE_DOMAINS.BLOODSTREAM, 'infectionPatterns.bloodCultureStaphAureus', ['staph_aureus_bacteremia', 'candidemia'], PRIORITY_CLASS.CRITICAL),

  q('q_joint_swelling_rom', '関節腫脹または可動域制限がありますか？', ADAPTIVE_DOMAINS.BONE_JOINT, 'symptomDomains.boneJoint.jointSwelling', ['septic_arthritis'], PRIORITY_CLASS.CRITICAL),
  q('q_joint_knee_poly', '膝関節痛または多関節痛がありますか？', ADAPTIVE_DOMAINS.BONE_JOINT, 'symptomDomains.boneJoint.kneeJointPain', ['cppd'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_joint_prosthetic', '人工関節、手術後、免疫抑制がありますか？', ADAPTIVE_DOMAINS.BONE_JOINT, 'devicesProcedures.prostheticJoint', ['septic_arthritis', 'device_related_infection'], PRIORITY_CLASS.DISCRIMINATION_HIGH),

  q('q_back_local_pain', '強い腰背部痛または局在する脊椎痛がありますか？', ADAPTIVE_DOMAINS.BACK_SPINE, 'symptomDomains.backSpine.backPain', ['vertebral_osteomyelitis', 'iliopsoas_abscess', 'aortic_disease'], PRIORITY_CLASS.CRITICAL),
  q('q_back_neuro_mobility', '歩行困難、体動困難、神経症状がありますか？', ADAPTIVE_DOMAINS.BACK_SPINE, 'symptomDomains.backSpine.walkingDifficulty', ['vertebral_osteomyelitis'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_back_bacteremia_context', '菌血症、透析、人工弁などの背景がありますか？', ADAPTIVE_DOMAINS.BACK_SPINE, 'infectionPatterns.positiveBloodCulture', ['vertebral_osteomyelitis', 'infective_endocarditis'], PRIORITY_CLASS.CRITICAL),

  q('q_sys_drug', '最近開始した薬剤や抗菌薬使用中ですか？', ADAPTIVE_DOMAINS.NON_INFECTIOUS, 'medications.recentDrugStart', ['drug_fever'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_sys_bsymptom_ldh', '夜間発汗、体重減少、LDH高値がありますか？', ADAPTIVE_DOMAINS.SYSTEMIC_NO_FOCUS, 'physicalFindings.ldhHigh', ['tumor_fever', 'intravascular_lymphoma'], PRIORITY_CLASS.CRITICAL),
  q('q_sys_pmr_gca', '肩・大腿痛または側頭動脈圧痛がありますか？', ADAPTIVE_DOMAINS.NON_INFECTIOUS, 'symptomDomains.constitutional.shoulderThighPain', ['pmr', 'pmr_gca'], PRIORITY_CLASS.DISCRIMINATION_HIGH),
  q('q_sys_thrombosis', '下肢腫脹、胸痛、呼吸困難がありますか？', ADAPTIVE_DOMAINS.NON_INFECTIOUS, 'physicalFindings.legSwelling', ['dvt_pe'], PRIORITY_CLASS.MODERATE),

  q('q_travel_recent', '最近、海外への渡航・滞在がありましたか？', ADAPTIVE_DOMAINS.INTERNATIONAL_TRAVEL, 'exposures.internationalTravel.state', ['malaria', 'dengue', 'chikungunya'], PRIORITY_CLASS.DISCRIMINATION_HIGH, 'travel-screen', CANDIDATE_STATUS.FUTURE_PHASE),
  q('q_travel_region_timing', 'どの国・地域に、いつ滞在しましたか？', ADAPTIVE_DOMAINS.INTERNATIONAL_TRAVEL, 'exposures.internationalTravel.regionClassifications.tropicalSubtropical', ['malaria', 'dengue', 'chikungunya'], PRIORITY_CLASS.DISCRIMINATION_HIGH, 'region-classification-not-raw-country', CANDIDATE_STATUS.FUTURE_PHASE),
  q('q_travel_chills_course', '悪寒戦慄や発熱経過にマラリアを疑う要素がありますか？', ADAPTIVE_DOMAINS.INTERNATIONAL_TRAVEL, 'infectionPatterns.chills', ['malaria'], PRIORITY_CLASS.CRITICAL, 'malaria-testing-required', CANDIDATE_STATUS.FUTURE_PHASE),
  q('q_travel_headache_rash_joint', '頭痛、発疹、強い関節痛がありますか？', ADAPTIVE_DOMAINS.INTERNATIONAL_TRAVEL, 'symptomDomains.neurologic.headache', ['dengue', 'chikungunya'], PRIORITY_CLASS.DISCRIMINATION_HIGH, null, CANDIDATE_STATUS.FUTURE_PHASE),

  q('q_exp_outdoor', '最近、山林・草むら・畑などで屋外活動がありましたか？', ADAPTIVE_DOMAINS.EXPOSURE, 'exposures.outdoorExposure', ['sfts', 'japanese_spotted_fever', 'scrub_typhus'], PRIORITY_CLASS.MODERATE, 'tick-screen', CANDIDATE_STATUS.FUTURE_PHASE),
  q('q_exp_tick_bite', 'マダニに刺された可能性がありますか？', ADAPTIVE_DOMAINS.EXPOSURE, 'exposures.knownTickBite', ['sfts', 'japanese_spotted_fever', 'scrub_typhus'], PRIORITY_CLASS.LOW, 'tick-screen', CANDIDATE_STATUS.FUTURE_PHASE),
  q('q_exp_eschar', '刺し口や黒い痂皮がありますか？', ADAPTIVE_DOMAINS.EXPOSURE, 'exposures.eschar', ['japanese_spotted_fever', 'scrub_typhus'], PRIORITY_CLASS.LOW, 'tick-screen', CANDIDATE_STATUS.FUTURE_PHASE),
]

function q(id, label, domain, findingId, sourceCandidates, priorityClass, safetyRole = null, candidateStatus = CANDIDATE_STATUS.ACTIVE) {
  return {
    id,
    label,
    domain,
    findingId,
    answerType: 'findingState',
    options: ANSWER_OPTIONS,
    sourceCandidates,
    priorityClass,
    contextRelevance: 'derived',
    activationRequirements: { domains: [domain], candidateStatus },
    safetyRole,
    legacyDependencies: [],
  }
}
