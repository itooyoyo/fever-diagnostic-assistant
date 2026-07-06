// Clinical assessment logic extracted from App.jsx. Keep this file UI-free.

export const respiratoryRecommendedTests = [
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


export const urgentActions = [
  'バイタル再評価',
  '血液培養2セット',
  '乳酸測定',
  '臓器障害評価',
  '感染巣検索',
  '必要に応じて培養採取後に経験的治療を検討',
]


export const warningSigns = [
  '息苦しさ、胸や腹部の強い痛み・圧迫感',
  '意識がぼんやりする、起こしても反応が弱い',
  'けいれん、強いめまい、立てないほどの脱力',
  '尿が出ない、涙が出ない、口が乾くなど脱水が強い',
  '熱や咳が一度よくなった後に再び悪化した',
  '持病が悪化している',
]


export const relativeBradycardiaDifferentials = [
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


export const crpOnlyDifferentials = [
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


export const fuoCategoryCards = [
  '感染症',
  '悪性腫瘍',
  '自己免疫',
  '薬剤',
  '血栓症',
  '大動脈疾患',
]


export function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split('、').filter(Boolean)
  }
  return []
}

export function getDefaultTests(label) {
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

export function assessEmergencySigns(selectedSigns) {
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

export function assessInfectionLikelihood(form) {
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

export function assessRespiratoryFocus(form) {
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

export function assessUrinaryFocus(form) {
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

export function assessAbdominalFocus(form) {
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

export function assessSkinSoftTissueFocus(form) {
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

export function assessBoneJointFocus(form) {
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

export function assessCentralNervousFocus(form) {
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

export function assessBloodstreamFocus(form) {
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

export function assessBackPainFocus(form) {
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

export function assessNeckPainFocus(form) {
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

export function assessNoLocalizingFocus(form) {
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

export function assessNonInfectiousFocus(form) {
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

export function buildTestRecommendations({
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

export function buildDiagnosticSummary({
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

export function buildRedFlags(form, ranking, step0Result) {
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

export function buildInputWarnings({
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

export function buildNotYetExcluded(form, ranking) {
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

export function buildClinicalPearl(form) {
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

export function assessReevaluation(form) {
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

export function normalizeDiseaseName(value) {
  return String(value || '')
    .replace(/を考慮してください/g, '')
    .replace(/を考慮/g, '')
    .replace(/として緊急対応を検討/g, '')
    .trim()
}

export function dedupeList(items) {
  return [...new Set(items.filter(Boolean))]
}

export function collectEvidence(form, pairs) {
  return pairs
    .filter(([key]) => form[key])
    .map(([, label]) => label)
}

export function assessOverall(step0Result, step1Result) {
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
