export const FINDING_STATES = Object.freeze({
  PRESENT: 'present',
  ABSENT: 'absent',
  UNKNOWN: 'unknown',
  NOT_ASSESSED: 'not_assessed',
  INDETERMINATE: 'indeterminate',
  CONFLICTING: 'conflicting',
})

const NUMERIC_FIELDS = {
  temperature: { domain: 'vitals', key: 'bt', unit: 'C' },
  systolicBp: { domain: 'vitals', key: 'sbp', unit: 'mmHg' },
  diastolicBp: { domain: 'vitals', key: 'dbp', unit: 'mmHg' },
  heartRate: { domain: 'vitals', key: 'hr', unit: '/min' },
  respiratoryRate: { domain: 'vitals', key: 'rr', unit: '/min' },
  spo2: { domain: 'vitals', key: 'spo2', unit: '%' },
  crp: { domain: 'inflammation', key: 'crp', unit: 'mg/dL' },
  wbc: { domain: 'inflammation', key: 'wbc', unit: '/uL' },
}

const FUTURE_NUMERIC_FIELDS = {
  age: { domain: 'patient', key: 'age', unit: 'years' },
  feverDuration: { domain: 'patient', key: 'feverDuration', unit: 'days' },
  plateletCount: { domain: 'hematology', key: 'plateletCount', unit: '10^4/uL' },
  neutrophilCount: { domain: 'hematology', key: 'neutrophilCount', unit: '/uL' },
  lymphocyteCount: { domain: 'hematology', key: 'lymphocyteCount', unit: '/uL' },
  sodium: { domain: 'electrolytes', key: 'sodium', unit: 'mEq/L' },
}

