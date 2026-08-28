export const CANDIDATE_STATUS = Object.freeze({
  ACTIVE: 'active',
  FUTURE_PHASE: 'futurePhase',
})

export const CANDIDATE_TIERS = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MODERATE: 'moderate',
  SUPPORTING: 'supporting',
})

const sharedSafetyNotes = {
  fever: '発熱がないことだけで感染症候補から除外しない。',
  inflammation: 'CRP低値またはWBC正常だけで重要感染症を除外しない。',
  travel:
    '渡航地域と帰国時期を確認せず海外渡航なしと推定しない。unknownをnegativeへ変換しない。',
  malaria:
    '周期熱がない、現在無熱、CRP低値、WBC正常、初回血液塗抹陰性、渡航地域未確認、帰国時期未確認だけでマラリアを除外しない。',
  dengue:
    '発疹なし、血小板正常、現在無熱、初期IgM陰性、典型症状不足だけでデングを除外しない。検査時期を無視した陰性判定を避ける。',
  tick:
    '刺し口は不明瞭なことがあり、無熱でも除外しない。低Na血症・血小板減少を伴う場合はマダニ媒介感染症も再考する。',
}

export const CANDIDATE_REGISTRY = [
  candidate('pneumonia', '肺炎', 'respiratory', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.respiratory.cough', 'symptomDomains.respiratory.sputum', 'vitals.lowSpo2', 'physicalFindings.respiratoryImagingAbnormality'],
    suggestedTests: ['胸部X線', '胸部CT', '喀痰グラム染色・培養', '血液培養2セット'],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),
  candidate('copd_exacerbation', 'COPD増悪', 'respiratory', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['hostFactors.copdHistory', 'symptomDomains.respiratory.cough', 'symptomDomains.respiratory.sputum', 'symptomDomains.respiratory.dyspnea'],
    suggestedTests: ['胸部X線', 'SpO2/酸素需要評価', '血液ガスを検討'],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),
  candidate('pleuritis', '胸膜炎', 'respiratory', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.respiratory.chestPain'],
    suggestedTests: ['胸部X線', '胸部CT', '胸水評価'],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),
  candidate('pulmonary_tuberculosis', '肺結核', 'respiratory', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.respiratory.cough', 'hostFactors.immunosuppression', 'medications.biologicsUse'],
    doNotExclude: ['発熱なし', '咳なし', 'CRP低値'],
    suggestedTests: ['胸部X線/CT', '抗酸菌検査', '喀痰検査'],
    safetyNotes: [sharedSafetyNotes.fever, sharedSafetyNotes.inflammation],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),
  candidate('pcp', 'ニューモシスチス肺炎（PCP）', 'respiratory', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['hostFactors.immunosuppression', 'symptomDomains.respiratory.dyspnea', 'vitals.lowSpo2'],
    suggestedTests: ['胸部CT', 'β-Dグルカン', 'SpO2/酸素需要評価'],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),
  candidate('fungal_pneumonia', '真菌症', 'respiratory', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['hostFactors.immunosuppression', 'medications.biologicsUse'],
    suggestedTests: ['胸部CT', 'β-Dグルカン', '真菌関連検査'],
    legacyDependencies: ['assessRespiratoryFocus', 'assessReevaluation'],
  }),
  candidate('noninfectious_lung_disease', '薬剤性肺炎・膠原病関連肺疾患', 'respiratory', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.respiratory.dyspnea', 'vitals.lowSpo2', 'physicalFindings.respiratoryImagingAbnormality'],
    suggestedTests: ['胸部CT', '薬剤歴確認', '膠原病関連検査'],
    legacyDependencies: ['assessRespiratoryFocus'],
  }),

  candidate('cystitis', '膀胱炎', 'urinary', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.urinary.dysuria', 'symptomDomains.urinary.frequency', 'symptomDomains.urinary.cloudyUrine'],
    weakContradictions: ['発熱を伴う場合は上部尿路感染や前立腺炎も評価'],
    suggestedTests: ['尿定性', '尿沈渣', '尿培養'],
    legacyDependencies: ['assessUrinaryFocus'],
  }),
  candidate('pyelonephritis', '腎盂腎炎', 'urinary', CANDIDATE_TIERS.HIGH, {
    majorCandidate: true,
    supportingFindings: ['physicalFindings.cvaTenderness', 'symptomDomains.backSpine.backPain', 'infectionPatterns.chills', 'symptomDomains.abdominal.nauseaVomiting'],
    suggestedTests: ['尿検査', '尿培養', '血液培養2セット', '腹部エコー/CT'],
    legacyDependencies: ['assessUrinaryFocus', 'assessBackPainFocus'],
  }),
  candidate('acute_prostatitis', '急性前立腺炎', 'urinary', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.urinary.prostateSymptoms', 'symptomDomains.urinary.perinealPain', 'symptomDomains.urinary.retention'],
    suggestedTests: ['尿検査', '尿培養', '血液培養2セット'],
    legacyDependencies: ['assessUrinaryFocus'],
  }),
  candidate('cauti', 'カテーテル関連尿路感染', 'urinary', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['devicesProcedures.urinaryCatheter'],
    weakContradictions: ['無症候性細菌尿と鑑別'],
    suggestedTests: ['尿培養', '血液培養2セット', 'カテーテル評価'],
    legacyDependencies: ['assessUrinaryFocus'],
  }),
  candidate('complicated_uti', '複雑性尿路感染', 'urinary', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['hostFactors.diabetes', 'hostFactors.renalDisease', 'hostFactors.dialysis', 'hostFactors.immunosuppression', 'physicalFindings.urinaryObstructionConcern'],
    suggestedTests: ['腎機能', '腹部エコー', '腹部CT', '尿路閉塞評価'],
    legacyDependencies: ['assessUrinaryFocus'],
  }),
  candidate('emphysematous_pyelonephritis', '気腫性腎盂腎炎', 'urinary', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['hostFactors.diabetes', 'physicalFindings.cvaTenderness', 'symptomDomains.backSpine.backPain', 'infectionPatterns.chills'],
    suggestedTests: ['腹部CT', '血液培養2セット', '泌尿器科相談'],
    legacyDependencies: ['assessUrinaryFocus'],
  }),

  candidate('acute_cholangitis', '急性胆管炎', 'abdominal', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.abdominal.rightUpperQuadrantPain', 'physicalFindings.jaundice', 'physicalFindings.hepatobiliaryEnzymeElevation'],
    suggestedTests: ['血液培養2セット', '腹部エコー', '腹部CT', 'ERCP検討'],
    legacyDependencies: ['assessAbdominalFocus'],
  }),
  candidate('acute_cholecystitis', '急性胆嚢炎', 'abdominal', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.abdominal.rightUpperQuadrantPain'],
    suggestedTests: ['腹部エコー', '腹部CT'],
    legacyDependencies: ['assessAbdominalFocus'],
  }),
  candidate('diverticulitis', '憩室炎', 'abdominal', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.abdominal.pain'],
    suggestedTests: ['腹部CT', 'CBC', 'CRP'],
    legacyDependencies: ['assessAbdominalFocus'],
  }),
  candidate('appendicitis', '虫垂炎', 'abdominal', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.abdominal.pain'],
    suggestedTests: ['腹部CT', '腹部エコー', 'CBC', 'CRP'],
    safetyNotes: ['高齢者では典型的症状に乏しいことがある。'],
    legacyDependencies: ['assessAbdominalFocus'],
  }),
  candidate('intra_abdominal_abscess', '腹腔内膿瘍', 'abdominal', CANDIDATE_TIERS.HIGH, {
    majorCandidate: true,
    supportingFindings: ['infectionPatterns.chills', 'devicesProcedures.abdominalSurgeryHistory', 'hostFactors.immunosuppression'],
    suggestedTests: ['腹部造影CT', '外科相談'],
    legacyDependencies: ['assessAbdominalFocus', 'assessReevaluation'],
  }),
  candidate('cdi', 'Clostridioides difficile感染症（CDI）', 'abdominal', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.abdominal.diarrhea', 'medications.recentAntibiotics'],
    suggestedTests: ['便中毒素', 'GDH', 'NAAT/PCR'],
    legacyDependencies: ['assessAbdominalFocus'],
  }),

  candidate('cellulitis', '蜂窩織炎', 'skinSoftTissue', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.skinSoftTissue.redness', 'symptomDomains.skinSoftTissue.swelling', 'symptomDomains.skinSoftTissue.warmth'],
    suggestedTests: ['重症例で血液培養', '膿瘍疑いでエコー/CT'],
    legacyDependencies: ['assessSkinSoftTissueFocus'],
  }),
  candidate('necrotizing_fasciitis', '壊死性筋膜炎', 'skinSoftTissue', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.skinSoftTissue.severePain', 'symptomDomains.skinSoftTissue.painOutOfProportion', 'physicalFindings.skinBlister', 'physicalFindings.skinNecrosis', 'vitals.hypotension'],
    doNotExclude: ['皮膚所見が軽い'],
    suggestedTests: ['緊急外科相談', '血液培養2セット', '乳酸', '造影CT検討'],
    legacyDependencies: ['assessSkinSoftTissueFocus', 'assessEmergencySigns'],
  }),
  candidate('diabetic_foot_infection', '糖尿病足感染', 'skinSoftTissue', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['physicalFindings.diabeticFoot'],
    suggestedTests: ['創部評価', '深部感染評価', '骨髄炎評価', '画像検査'],
    legacyDependencies: ['assessSkinSoftTissueFocus'],
  }),
  candidate('pressure_ulcer_infection', '褥瘡感染', 'skinSoftTissue', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['physicalFindings.pressureUlcer'],
    suggestedTests: ['深部感染評価', '骨髄炎評価', '必要に応じて画像検査'],
    legacyDependencies: ['assessSkinSoftTissueFocus'],
  }),
  candidate('ssss_tss', 'SSSS/TSS', 'skinSoftTissue', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['physicalFindings.skinPeeling', 'physicalFindings.rash', 'vitals.hypotension', 'physicalFindings.multiOrganFailure'],
    suggestedTests: ['全身状態評価', '血液培養2セット', '臓器障害評価'],
    legacyDependencies: ['assessSkinSoftTissueFocus'],
  }),

  candidate('meningitis', '髄膜炎', 'centralNervous', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.neurologic.headache', 'physicalFindings.neckStiffness', 'symptomDomains.neurologic.alteredMentalStatus', 'physicalFindings.meningealSigns'],
    doNotExclude: ['項部硬直なし', '高齢者の非典型症状'],
    suggestedTests: ['血液培養2セット', '頭部画像の要否評価', '髄液検査'],
    legacyDependencies: ['assessCentralNervousFocus', 'assessNeckPainFocus', 'assessEmergencySigns'],
  }),
  candidate('encephalitis', '脳炎', 'centralNervous', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.neurologic.alteredMentalStatus', 'symptomDomains.neurologic.seizure', 'physicalFindings.focalNeurologicDeficit'],
    suggestedTests: ['頭部MRI/CT', '髄液検査', '脳波', 'HSVなどの評価'],
    legacyDependencies: ['assessCentralNervousFocus', 'assessNeckPainFocus'],
  }),
  candidate('crowned_dens_syndrome', 'Crowned dens syndrome', 'centralNervous', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['hostFactors.olderAdult', 'symptomDomains.neck.acutePain', 'physicalFindings.limitedNeckRotation'],
    suggestedTests: ['頸椎CT', '軸椎歯突起周囲の石灰化確認'],
    safetyNotes: ['MRIでは石灰化を評価しにくい。'],
    legacyDependencies: ['assessCentralNervousFocus', 'assessNeckPainFocus'],
  }),
  candidate('vertebral_osteomyelitis', '化膿性脊椎炎', 'boneJoint', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.backSpine.backPain', 'physicalFindings.lumbarTenderness', 'symptomDomains.backSpine.walkingDifficulty'],
    doNotExclude: ['腰背部痛の軽さ', '初期画像陰性'],
    suggestedTests: ['血液培養2セット', '脊椎MRI', '感染性心内膜炎検索'],
    legacyDependencies: ['assessBackPainFocus', 'assessBoneJointFocus', 'assessCentralNervousFocus', 'assessNeckPainFocus'],
  }),
  candidate('pmr', 'リウマチ性多発筋痛症（PMR）', 'nonInfectiousInflammation', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.constitutional.shoulderThighPain'],
    suggestedTests: ['ESR', 'CRP', 'CK', '巨細胞性動脈炎の確認'],
    legacyDependencies: ['assessCentralNervousFocus', 'assessNeckPainFocus', 'assessNoLocalizingFocus', 'assessNonInfectiousFocus'],
  }),

  candidate('bacteremia', '菌血症', 'bloodstream', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['infectionPatterns.chills', 'infectionPatterns.positiveBloodCulture'],
    suggestedTests: ['血液培養2セット以上', '感染巣検索', '臓器障害評価'],
    legacyDependencies: ['assessBloodstreamFocus', 'assessNoLocalizingFocus'],
  }),
  candidate('infective_endocarditis', '感染性心内膜炎', 'bloodstream', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['infectionPatterns.positiveBloodCulture', 'physicalFindings.heartMurmur', 'devicesProcedures.prostheticValve', 'devicesProcedures.pacemaker', 'hostFactors.dialysis'],
    doNotExclude: ['血液培養陰性', '心雑音なし'],
    suggestedTests: ['血液培養複数セット', '経胸壁心エコー', '経食道心エコー', '深部感染巣検索'],
    legacyDependencies: ['assessBloodstreamFocus', 'assessBackPainFocus', 'assessNoLocalizingFocus'],
  }),
  candidate('staph_aureus_bacteremia', '黄色ブドウ球菌菌血症', 'bloodstream', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['infectionPatterns.bloodCultureStaphAureus'],
    suggestedTests: ['心エコー', '血液培養陰性化確認', '深部感染巣検索'],
    safetyNotes: ['感染性心内膜炎や転移性感染巣を常に考慮する。'],
    legacyDependencies: ['assessBloodstreamFocus'],
  }),
  candidate('candidemia', 'Candida血症', 'bloodstream', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['infectionPatterns.bloodCultureCandida'],
    suggestedTests: ['眼科診察', 'CVカテーテル関連感染評価', '深部感染巣検索'],
    legacyDependencies: ['assessBloodstreamFocus'],
  }),
  candidate('mixed_bloodstream_infection', '混合感染', 'bloodstream', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['infectionPatterns.bloodCultureMixedGpcGnr'],
    suggestedTests: ['腹腔内感染評価', '糖尿病足評価', 'デバイス感染評価'],
    legacyDependencies: ['assessBloodstreamFocus'],
  }),
  candidate('device_related_infection', 'デバイス関連感染', 'bloodstream', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['devicesProcedures.centralVenousCatheter', 'devicesProcedures.port', 'devicesProcedures.pacemaker', 'devicesProcedures.prostheticValve', 'devicesProcedures.prostheticJoint'],
    suggestedTests: ['デバイス刺入部評価', '血液培養', '専門科相談'],
    legacyDependencies: ['assessBloodstreamFocus'],
  }),
  candidate('deep_infectious_focus', '深部感染巣', 'bloodstream', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.backSpine.backPain', 'infectionPatterns.positiveBloodCulture', 'infectionPatterns.bloodCultureStaphAureus'],
    suggestedTests: ['脊椎MRI', '造影CT', '心エコー', '血液培養フォロー'],
    legacyDependencies: ['assessBloodstreamFocus', 'assessReevaluation'],
  }),

  candidate('septic_arthritis', '化膿性関節炎', 'boneJoint', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.boneJoint.jointSwelling', 'symptomDomains.boneJoint.limitedRangeOfMotion', 'vitals.fever'],
    suggestedTests: ['関節穿刺', 'グラム染色', '細菌培養', '血液培養2セット'],
    legacyDependencies: ['assessBoneJointFocus'],
  }),
  candidate('cppd', '偽痛風（CPPD）', 'boneJoint', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['symptomDomains.boneJoint.kneeJointPain', 'symptomDomains.boneJoint.polyarthralgia', 'inflammation.highCrp'],
    suggestedTests: ['関節穿刺', '偏光顕微鏡', '関節液結晶確認', 'X線'],
    legacyDependencies: ['assessBoneJointFocus', 'assessNonInfectiousFocus'],
  }),
  candidate('sternoclavicular_arthritis', '胸鎖関節炎', 'boneJoint', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.boneJoint.sternoclavicularPain'],
    suggestedTests: ['血液培養2セット', 'CT/MRI', '膿瘍評価'],
    legacyDependencies: ['assessBoneJointFocus'],
  }),
  candidate('iliopsoas_abscess', '腸腰筋膿瘍', 'boneJoint', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.backSpine.backPain', 'infectionPatterns.positiveBloodCulture'],
    suggestedTests: ['腹部造影CT', '血液培養2セット'],
    legacyDependencies: ['assessBackPainFocus', 'assessBoneJointFocus', 'assessBloodstreamFocus'],
  }),

  candidate('aortic_disease', '大動脈疾患', 'vascular', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['symptomDomains.cardiopulmonary.thoracodorsalPain', 'physicalFindings.severePain'],
    suggestedTests: ['バイタル再評価', '造影CT', '救急・循環器評価'],
    legacyDependencies: ['assessBackPainFocus', 'assessNoLocalizingFocus'],
  }),
  candidate('drug_fever', '薬剤熱', 'medication', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['medications.recentDrugStart', 'medications.currentAntibiotics'],
    suggestedTests: ['薬剤開始時期確認', '薬剤中止後の経過確認', '好酸球', '肝機能'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNonInfectiousFocus'],
  }),
  candidate('tumor_fever', '腫瘍熱', 'malignancy', CANDIDATE_TIERS.MODERATE, {
    supportingFindings: ['hostFactors.malignancyHistory', 'infectionPatterns.noClearFocus', 'vitals.noMarkedTachycardia'],
    suggestedTests: ['CBC', 'LDH', 'フェリチン', '可溶性IL-2R', 'CT/PET-CT'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNonInfectiousFocus'],
  }),
  candidate('intravascular_lymphoma', '血管内リンパ腫（IVL）', 'malignancy', CANDIDATE_TIERS.CRITICAL, {
    majorCandidate: true,
    supportingFindings: ['physicalFindings.ldhHigh', 'infectionPatterns.noClearFocus', 'hematology.anemia', 'hematology.thrombocytopenia'],
    doNotExclude: ['皮疹なし'],
    suggestedTests: ['LDH', '可溶性IL-2R', 'PET-CT', 'ランダム皮膚生検'],
    legacyDependencies: ['assessNoLocalizingFocus', 'assessNonInfectiousFocus'],
  }),
  candidate('pmr_gca', 'PMR/GCA', 'nonInfectiousInflammation', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.constitutional.shoulderThighPain', 'physicalFindings.temporalArteryTenderness'],
    suggestedTests: ['ESR', 'CRP', 'CK', '眼症状確認', '側頭動脈エコー'],
    legacyDependencies: ['assessNoLocalizingFocus', 'assessNonInfectiousFocus'],
  }),
  candidate('tafro', 'TAFRO症候群', 'nonInfectiousInflammation', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['hematology.thrombocytopenia', 'physicalFindings.edema', 'physicalFindings.renalDysfunction', 'physicalFindings.organomegaly'],
    suggestedTests: ['血小板', '腎機能', 'CRP', 'アルブミン', 'CT', '骨髄検査'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNoLocalizingFocus', 'assessNonInfectiousFocus'],
  }),
  candidate('dvt_pe', 'DVT/肺塞栓', 'vascular', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['physicalFindings.legSwelling', 'symptomDomains.cardiopulmonary.chestPain', 'symptomDomains.respiratory.dyspnea'],
    suggestedTests: ['D-dimer', '下肢静脈エコー', '造影CT'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNonInfectiousFocus'],
  }),
  candidate('myocarditis', '心筋炎', 'cardiac', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['symptomDomains.cardiopulmonary.chestPain', 'symptomDomains.cardiopulmonary.palpitations', 'physicalFindings.ecgAbnormality', 'physicalFindings.troponinElevation'],
    suggestedTests: ['心電図', 'トロポニン', '心エコー'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNonInfectiousFocus'],
  }),
  candidate('serotonin_syndrome', 'セロトニン症候群', 'medication', CANDIDATE_TIERS.HIGH, {
    supportingFindings: ['medications.ssriSnriUse', 'physicalFindings.ckElevation', 'physicalFindings.autonomicSymptoms', 'physicalFindings.tremor', 'physicalFindings.muscleRigidity'],
    suggestedTests: ['薬剤歴確認', 'CK', '神経筋症状評価', '自律神経症状評価'],
    legacyDependencies: ['assessInfectionLikelihood', 'assessNoLocalizingFocus', 'assessNonInfectiousFocus'],
  }),

  candidate('malaria', 'マラリア', 'travelInfection', CANDIDATE_TIERS.CRITICAL, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    majorCandidate: true,
    supportingFindings: [
      'exposures.internationalTravel.state',
      'exposures.internationalTravel.regionClassifications.malariaRiskArea',
      'exposures.internationalTravel.daysSinceReturn',
      'vitals.fever',
      'infectionPatterns.chills',
      'symptomDomains.neurologic.headache',
      'symptomDomains.constitutional.malaise',
      'hematology.thrombocytopenia',
    ],
    weakContradictions: ['典型的周期熱なし', '現在無熱', 'CRP低値', 'WBC正常', '初回血液塗抹陰性'],
    doNotExclude: ['周期熱なし', '現在無熱', 'CRP低値', 'WBC正常', '初回血液塗抹陰性', '渡航地域未確認', '帰国時期未確認'],
    suggestedTests: ['厚層血液塗抹', '薄層血液塗抹', '迅速診断検査', '必要に応じて12-24時間ごと計3セットまで塗抹再検'],
    safetyNotes: [sharedSafetyNotes.travel, sharedSafetyNotes.malaria],
    medicalMetadata: {
      presentationCategory: '渡航関連感染症',
      evidenceSources: ['CDC malaria evaluation and diagnosis 2026-06-12', 'WHO malaria fact sheet 2025-12-04', 'WHO malaria diagnostic testing'],
      repeatSmear: { intervalHours: '12-24', maxSets: 3, source: 'CDC' },
      testingRequiredBeforeExtendedQuestioning: ['malariaRiskArea with fever/chills', 'severe malaria concern', 'no immediate onsite malaria testing'],
    },
    legacyDependencies: [],
  }),
  candidate('dengue', 'デング', 'travelInfection', CANDIDATE_TIERS.HIGH, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    supportingFindings: [
      'exposures.internationalTravel.state',
      'exposures.internationalTravel.regionClassifications.dengueRiskArea',
      'vitals.fever',
      'symptomDomains.neurologic.headache',
      'physicalFindings.rash',
      'hematology.thrombocytopenia',
      'hematology.leukopenia',
      'symptomDomains.constitutional.myalgiaArthralgia',
    ],
    weakContradictions: ['発疹なし', '血小板正常', '現在無熱', '初期IgM陰性', '典型症状不足'],
    doNotExclude: ['発疹なし', '血小板正常', '現在無熱', '初期IgM陰性', '典型症状不足'],
    suggestedTests: ['発症0-7日はNAATまたはNS1抗原とIgM', '発症7日超はIgMを中心に検討', '検査時期を確認'],
    safetyNotes: [sharedSafetyNotes.travel, sharedSafetyNotes.dengue, 'マラリア評価が必要な文脈では、デング候補があってもマラリア評価を隠さない。'],
    medicalMetadata: {
      presentationCategory: '渡航関連感染症',
      evidenceSources: ['CDC dengue clinical testing guidance 2025', 'CDC Yellow Book dengue 2025', 'JIHS/NIID dengue laboratory diagnosis'],
      testTiming: {
        acuteDays: '0-7',
        acuteTests: ['NAAT + IgM', 'NS1 antigen + IgM'],
        convalescentAfterDay: 7,
        convalescentTests: ['IgM'],
      },
    },
    legacyDependencies: [],
  }),
  candidate('chikungunya', 'チクングニア', 'travelInfection', CANDIDATE_TIERS.MODERATE, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    supportingFindings: [
      'exposures.internationalTravel.state',
      'exposures.internationalTravel.regionClassifications.chikungunyaRiskArea',
      'vitals.fever',
      'symptomDomains.constitutional.prominentArthralgia',
      'physicalFindings.rash',
    ],
    doNotExclude: ['典型症状不足', '発疹なし'],
    suggestedTests: ['渡航地域と発症時期の確認', 'デングなど類似疾患の評価', '必要に応じて公的検査相談'],
    safetyNotes: [sharedSafetyNotes.travel, 'Phase Cでactive rankingへ接続する前に医学レビューを行う。'],
    medicalMetadata: {
      presentationCategory: '渡航関連感染症',
      evidenceSources: ['CDC chikungunya clinical signs 2024', 'CDC Yellow Book chikungunya 2026'],
    },
    legacyDependencies: [],
  }),

  candidate('sfts', 'SFTS', 'tickBorne', CANDIDATE_TIERS.CRITICAL, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    majorCandidate: true,
    supportingFindings: ['exposures.outdoorExposure', 'exposures.tickExposure', 'hematology.thrombocytopenia', 'electrolytes.hyponatremia'],
    doNotExclude: ['発熱なし', '刺し口なし', '痂皮なし', '発疹なし'],
    safetyNotes: [sharedSafetyNotes.tick],
    legacyDependencies: [],
  }),
  candidate('japanese_spotted_fever', '日本紅斑熱', 'tickBorne', CANDIDATE_TIERS.HIGH, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    supportingFindings: ['exposures.outdoorExposure', 'exposures.tickExposure', 'exposures.eschar', 'physicalFindings.rash', 'hematology.thrombocytopenia'],
    doNotExclude: ['発熱なし', '刺し口なし', '痂皮なし', '発疹なし'],
    safetyNotes: [sharedSafetyNotes.tick],
    legacyDependencies: [],
  }),
  candidate('scrub_typhus', 'つつが虫病', 'tickBorne', CANDIDATE_TIERS.HIGH, {
    status: CANDIDATE_STATUS.FUTURE_PHASE,
    supportingFindings: ['exposures.outdoorExposure', 'exposures.tickExposure', 'exposures.eschar', 'physicalFindings.rash', 'hematology.thrombocytopenia'],
    doNotExclude: ['発熱なし', '刺し口なし', '痂皮なし', '発疹なし'],
    safetyNotes: [sharedSafetyNotes.tick],
    legacyDependencies: [],
  }),
]

