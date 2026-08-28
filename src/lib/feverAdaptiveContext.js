import { FINDING_STATES } from './clinicalContext.js'

export const ADAPTIVE_DOMAINS = Object.freeze({
  RESPIRATORY: 'respiratory',
  URINARY: 'urinary',
  ABDOMINAL_BILIARY: 'abdominalBiliary',
  SKIN_SOFT_TISSUE: 'skinSoftTissue',
  BONE_JOINT: 'boneJoint',
  NEUROLOGIC: 'neurologic',
  BLOODSTREAM: 'bloodstream',
  BACK_SPINE: 'backSpine',
  NECK: 'neck',
  SYSTEMIC_NO_FOCUS: 'systemicNoFocus',
  NON_INFECTIOUS: 'nonInfectious',
  EXPOSURE: 'exposure',
})

const DOMAIN_SIGNALS = {
  [ADAPTIVE_DOMAINS.RESPIRATORY]: [
    'symptomDomains.respiratory.domainSelected',
    'symptomDomains.respiratory.cough',
    'symptomDomains.respiratory.sputum',
    'symptomDomains.respiratory.dyspnea',
    'symptomDomains.respiratory.lowSpo2',
    'physicalFindings.respiratoryImagingAbnormality',
  ],
  [ADAPTIVE_DOMAINS.URINARY]: [
    'symptomDomains.urinary.domainSelected',
    'symptomDomains.urinary.dysuria',
    'symptomDomains.urinary.frequency',
    'physicalFindings.cvaTenderness',
    'devicesProcedures.urinaryCatheter',
  ],
  [ADAPTIVE_DOMAINS.ABDOMINAL_BILIARY]: [
    'symptomDomains.abdominal.painDomainSelected',
    'symptomDomains.abdominal.diarrheaDomainSelected',
    'symptomDomains.abdominal.pain',
    'symptomDomains.abdominal.rightUpperQuadrantPain',
    'physicalFindings.jaundice',
    'symptomDomains.abdominal.diarrhea',
  ],
  [ADAPTIVE_DOMAINS.SKIN_SOFT_TISSUE]: [
    'symptomDomains.skinSoftTissue.domainSelected',
    'symptomDomains.skinSoftTissue.redness',
    'symptomDomains.skinSoftTissue.swelling',
    'symptomDomains.skinSoftTissue.severePain',
    'physicalFindings.skinNecrosis',
  ],
  [ADAPTIVE_DOMAINS.BONE_JOINT]: [
    'symptomDomains.boneJoint.domainSelected',
    'symptomDomains.boneJoint.acuteJointPain',
    'symptomDomains.boneJoint.kneeJointPain',
    'devicesProcedures.prostheticJoint',
  ],
  [ADAPTIVE_DOMAINS.NEUROLOGIC]: [
    'symptomDomains.neurologic.headacheDomainSelected',
    'symptomDomains.neurologic.headache',
    'symptomDomains.neurologic.alteredMentalStatus',
    'physicalFindings.neckStiffness',
    'symptomDomains.neurologic.seizure',
  ],
  [ADAPTIVE_DOMAINS.BLOODSTREAM]: [
    'infectionPatterns.chillsDomainSelected',
    'infectionPatterns.positiveBloodCultureDomainSelected',
    'infectionPatterns.chills',
    'infectionPatterns.positiveBloodCulture',
    'physicalFindings.heartMurmur',
    'devicesProcedures.prostheticValve',
    'devicesProcedures.pacemaker',
  ],
  [ADAPTIVE_DOMAINS.BACK_SPINE]: [
    'symptomDomains.backSpine.domainSelected',
    'symptomDomains.backSpine.backPain',
    'physicalFindings.lumbarTenderness',
  ],
  [ADAPTIVE_DOMAINS.NECK]: [
    'symptomDomains.neck.domainSelected',
    'symptomDomains.neck.acutePain',
    'physicalFindings.limitedNeckRotation',
  ],
  [ADAPTIVE_DOMAINS.SYSTEMIC_NO_FOCUS]: [
    'symptomDomains.localizing.noneSelected',
    'infectionPatterns.noClearFocus',
    'symptomDomains.constitutional.nightSweats',
    'symptomDomains.constitutional.weightLoss',
  ],
  [ADAPTIVE_DOMAINS.NON_INFECTIOUS]: [
    'medications.recentDrugStart',
    'hostFactors.malignancyHistory',
    'physicalFindings.ldhHigh',
    'symptomDomains.constitutional.shoulderThighPain',
    'physicalFindings.temporalArteryTenderness',
    'physicalFindings.legSwelling',
  ],
  [ADAPTIVE_DOMAINS.EXPOSURE]: [
    'exposures.outdoorExposure',
    'exposures.tickExposure',
    'exposures.healthcare',
    'hostFactors.immunosuppression',
  ],
}

export function buildAdaptiveContext(normalizedClinicalContext) {
  const activeDomains = deriveActiveDomains(normalizedClinicalContext)
  const candidateContext = {
    activeDomains,
    domainScores: scoreDomains(normalizedClinicalContext),
    hasCriticalContext: hasAnyPresent(normalizedClinicalContext, [
      'vitals.shock',
      'vitals.lowSpo2',
      'symptomDomains.neurologic.alteredMentalStatus',
      'infectionPatterns.positiveBloodCulture',
      'physicalFindings.meningealSigns',
      'physicalFindings.necrotizingSkinConcern',
    ]),
    dataQuality: normalizedClinicalContext.dataQuality,
  }

  return {
    normalizedClinicalContext,
    candidateContext,
    activeDomains,
  }
}

export function deriveActiveDomains(context) {
  const scores = scoreDomains(context)
  const active = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([domain]) => domain)

  if (active.length === 0) {
    active.push(ADAPTIVE_DOMAINS.SYSTEMIC_NO_FOCUS)
  }

  return active
}

export function scoreDomains(context) {
  return Object.fromEntries(
    Object.entries(DOMAIN_SIGNALS).map(([domain, paths]) => [
      domain,
      paths.reduce((score, path) => score + (getFindingState(context, path) === FINDING_STATES.PRESENT ? 1 : 0), 0),
    ]),
  )
}

export function getFindingState(context, path) {
  const value = getAtPath(context, path)
  if (!value) return FINDING_STATES.NOT_ASSESSED
  return value.state || value.measurementState || FINDING_STATES.UNKNOWN
}

export function hasAnyPresent(context, paths) {
  return paths.some((path) => getFindingState(context, path) === FINDING_STATES.PRESENT)
}

export function getAtPath(target, path) {
  return path.split('.').reduce((current, part) => current?.[part], target)
}