const BOOLEAN_FINDING_MAP = {
  chills: ['infectionPatterns.chills'],
  localSymptoms: ['symptomDomains.localizing.present'],
  recentDrugStart: ['medications.recentDrugStart', 'nonInfectiousPatterns.drugFeverContext'],
  malignancyHistory: ['hostFactors.malignancyHistory', 'nonInfectiousPatterns.malignancyContext'],
  collagenDiseaseHistory: ['hostFactors.collagenDiseaseHistory'],
  noClearInfectionFocus: ['infectionPatterns.noClearFocus'],
  noMarkedTachycardia: ['vitals.noMarkedTachycardia'],
  betaBlocker: ['medications.betaBlocker'],
  calciumChannelBlocker: ['medications.calciumChannelBlocker'],
  avBlock: ['hostFactors.avBlock'],
  pacemaker: ['devicesProcedures.pacemaker'],
  thrombocytopenia: ['hematology.thrombocytopenia'],
  edema: ['physicalFindings.edema'],
  renalDysfunction: ['hostFactors.renalDisease', 'physicalFindings.renalDysfunction'],
  organomegaly: ['physicalFindings.organomegaly'],
  legSwelling: ['physicalFindings.legSwelling'],
  chestPain: ['symptomDomains.cardiopulmonary.chestPain'],
  dyspnea: ['symptomDomains.respiratory.dyspnea'],
  suspectedDvtPe: ['nonInfectiousPatterns.thrombosisContext'],
  palpitations: ['symptomDomains.cardiopulmonary.palpitations'],
  ecgAbnormality: ['physicalFindings.ecgAbnormality'],
  troponinElevation: ['physicalFindings.troponinElevation'],
  ssriSnriUse: ['medications.ssriSnriUse'],
  ckElevation: ['physicalFindings.ckElevation'],
  autonomicSymptoms: ['physicalFindings.autonomicSymptoms'],
  tremor: ['physicalFindings.tremor'],
  muscleRigidity: ['physicalFindings.muscleRigidity'],
  malaise: ['symptomDomains.constitutional.malaise'],
  myalgiaArthralgia: ['symptomDomains.constitutional.myalgiaArthralgia'],
  prominentArthralgia: ['symptomDomains.constitutional.prominentArthralgia'],
  leukopenia: ['hematology.leukopenia'],

  travelMalariaRiskArea: ['exposures.internationalTravel.regionClassifications.malariaRiskArea'],
  travelDengueRiskArea: ['exposures.internationalTravel.regionClassifications.dengueRiskArea'],
  travelChikungunyaRiskArea: ['exposures.internationalTravel.regionClassifications.chikungunyaRiskArea'],
  travelTropicalSubtropical: ['exposures.internationalTravel.regionClassifications.tropicalSubtropical'],
  malariaInitialSmearNegative: ['diagnosticTests.malaria.initialSmearNegative'],
  dengueEarlyIgmNegative: ['diagnosticTests.dengue.earlyIgmNegative'],

  respCough: ['symptomDomains.respiratory.cough'],
  respSputum: ['symptomDomains.respiratory.sputum'],
  respDyspnea: ['symptomDomains.respiratory.dyspnea'],
  respChestPain: ['symptomDomains.respiratory.chestPain'],
  respLowSpo2: ['vitals.lowSpo2', 'symptomDomains.respiratory.lowSpo2'],
  respImagingAbnormality: ['physicalFindings.respiratoryImagingAbnormality'],
  smokingHistory: ['hostFactors.smokingHistory'],
  copdHistory: ['hostFactors.copdHistory'],
  respImmunosuppression: ['hostFactors.immunosuppression'],
  biologicsUse: ['medications.biologicsUse'],

  urinaryDysuria: ['symptomDomains.urinary.dysuria'],
  urinaryFrequency: ['symptomDomains.urinary.frequency'],
  cloudyUrine: ['symptomDomains.urinary.cloudyUrine'],
  urinaryCvaTenderness: ['physicalFindings.cvaTenderness'],
  urinaryBackPain: ['symptomDomains.backSpine.backPain'],
  urinaryChills: ['infectionPatterns.chills'],
  nauseaVomiting: ['symptomDomains.abdominal.nauseaVomiting'],
  urinaryCatheter: ['devicesProcedures.urinaryCatheter'],
  prostateSymptoms: ['symptomDomains.urinary.prostateSymptoms'],
  perinealPain: ['symptomDomains.urinary.perinealPain'],
  urinaryRetention: ['symptomDomains.urinary.retention'],
  diabetes: ['hostFactors.diabetes'],
  ckd: ['hostFactors.renalDisease'],
  urinaryDialysis: ['hostFactors.dialysis', 'devicesProcedures.dialysis'],
  urinaryImmunosuppression: ['hostFactors.immunosuppression'],
  kidneyStoneHistory: ['hostFactors.kidneyStoneHistory'],
  suspectedUrinaryObstruction: ['physicalFindings.urinaryObstructionConcern'],

  rightUpperQuadrantPain: ['symptomDomains.abdominal.rightUpperQuadrantPain'],
  abdominalPainDetail: ['symptomDomains.abdominal.pain'],
  reboundTenderness: ['physicalFindings.peritonealSigns'],
  jaundice: ['physicalFindings.jaundice'],
  hepatobiliaryEnzymeElevation: ['physicalFindings.hepatobiliaryEnzymeElevation'],
  diarrheaDetail: ['symptomDomains.abdominal.diarrhea'],
  wateryStool: ['symptomDomains.abdominal.wateryStool'],
  bloodyStool: ['symptomDomains.abdominal.bloodyStool'],
  recentAntibiotics: ['medications.recentAntibiotics'],
  recentHospitalization: ['exposures.healthcare', 'devicesProcedures.recentHospitalization'],
  abdominalSurgeryHistory: ['devicesProcedures.abdominalSurgeryHistory'],
  abdominalChills: ['infectionPatterns.chills'],
  vomiting: ['symptomDomains.abdominal.vomiting'],
  abdominalImmunosuppression: ['hostFactors.immunosuppression'],

  skinRedness: ['symptomDomains.skinSoftTissue.redness'],
  skinSwelling: ['symptomDomains.skinSoftTissue.swelling'],
  skinWarmth: ['symptomDomains.skinSoftTissue.warmth'],
  severeSkinPain: ['symptomDomains.skinSoftTissue.severePain'],
  painOutOfProportion: ['symptomDomains.skinSoftTissue.painOutOfProportion'],
  skinBlister: ['physicalFindings.skinBlister'],
  skinNecrosis: ['physicalFindings.skinNecrosis'],
  skinPeeling: ['physicalFindings.skinPeeling'],
  skinAbscess: ['physicalFindings.skinAbscess'],
  diabeticFoot: ['physicalFindings.diabeticFoot'],
  pressureUlcer: ['physicalFindings.pressureUlcer'],
  skinTrauma: ['exposures.trauma'],
  postoperativeSkin: ['devicesProcedures.postoperative'],
  skinImmunosuppression: ['hostFactors.immunosuppression'],
  skinHypotension: ['vitals.hypotension'],
  skinMultiOrganFailure: ['physicalFindings.multiOrganFailure'],
  generalizedRash: ['physicalFindings.rash'],

  cnsHeadache: ['symptomDomains.neurologic.headache'],
  cnsNeckStiffness: ['physicalFindings.neckStiffness'],
  cnsAlteredMentalStatus: ['symptomDomains.neurologic.alteredMentalStatus'],
  cnsSeizure: ['symptomDomains.neurologic.seizure'],
  cnsAcuteNeckPain: ['symptomDomains.neck.acutePain'],
  cnsLimitedNeckRotation: ['physicalFindings.limitedNeckRotation'],
  cnsOlderAdult: ['hostFactors.olderAdult'],
  cnsImmunosuppression: ['hostFactors.immunosuppression'],
  cnsRash: ['physicalFindings.rash'],
  cnsBackPain: ['symptomDomains.backSpine.backPain'],
  cnsShoulderThighPain: ['symptomDomains.constitutional.shoulderThighPain'],
  focalNeurologicDeficit: ['physicalFindings.focalNeurologicDeficit'],
  suspectedPapilledema: ['physicalFindings.suspectedPapilledema'],

  bsiChills: ['infectionPatterns.chills'],
  bsiPositiveBloodCulture: ['infectionPatterns.positiveBloodCulture'],
  bsiGpc: ['infectionPatterns.bloodCultureGpc'],
  bsiGnr: ['infectionPatterns.bloodCultureGnr'],
  bsiMixedGpcGnr: ['infectionPatterns.bloodCultureMixedGpcGnr'],
  bsiCandida: ['infectionPatterns.bloodCultureCandida'],
  bsiStaphAureus: ['infectionPatterns.bloodCultureStaphAureus'],
  bsiStreptococcus: ['infectionPatterns.bloodCultureStreptococcus'],
  bsiEnterococcus: ['infectionPatterns.bloodCultureEnterococcus'],
  bsiHeartMurmur: ['physicalFindings.heartMurmur'],
  bsiProstheticValve: ['devicesProcedures.prostheticValve'],
  bsiPacemaker: ['devicesProcedures.pacemaker'],
  bsiDialysis: ['hostFactors.dialysis', 'devicesProcedures.dialysis'],
  bsiCentralVenousCatheter: ['devicesProcedures.centralVenousCatheter'],
  bsiPort: ['devicesProcedures.port'],
  bsiProstheticJoint: ['devicesProcedures.prostheticJoint'],
  bsiBackPain: ['symptomDomains.backSpine.backPain'],
  bsiCerebralEmbolicSymptoms: ['symptomDomains.neurologic.cerebralEmbolicSymptoms'],
  bsiSkinFindings: ['symptomDomains.skinSoftTissue.findings'],
  bsiEyeSymptoms: ['symptomDomains.neurologic.eyeSymptoms'],

  unknownLdhHigh: ['physicalFindings.ldhHigh'],
  unknownAnemia: ['hematology.anemia'],
  unknownThrombocytopenia: ['hematology.thrombocytopenia'],
  unknownNightSweats: ['symptomDomains.constitutional.nightSweats'],
  unknownWeightLoss: ['symptomDomains.constitutional.weightLoss'],
  unknownBackPain: ['symptomDomains.backSpine.backPain'],
  temporalArteryTenderness: ['physicalFindings.temporalArteryTenderness'],
  unknownShoulderThighPain: ['symptomDomains.constitutional.shoulderThighPain'],
  thoracodorsalPain: ['symptomDomains.cardiopulmonary.thoracodorsalPain'],
  unknownChills: ['infectionPatterns.chills'],
  unknownPositiveBloodCulture: ['infectionPatterns.positiveBloodCulture'],
  heartMurmur: ['physicalFindings.heartMurmur'],
  unknownProstheticValve: ['devicesProcedures.prostheticValve'],
  unknownPacemaker: ['devicesProcedures.pacemaker'],
  unknownDialysis: ['hostFactors.dialysis', 'devicesProcedures.dialysis'],
  unknownRash: ['physicalFindings.rash'],
  ssriUse: ['medications.ssriSnriUse'],
  unknownCkHigh: ['physicalFindings.ckElevation'],
  unknownEdema: ['physicalFindings.edema'],
  unknownRenalDysfunction: ['physicalFindings.renalDysfunction'],
  unknownOrganomegaly: ['physicalFindings.organomegaly'],

  nonInfRecentDrugStart: ['medications.recentDrugStart'],
  nonInfAntibioticsUse: ['medications.currentAntibiotics'],
  nonInfMalignancyHistory: ['hostFactors.malignancyHistory'],
  nonInfNightSweats: ['symptomDomains.constitutional.nightSweats'],
  nonInfWeightLoss: ['symptomDomains.constitutional.weightLoss'],
  nonInfLdhHigh: ['physicalFindings.ldhHigh'],
  nonInfThrombocytopenia: ['hematology.thrombocytopenia'],
  nonInfEdema: ['physicalFindings.edema'],
  nonInfRenalDysfunction: ['physicalFindings.renalDysfunction'],
  nonInfShoulderThighPain: ['symptomDomains.constitutional.shoulderThighPain'],
  nonInfTemporalArteryTenderness: ['physicalFindings.temporalArteryTenderness'],
  nonInfAcuteJointPain: ['symptomDomains.boneJoint.acuteJointPain'],
  nonInfKneeJointPain: ['symptomDomains.boneJoint.kneeJointPain'],
  nonInfLegSwelling: ['physicalFindings.legSwelling'],
  nonInfChestPain: ['symptomDomains.cardiopulmonary.chestPain'],
  nonInfDyspnea: ['symptomDomains.respiratory.dyspnea'],
  nonInfSsriSnriUse: ['medications.ssriSnriUse'],
  nonInfCkHigh: ['physicalFindings.ckElevation'],
}