export const DUPLICATE_CANDIDATE_ID_MAP = Object.freeze({
  化膿性脊椎炎: 'vertebral_osteomyelitis',
  PMR: 'pmr',
  'リウマチ性多発筋痛症': 'pmr',
  '偽痛風（CPPD）': 'cppd',
  CPPD: 'cppd',
  腎盂腎炎: 'pyelonephritis',
  腸腰筋膿瘍: 'iliopsoas_abscess',
  感染性心内膜炎: 'infective_endocarditis',
})

export const RED_FLAG_DEPENDENCY_MAP = [
  redFlag('敗血症', ['emergencySigns:shock', 'emergencySigns:alteredMentalStatus', 'emergencySigns:respiratoryFailure', 'emergencySigns:lowSpo2'], ['vitals.shock', 'symptomDomains.neurologic.alteredMentalStatus', 'vitals.lowSpo2'], ['bacteremia', 'deep_infectious_focus'], ['血液培養2セット', '乳酸', '臓器障害評価'], ['救急対応を検討'], 'RedFlagBanner/buildRedFlags'),
  redFlag('感染性心内膜炎', ['bsiPositiveBloodCulture', 'bsiHeartMurmur', 'bsiProstheticValve', 'bsiPacemaker', 'bsiDialysis'], ['infectionPatterns.positiveBloodCulture', 'physicalFindings.heartMurmur', 'devicesProcedures.prostheticValve', 'devicesProcedures.pacemaker', 'hostFactors.dialysis'], ['infective_endocarditis', 'staph_aureus_bacteremia'], ['血液培養複数セット', '心エコー'], ['感染症科/循環器相談を検討'], 'RedFlagBanner/buildRedFlags'),
  redFlag('髄膜炎', ['emergencySigns:meningealSigns', 'cnsHeadache', 'cnsNeckStiffness', 'cnsAlteredMentalStatus'], ['physicalFindings.meningealSigns', 'symptomDomains.neurologic.headache', 'physicalFindings.neckStiffness'], ['meningitis', 'encephalitis'], ['血液培養2セット', '頭部画像の要否評価', '髄液検査'], ['神経/感染症相談を検討'], 'RedFlagBanner/buildRedFlags'),
  redFlag('壊死性筋膜炎', ['emergencySigns:severePain', 'emergencySigns:necrotizingSkin', 'severeSkinPain', 'painOutOfProportion', 'skinNecrosis'], ['physicalFindings.severePain', 'physicalFindings.necrotizingSkinConcern', 'symptomDomains.skinSoftTissue.painOutOfProportion'], ['necrotizing_fasciitis'], ['血液培養2セット', '乳酸', '造影CT検討'], ['緊急外科相談'], 'RedFlagBanner/buildRedFlags'),
  redFlag('大動脈解離', ['thoracodorsalPain', 'severeBackPain'], ['symptomDomains.cardiopulmonary.thoracodorsalPain', 'physicalFindings.severePain'], ['aortic_disease'], ['造影CT', 'バイタル再評価'], ['救急/循環器相談を検討'], 'RedFlagBanner/buildRedFlags'),
  redFlag('血管内リンパ腫', ['unknownLdhHigh', 'nonInfLdhHigh', 'unknownAnemia', 'unknownThrombocytopenia'], ['physicalFindings.ldhHigh', 'hematology.anemia', 'hematology.thrombocytopenia'], ['intravascular_lymphoma'], ['可溶性IL-2R', 'PET-CT', 'ランダム皮膚生検'], ['血液内科相談を検討'], 'RedFlagBanner/buildRedFlags'),
]

