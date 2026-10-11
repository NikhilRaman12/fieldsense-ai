import type {
  ObservationReport,
  FieldContextData,
  CompetingHypothesis,
  SpecialistAgentContribution,
} from '../types'

interface RuleObservationResult {
  report: ObservationReport
}

export function generateOfflineGuidedObservation(
  observationText: string,
  hasImage: boolean = false,
  fieldContext?: FieldContextData
): RuleObservationResult {
  const textLower = (observationText + ' ' + JSON.stringify(fieldContext || {})).toLowerCase()
  const visibleCharacteristics: string[] = []
  const competingHypotheses: CompetingHypothesis[] = []
  const specialistAgents: SpecialistAgentContribution[] = []
  const safetyConsiderations: string[] = [
    'Observe without harvesting or ingesting any wild plant, berry, seed, or fungus.',
    'Do not apply synthetic chemical treatments or fungicides without confirming root causes.',
    'Leave specimen and surrounding ecological habitat intact.',
  ]
  const whatRemainsUnknown: string[] = []
  const discriminatingTests: Array<{
    targetHypothesesToDistinguish: string
    recommendedAction: string
    whatToLookFor: string
    riskOrImpact: string
  }> = []

  // Context-aware evidence extraction
  if (fieldContext?.affectedParts) {
    visibleCharacteristics.push(`Affected anatomical region: ${fieldContext.affectedParts}`)
  }
  if (fieldContext?.symptomPattern) {
    visibleCharacteristics.push(`Symptom morphology pattern: ${fieldContext.symptomPattern}`)
  }
  if (fieldContext?.soilMoisture) {
    visibleCharacteristics.push(`Substrate moisture condition: ${fieldContext.soilMoisture}`)
  }
  if (fieldContext?.recentWeather) {
    visibleCharacteristics.push(`Recent meteorological history: ${fieldContext.recentWeather}`)
  }
  if (fieldContext?.spreadExtent) {
    visibleCharacteristics.push(`Population distribution / spread: ${fieldContext.spreadExtent}`)
  }

  // --- SPECIALIST AGENT 1: Plant Pathology & Entomology Agent ---
  const pathologyFindings: string[] = []
  let pathologyDiscriminating = 'Check leaf undersides with a 10x hand loupe for fungal spores (pustules) or piercing-sucking insect frass/castings.'

  // --- SPECIALIST AGENT 2: Soil Agronomy & Root Physiology Agent ---
  const agronomyFindings: string[] = []
  let agronomyDiscriminating = 'Perform a simple ribbon soil moisture roll 5-10cm deep and inspect feeder root tips for rot or healthy white fibrous structure.'

  // --- SPECIALIST AGENT 3: Environmental Ecology & Micro-Climate Agent ---
  const ecologyFindings: string[] = []
  let ecologyDiscriminating = 'Assess sun exposure transition and inspect neighboring non-related species for uniform physical damage.'

  // Scenario 1: Yellowing Leaves / Chlorosis Investigation (Directly answering the user requirement)
  if (
    textLower.includes('yellow') ||
    textLower.includes('chlorosis') ||
    textLower.includes('pale') ||
    fieldContext?.symptomPattern?.toLowerCase().includes('chlorosis') ||
    fieldContext?.symptomPattern?.toLowerCase().includes('yellow')
  ) {
    visibleCharacteristics.push('Foliar chlorosis (loss of chlorophyll pigmentation across leaf tissue)')

    // Check specific chlorosis cues
    const isInterveinal = textLower.includes('interveinal') || textLower.includes('vein')
    const isOlderLeaves = textLower.includes('older') || textLower.includes('lower') || fieldContext?.affectedParts?.toLowerCase().includes('lower')
    const isNewLeaves = textLower.includes('new') || textLower.includes('terminal') || textLower.includes('young') || fieldContext?.affectedParts?.toLowerCase().includes('new')
    const isOverwatered = textLower.includes('waterlog') || textLower.includes('saturated') || textLower.includes('heavy rain') || fieldContext?.soilMoisture?.toLowerCase().includes('waterlog')
    const isDry = textLower.includes('dry') || textLower.includes('drought') || fieldContext?.soilMoisture?.toLowerCase().includes('dry')
    const isIsolated = textLower.includes('isolated') || textLower.includes('single') || fieldContext?.spreadExtent?.toLowerCase().includes('isolated')

    // Hypothesis A: Mobile Nutrient Deficiency (Nitrogen / Magnesium)
    const hypN: CompetingHypothesis = {
      id: 'hyp-nitrogen-mg',
      name: 'Mobile Nutrient Translocation (Nitrogen or Magnesium Deficiency)',
      plausibility: isOlderLeaves ? 'likely' : isNewLeaves ? 'unlikely' : 'possible',
      supportingEvidence: [],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Are veins green while blade is yellow (Magnesium), or is the entire older blade pale uniformly (Nitrogen)?',
    }
    if (isOlderLeaves) hypN.supportingEvidence.push('Mobile nutrients translocate from older basal leaves toward new growth during deficit.')
    if (isNewLeaves) hypN.contradictingEvidence.push('Nitrogen is mobile; true N deficiency manifests at the plant base, not terminal bud.')
    if (isInterveinal) hypN.supportingEvidence.push('Interveinal yellowing with prominent green veins strongly suggests Magnesium deficit or pH lockout.')
    competingHypotheses.push(hypN)

    // Hypothesis B: Root Anoxia / Moisture Stress (Overwatering or Soil Compaction)
    const hypAnoxia: CompetingHypothesis = {
      id: 'hyp-root-anoxia',
      name: 'Root Zone Anoxia / Waterlogging (Impaired Aerobic Respiration)',
      plausibility: isOverwatered ? 'likely' : isDry ? 'unlikely' : 'possible',
      supportingEvidence: [],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Check soil smell (sulfidic/anaerobic) and inspect whether leaves are turgid-yellow or wilted-dry.',
    }
    if (isOverwatered) hypAnoxia.supportingEvidence.push('Waterlogged roots lose access to oxygen, starving root hairs of ATP needed for nutrient uptake.')
    if (isDry) hypAnoxia.contradictingEvidence.push('Soil reported dry or well-drained, which contradicts waterlogged anaerobic conditions.')
    competingHypotheses.push(hypAnoxia)

    // Hypothesis C: Vascular Wilt or Root Pathogen (Fusarium / Verticillium / Root Rot)
    const hypPathogen: CompetingHypothesis = {
      id: 'hyp-vascular-pathogen',
      name: 'Vascular Wilt or Root Pathogen (Fungal / Oomycete infection)',
      plausibility: isIsolated ? 'possible' : 'unlikely',
      supportingEvidence: [],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Is the yellowing one-sided on the stem/branch? Are vascular bundles inside the stem discolored brown?',
    }
    if (isIsolated) hypPathogen.supportingEvidence.push('Individual isolated plant affected while immediate neighbors remain lush.')
    if (textLower.includes('all adjacent')) hypPathogen.contradictingEvidence.push('Sudden uniform spread across multiple unrelated species points toward abiotic environmental causes, not specific fungal wilts.')
    competingHypotheses.push(hypPathogen)

    // Hypothesis D: Sunlight / Photobleaching or Cold Shock
    const hypWeather: CompetingHypothesis = {
      id: 'hyp-abiotic-weather',
      name: 'Abiotic Meteorological Stress (Sunscald, Heat, or Sudden Cold Snap)',
      plausibility: (textLower.includes('heat') || textLower.includes('frost') || textLower.includes('cold')) ? 'likely' : 'possible',
      supportingEvidence: [],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Are symptoms restricted solely to sun-exposed upper surfaces or exposed perimeter rows?',
    }
    if (textLower.includes('heat') || textLower.includes('sun')) hypWeather.supportingEvidence.push('Recent intense solar radiation or high ambient heat.')
    competingHypotheses.push(hypWeather)

    pathologyFindings.push('Scanned for fungal mycelium, rust pustules, or leaf spot halo borders. If yellowing is uniform without necrotic borders, fungal foliar blights are less probable.')
    agronomyFindings.push('Evaluated cation exchange and moisture uptake. Soil pH lock (e.g. high alkalinity binding iron, or high acidity binding phosphorus) frequently mimics deficiencies.')
    ecologyFindings.push('Correlated canopy micro-climates. Boundary row exposure and sudden shift from overcast to scorching sunlight can cause sudden photo-inhibition.')

    discriminatingTests.push(
      {
        targetHypothesesToDistinguish: 'Mobile Nutrient vs. Root Anoxia',
        recommendedAction: 'Extract a 10cm soil core near drip line; rub soil between fingers.',
        whatToLookFor: 'If soil smells foul/sour or stays muddy without crumbling, root anoxia is the primary trigger.',
        riskOrImpact: 'Zero risk to plant; non-destructive.',
      },
      {
        targetHypothesesToDistinguish: 'Nutrient Deficiency vs. Vascular Wilt',
        recommendedAction: 'Inspect branch symmetry and scrape a microscopic sliver of stem bark on an affected branch.',
        whatToLookFor: 'Green cambium = physiological/nutrient. Brown/dark streaking = vascular blockage.',
        riskOrImpact: 'Use sanitized fingernail or razor edge; avoid deep wounds.',
      }
    )

    whatRemainsUnknown.push(
      'Exact soil pH and electrical conductivity (EC) level at root depth',
      'Presence of microscopic subterranean root-knot nematodes or grubs feeding on root cortex',
      'Recent chemical or fertilizer application history in the area'
    )
  } else if (
    textLower.includes('spot') ||
    textLower.includes('hole') ||
    textLower.includes('chewed') ||
    textLower.includes('bug') ||
    textLower.includes('insect')
  ) {
    // Scenario 2: Physical/Herbivore/Pathogen Tissue Damage
    visibleCharacteristics.push('Foliar lesion or mechanical tissue deficit observed')

    competingHypotheses.push({
      id: 'hyp-herbivory',
      name: 'Invertebrate Herbivory (Caterpillar, Sawfly, or Beetle feeding)',
      plausibility: 'likely',
      supportingEvidence: ['Margin chewing or irregular perforation across blade'],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Look for frass pellets on lower leaves or nocturnal feeding larvae.',
    })

    competingHypotheses.push({
      id: 'hyp-foliar-fungal',
      name: 'Fungal or Bacterial Leaf Spot (e.g., Cercospora, Septoria, Pseudomonas)',
      plausibility: 'possible',
      supportingEvidence: ['Chlorotic concentric halos surrounding lesions'],
      contradictingEvidence: textLower.includes('dry') ? ['Dry arid conditions reduce spore germination'] : [],
      missingDistinguishingClue: 'Are spots bounded by leaf veins (angular bacterial) or circular with pycnidia dots?',
    })

    pathologyFindings.push('Identified lesion margins and looked for reproductive fruiting bodies (acervuli/pycnidia).')
    agronomyFindings.push('Vigorous plants with adequate potassium exhibit stronger epidermal cell walls resisting chewing.')
    ecologyFindings.push('Inspected microhabitat for beneficial insect predators (parasitoid wasps, ladybug beetles).')

    discriminatingTests.push({
      targetHypothesesToDistinguish: 'Insect Herbivory vs. Fungal Shot-Hole',
      recommendedAction: 'Inspect reverse side of leaf at twilight or dawn.',
      whatToLookFor: 'Active larvae/slugs or webbing vs. dry necrotic tissue falling out cleanly.',
      riskOrImpact: 'Zero impact.',
    })

    whatRemainsUnknown.push('Nocturnal insect activity and micro-pathogen histology.')
  } else {
    // Scenario 3: General Botanical Morphology Exploration
    visibleCharacteristics.push(
      `Documented observation notes: "${observationText.slice(0, 90)}${observationText.length > 90 ? '...' : ''}"`,
      hasImage ? 'Field photograph attached for structural verification' : 'Descriptive field note recorded'
    )

    competingHypotheses.push({
      id: 'hyp-phenotypic-adaptation',
      name: 'Phenotypic Plasticity / Environmental Micro-Niche Adaptation',
      plausibility: 'likely',
      supportingEvidence: ['Organism shows structural adaptation aligned with light, wind, and substrate access.'],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Compare leaf thickness and internode spacing on plants in full sun vs dense shade.',
    })

    competingHypotheses.push({
      id: 'hyp-botanical-taxon',
      name: 'Specific Indigenous or Naturalized Taxon',
      plausibility: 'possible',
      supportingEvidence: ['Morphological alignment with regional flora keys.'],
      contradictingEvidence: [],
      missingDistinguishingClue: 'Observe reproductive floral or seed-bearing anatomy in seasonal sequence.',
    })

    pathologyFindings.push('No acute disease symptoms observed; specimen displays standard physiological growth.')
    agronomyFindings.push('Growth habit reflects ambient soil physical structure and moisture retention.')
    ecologyFindings.push('Specimen serves as an integral member of local trophic and canopy layers.')

    discriminatingTests.push({
      targetHypothesesToDistinguish: 'Genetic Trait vs. Environmental Shading',
      recommendedAction: 'Measure internodal stem distance across exposed vs sheltered branches.',
      whatToLookFor: 'Stretched, elongated internodes indicate etiolation seeking light.',
      riskOrImpact: 'Zero risk.',
    })

    whatRemainsUnknown.push('Subsurface root morphology and multi-season phenology.')
  }

  // Populate specialist agents list
  specialistAgents.push(
    {
      agentName: 'Pathology & Biotic Specialist',
      role: 'Investigates fungal, bacterial, viral, and insect herbivory causes',
      focusArea: 'Lesions, leaf undersides, frass, spores, and vascular wilts',
      status: 'completed',
      findings: pathologyFindings,
      suggestedDiscriminatingTest: pathologyDiscriminating,
    },
    {
      agentName: 'Agronomy & Soil Root Specialist',
      role: 'Investigates nutrient translocation, root zone aeration, and pH lockouts',
      focusArea: 'Mobile vs immobile nutrients, waterlogging, and soil texture',
      status: 'completed',
      findings: agronomyFindings,
      suggestedDiscriminatingTest: agronomyDiscriminating,
    },
    {
      agentName: 'Ecology & Environmental Specialist',
      role: 'Investigates abiotic meteorological stresses and population patterns',
      focusArea: 'Sunscald, frost shock, wind desiccations, and ecosystem tiers',
      status: 'completed',
      findings: ecologyFindings,
      suggestedDiscriminatingTest: ecologyDiscriminating,
    }
  )

  const summary = `Field Investigation: Coordinated 3 specialist perspectives across observed symptoms. Competing hypotheses formulated without leaping to premature diagnosis.`

  return {
    report: {
      summary,
      visibleCharacteristics,
      possibleInterpretations: competingHypotheses.map((h) => `${h.name} (${h.plausibility})`),
      alternativeExplanations: competingHypotheses.filter((h) => h.plausibility !== 'likely').map((h) => h.name),
      uncertainty: {
        rating: competingHypotheses.some((h) => h.plausibility === 'likely') ? 'moderate' : 'high',
        explanation:
          'Single-point visual observations cannot confirm internal physiological causes or microscopic pathogen presence. Discriminating field tests are required to eliminate competing explanations.',
      },
      nextObservation: discriminatingTests[0]?.recommendedAction || 'Inspect lower leaf surfaces and test soil moisture 5cm deep.',
      safetyConsiderations,
      distinctionEvidenceVsInference: {
        observedEvidence: visibleCharacteristics,
        inferredHypotheses: competingHypotheses.map((h) => `${h.name}: ${h.supportingEvidence.join('; ') || 'Hypothesis under evaluation'}`),
      },
      fieldContext,
      specialistAgents,
      competingHypotheses,
      discriminatingTests,
      whatRemainsUnknown,
      sourceMode: 'offline_guided',
      generatedAt: new Date().toISOString(),
    },
  }
}