const EMERGENCY_SIGN_MAP = {
  shock: ['vitals.shock', 'infectionPatterns.severeInfectionContext'],
  alteredMentalStatus: ['symptomDomains.neurologic.alteredMentalStatus'],
  respiratoryFailure: ['symptomDomains.respiratory.respiratoryFailure'],
  lowSpo2: ['vitals.lowSpo2'],
  meningealSigns: ['physicalFindings.meningealSigns'],
  neutropenia: ['hematology.neutropenia'],
  immunosuppression: ['hostFactors.immunosuppression'],
  severePain: ['physicalFindings.severePain'],
  necrotizingSkin: ['physicalFindings.necrotizingSkinConcern'],
}

const STEP2_SYMPTOM_MAP = {
  symptomRespiratory: 'symptomDomains.respiratory.domainSelected',
  symptomUrinary: 'symptomDomains.urinary.domainSelected',
  symptomAbdominalPain: 'symptomDomains.abdominal.painDomainSelected',
  symptomDiarrhea: 'symptomDomains.abdominal.diarrheaDomainSelected',
  symptomHeadache: 'symptomDomains.neurologic.headacheDomainSelected',
  symptomNeckPain: 'symptomDomains.neck.domainSelected',
  symptomBackPain: 'symptomDomains.backSpine.domainSelected',
  symptomJointPain: 'symptomDomains.boneJoint.domainSelected',
  symptomSkinFindings: 'symptomDomains.skinSoftTissue.domainSelected',
  symptomChestPain: 'symptomDomains.cardiopulmonary.chestPainDomainSelected',
  symptomChills: 'infectionPatterns.chillsDomainSelected',
  symptomPositiveBloodCulture: 'infectionPatterns.positiveBloodCultureDomainSelected',
  symptomNoLocalizing: 'symptomDomains.localizing.noneSelected',
}