export const TRAVEL_INFECTION_SAFETY_INVARIANTS = [
  'free-text country names are not used directly in medical rules',
  'unknown international travel is not converted to no travel',
  'unknown return date is not converted to irrelevant travel',
  'malaria is not excluded by absent periodic fever',
  'malaria is not excluded by afebrile status at the current visit',
  'malaria is not excluded by low CRP or normal WBC alone',
  'malaria is not excluded by a single negative initial blood smear when clinical suspicion is high',
  'dengue is not excluded by absent rash',
  'dengue is not excluded by normal platelets alone',
  'dengue is not excluded by early negative IgM',
  'dengue consideration does not hide malaria evaluation when malaria testing is required',
]

export const TICK_SAFETY_INVARIANTS = [
  'fever absent does not exclude SFTS, Japanese spotted fever, or scrub typhus',
  'knownTickBite absent does not exclude tick-borne disease',
  'eschar absent does not exclude tick-borne disease',
  'rash absent does not exclude tick-borne disease',
  'thrombocytopenia is a supporting clue, not a required condition',
  'hyponatremia is a supporting clue, not a required condition',
]

export function getCandidateById(id) {
  return CANDIDATE_REGISTRY.find((item) => item.id === id) || null
}

export function getActiveCandidates() {
  return CANDIDATE_REGISTRY.filter((item) => item.status === CANDIDATE_STATUS.ACTIVE)
}

export function getFutureCandidates() {
  return CANDIDATE_REGISTRY.filter((item) => item.status === CANDIDATE_STATUS.FUTURE_PHASE)
}

function candidate(id, displayName, category, tier, config = {}) {
  return {
    id,
    displayName,
    category,
    tier,
    status: config.status || CANDIDATE_STATUS.ACTIVE,
    majorCandidate: Boolean(config.majorCandidate),
    supportingFindings: config.supportingFindings || [],
    contextualFindings: config.contextualFindings || [],
    weakContradictions: config.weakContradictions || [],
    doNotExclude: config.doNotExclude || [],
    nextQuestions: config.nextQuestions || [],
    examinationHints: config.examinationHints || [],
    suggestedTests: config.suggestedTests || [],
    safetyNotes: config.safetyNotes || [],
    medicalMetadata: config.medicalMetadata || null,
    legacyDependencies: config.legacyDependencies || [],
  }
}

function redFlag(name, sourceRawFields, normalizedFindings, candidateIds, suggestedTests, consult, currentUi) {
  return {
    name,
    sourceRawFields,
    normalizedFindings,
    candidateIds,
    suggestedTests,
    consult,
    currentUi,
  }
}