const FUTURE_EXPOSURE_FINDINGS = [
  'outdoorExposure',
  'tickExposure',
  'knownTickBite',
  'eschar',
  'animalExposure',
  'travelExposure',
  'foodExposure',
  'waterExposure',
  'sexualExposure',
  'healthcareExposure',
]

export function normalizeClinicalContext(rawAnswers = {}, options = {}) {
  const explicitAbsences = new Set(options.explicitAbsences || [])
  const context = createEmptyContext(rawAnswers)

  for (const [sourceField, config] of Object.entries(NUMERIC_FIELDS)) {
    setMeasurement(context[config.domain], config.key, sourceField, rawAnswers, config.unit)
  }

  for (const [sourceField, config] of Object.entries(FUTURE_NUMERIC_FIELDS)) {
    setMeasurement(context[config.domain], config.key, sourceField, rawAnswers, config.unit)
  }

  for (const [sourceField, paths] of Object.entries(BOOLEAN_FINDING_MAP)) {
    const finding = normalizeLegacyBoolean(rawAnswers, sourceField, explicitAbsences)
    for (const path of paths) setFindingAtPath(context, path, finding)
  }

  for (const sign of rawAnswers.emergencySigns || []) {
    for (const path of EMERGENCY_SIGN_MAP[sign] || []) {
      setFindingAtPath(context, path, createFinding(FINDING_STATES.PRESENT, { sourceField: 'emergencySigns', sourceStep: 'step0', rawValue: sign }))
    }
  }

  for (const symptom of rawAnswers.step2Symptoms || []) {
    const path = STEP2_SYMPTOM_MAP[symptom]
    if (path) {
      setFindingAtPath(context, path, createFinding(FINDING_STATES.PRESENT, { sourceField: 'step2Symptoms', sourceStep: 'step2', rawValue: symptom }))
    }
  }

  for (const key of FUTURE_EXPOSURE_FINDINGS) {
    if (context.exposures[key]) continue
    if (rawAnswers[key] === true) {
      context.exposures[key] = createFinding(FINDING_STATES.PRESENT, { sourceField: key, sourceStep: 'future', rawValue: true })
    } else if (explicitAbsences.has(key)) {
      context.exposures[key] = createFinding(FINDING_STATES.ABSENT, { sourceField: key, sourceStep: 'future', rawValue: false })
    } else if (Object.hasOwn(rawAnswers, key)) {
      context.exposures[key] = createFinding(FINDING_STATES.UNKNOWN, { sourceField: key, sourceStep: 'future', rawValue: rawAnswers[key], legacyRule: 'future-field-provided-without-explicit-absence' })
    } else {
      context.exposures[key] = createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: key, sourceStep: 'future' })
    }
  }

  context.electrolytes.hyponatremia = createFinding(FINDING_STATES.NOT_ASSESSED, {
    sourceField: 'sodium',
    sourceStep: 'future',
    legacyRule: 'tick-safety-schema',
  })

  deriveClinicalContext(context)
  return context
}

export function createFinding(state = FINDING_STATES.UNKNOWN, meta = {}) {
  return {
    state,
    sourceField: meta.sourceField || null,
    sourceStep: meta.sourceStep || inferSourceStep(meta.sourceField),
    legacyRule: meta.legacyRule || null,
    rawValue: Object.hasOwn(meta, 'rawValue') ? meta.rawValue : null,
  }
}

export function createMeasurement(value, measurementState, meta = {}) {
  return {
    value: Number.isFinite(value) ? value : null,
    measurementState,
    unit: meta.unit || null,
    sourceField: meta.sourceField || null,
    sourceStep: meta.sourceStep || inferSourceStep(meta.sourceField),
    rawValue: Object.hasOwn(meta, 'rawValue') ? meta.rawValue : null,
  }
}

function createEmptyContext(rawAnswers) {
  return {
    rawAnswers: { ...rawAnswers },
    patient: {
      mainProblem: rawAnswers.mainProblem || 'unknown',
      age: createMeasurement(null, FINDING_STATES.NOT_ASSESSED, { sourceField: 'age', sourceStep: 'future', unit: 'years' }),
      feverDuration: createMeasurement(null, FINDING_STATES.NOT_ASSESSED, { sourceField: 'feverDuration', sourceStep: 'future', unit: 'days' }),
      feverChiefConcern: createFinding(
        ['fever', 'feverAndCrp', 'fuo'].includes(rawAnswers.mainProblem)
          ? FINDING_STATES.PRESENT
          : FINDING_STATES.UNKNOWN,
        { sourceField: 'mainProblem', sourceStep: 'step1', rawValue: rawAnswers.mainProblem },
      ),
    },
    vitals: {},
    inflammation: {},
    hematology: {},
    electrolytes: {},
    symptomDomains: {},
    exposures: {
      domesticOutdoor: createExposureDomain('domesticOutdoor', ['outdoorExposure', 'tickExposure', 'knownTickBite', 'eschar']),
      internationalTravel: createInternationalTravelContext(rawAnswers),
      animal: createExposureDomain('animal', ['animalExposure']),
      food: createExposureDomain('food', ['foodExposure']),
      water: createExposureDomain('water', ['waterExposure']),
      sexual: createExposureDomain('sexual', ['sexualExposure']),
      healthcare: createFinding(FINDING_STATES.UNKNOWN, { sourceField: 'recentHospitalization', sourceStep: 'step2' }),
    },
    hostFactors: {},
    devicesProcedures: {},
    medications: {},
    physicalFindings: {},
    infectionPatterns: {
      infectionAbsent: createFinding(FINDING_STATES.NOT_ASSESSED, { legacyRule: 'never-derived-from-fever-or-crp-alone' }),
    },
    nonInfectiousPatterns: {},
    diagnosticTests: {},
    dataQuality: {
      missingImportantData: [],
      conflicts: [],
      legacyAmbiguity: [],
      semanticInvariants: [
        'fever absent does not mean infection absent',
        'normal or low CRP does not mean infection absent',
        'normal WBC does not mean infection absent',
        'known tick bite absent does not exclude tick-borne disease',
        'eschar absent does not exclude tick-borne disease',
        'rash absent does not exclude tick-borne disease',
        'unknown international travel is not converted to no travel',
        'free-text country names are not used directly in medical rules',
      ],
    },
  }
}

function createExposureDomain(domain, sourceFields) {
  return {
    state: createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: domain, sourceStep: 'future' }),
    sourceFields,
  }
}

function createInternationalTravelContext(rawAnswers) {
  const hasTravelField = Object.hasOwn(rawAnswers, 'travelExposure')
  const hasText = typeof rawAnswers.travelCountryText === 'string' && rawAnswers.travelCountryText.trim().length > 0
  const state = rawAnswers.travelExposure === true || hasText
    ? FINDING_STATES.PRESENT
    : hasTravelField
      ? FINDING_STATES.UNKNOWN
      : FINDING_STATES.NOT_ASSESSED
  const returnDate = parseDateOnly(rawAnswers.travelReturnDate)
  const referenceDate = parseDateOnly(rawAnswers.referenceDate) || new Date()
  const daysSinceReturn = returnDate ? Math.max(0, daysBetween(returnDate, referenceDate)) : null

  return {
    state: createFinding(state, { sourceField: 'travelExposure', sourceStep: 'future', rawValue: rawAnswers.travelExposure ?? rawAnswers.travelCountryText ?? null }),
    countryText: {
      value: hasText ? rawAnswers.travelCountryText.trim() : '',
      state: hasText ? FINDING_STATES.PRESENT : FINDING_STATES.NOT_ASSESSED,
      ruleUse: 'display-only; never compare raw country text in medical rules',
    },
    regionClassifications: {
      malariaRiskArea: createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: 'travelMalariaRiskArea', sourceStep: 'future' }),
      dengueRiskArea: createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: 'travelDengueRiskArea', sourceStep: 'future' }),
      chikungunyaRiskArea: createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: 'travelChikungunyaRiskArea', sourceStep: 'future' }),
      tropicalSubtropical: createFinding(FINDING_STATES.NOT_ASSESSED, { sourceField: 'travelTropicalSubtropical', sourceStep: 'future' }),
    },
    departureDate: createDateValue(rawAnswers.travelDepartureDate, 'travelDepartureDate'),
    returnDate: createDateValue(rawAnswers.travelReturnDate, 'travelReturnDate'),
    daysSinceReturn: createMeasurement(daysSinceReturn, daysSinceReturn === null ? FINDING_STATES.UNKNOWN : FINDING_STATES.PRESENT, {
      sourceField: 'travelReturnDate',
      sourceStep: 'future',
      unit: 'days',
      rawValue: rawAnswers.travelReturnDate ?? null,
    }),
    ruralOrUrban: rawAnswers.travelRuralOrUrban || 'unknown',
    purpose: rawAnswers.travelPurpose || 'unknown',
    prophylaxis: rawAnswers.travelProphylaxis || 'unknown',
  }
}

function createDateValue(value, sourceField) {
  return {
    value: typeof value === 'string' && value.length > 0 ? value : null,
    state: typeof value === 'string' && value.length > 0 ? FINDING_STATES.PRESENT : FINDING_STATES.UNKNOWN,
    sourceField,
    sourceStep: 'future',
  }
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / msPerDay)
}

function normalizeLegacyBoolean(rawAnswers, sourceField, explicitAbsences) {
  if (rawAnswers[sourceField] === true) {
    return createFinding(FINDING_STATES.PRESENT, {
      sourceField,
      rawValue: true,
    })
  }
  if (explicitAbsences.has(sourceField)) {
    return createFinding(FINDING_STATES.ABSENT, {
      sourceField,
      rawValue: false,
    })
  }
  if (Object.hasOwn(rawAnswers, sourceField)) {
    return createFinding(FINDING_STATES.UNKNOWN, {
      sourceField,
      rawValue: rawAnswers[sourceField],
      legacyRule: 'legacy-false-may-mean-unanswered',
    })
  }
  return createFinding(FINDING_STATES.NOT_ASSESSED, {
    sourceField,
  })
}

function setMeasurement(target, key, sourceField, rawAnswers, unit) {
  const rawValue = rawAnswers[sourceField]
  const value = parseNumber(rawValue)
  const measurementState = Number.isFinite(value)
    ? FINDING_STATES.PRESENT
    : Object.hasOwn(rawAnswers, sourceField)
      ? FINDING_STATES.UNKNOWN
      : FINDING_STATES.NOT_ASSESSED
  target[key] = createMeasurement(value, measurementState, {
    sourceField,
    unit,
    rawValue,
  })
}

function deriveClinicalContext(context) {
  const bt = context.vitals.bt?.value
  const crp = context.inflammation.crp?.value
  const wbc = context.inflammation.wbc?.value

  context.vitals.fever = createFinding(
    Number.isFinite(bt)
      ? bt >= 38
        ? FINDING_STATES.PRESENT
        : FINDING_STATES.ABSENT
      : FINDING_STATES.UNKNOWN,
    { sourceField: 'temperature', sourceStep: 'step1', rawValue: context.vitals.bt?.rawValue },
  )
  context.inflammation.highCrp = createFinding(
    Number.isFinite(crp)
      ? crp >= 5
        ? FINDING_STATES.PRESENT
        : FINDING_STATES.ABSENT
      : FINDING_STATES.UNKNOWN,
    { sourceField: 'crp', sourceStep: 'step1', rawValue: context.inflammation.crp?.rawValue },
  )
  context.inflammation.highWbc = createFinding(
    Number.isFinite(wbc)
      ? wbc >= 10000
        ? FINDING_STATES.PRESENT
        : FINDING_STATES.ABSENT
      : FINDING_STATES.UNKNOWN,
    { sourceField: 'wbc', sourceStep: 'step1', rawValue: context.inflammation.wbc?.rawValue },
  )

  if (context.vitals.bt?.measurementState !== FINDING_STATES.PRESENT) {
    context.dataQuality.missingImportantData.push('BT not measured')
  }
  if (context.inflammation.crp?.measurementState !== FINDING_STATES.PRESENT) {
    context.dataQuality.missingImportantData.push('CRP not measured')
  }
  if (context.inflammation.wbc?.measurementState !== FINDING_STATES.PRESENT) {
    context.dataQuality.missingImportantData.push('WBC not measured')
  }

  for (const [sourceField, paths] of Object.entries(BOOLEAN_FINDING_MAP)) {
    const firstPath = paths[0]
    const finding = getFindingAtPath(context, firstPath)
    if (finding?.state === FINDING_STATES.UNKNOWN && finding.legacyRule === 'legacy-false-may-mean-unanswered') {
      context.dataQuality.legacyAmbiguity.push({
        sourceField,
        sourceStep: inferSourceStep(sourceField),
        reason: 'legacy boolean false cannot distinguish absent from unanswered',
      })
    }
  }
}

function setFindingAtPath(target, path, finding) {
  const parts = path.split('.')
  let current = target
  for (const part of parts.slice(0, -1)) {
    current[part] ||= {}
    current = current[part]
  }
  const key = parts.at(-1)
  current[key] = mergeFinding(current[key], finding)
}

function getFindingAtPath(target, path) {
  return path.split('.').reduce((current, part) => current?.[part], target)
}

function mergeFinding(current, next) {
  if (!current) return next
  if (current.state === next.state) return current
  if (next.state === FINDING_STATES.NOT_ASSESSED) return current
  if (current.state === FINDING_STATES.NOT_ASSESSED) return next
  if (current.state === FINDING_STATES.PRESENT || next.state === FINDING_STATES.PRESENT) {
    return next.state === FINDING_STATES.PRESENT ? next : current
  }
  if (current.state === FINDING_STATES.ABSENT && next.state === FINDING_STATES.UNKNOWN) return current
  if (current.state === FINDING_STATES.UNKNOWN && next.state === FINDING_STATES.ABSENT) return next
  return {
    ...next,
    state: FINDING_STATES.CONFLICTING,
    legacyRule: 'merged-conflicting-finding',
  }
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const numberValue = Number.parseFloat(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function inferSourceStep(sourceField) {
  if (!sourceField) return null
  if (sourceField === 'mainProblem') return 'step1'
  if (sourceField.startsWith('resp') || sourceField.startsWith('urinary') || sourceField.startsWith('abdominal')) return 'step2'
  if (sourceField.startsWith('skin') || sourceField.startsWith('bone') || sourceField.startsWith('cns')) return 'step2'
  if (sourceField.startsWith('bsi') || sourceField.startsWith('unknown') || sourceField.startsWith('neck')) return 'step2'
  if (sourceField.startsWith('nonInf')) return 'step3'
  if (sourceField.startsWith('reeval')) return 'step6'
  return 'legacy'
}




