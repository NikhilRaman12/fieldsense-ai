import type { MissionType, MissionDuration, MissionDifficulty, MissionDefinition } from '../types'

export interface MissionTemplate {
  title: string
  tagline: string
  objective: string
  natureZone: string
  safetyReminder: string
  recordingTip: string
  tasksByDifficulty: {
    gentle: Array<{ instruction: string; fieldTip: string }>
    curious: Array<{ instruction: string; fieldTip: string }>
    explorer: Array<{ instruction: string; fieldTip: string }>
  }
}

export const MISSION_TEMPLATES: Record<MissionType, MissionTemplate> = {
  plant_detective: {
    title: 'Plant Detective',
    tagline: 'Deconstruct structural botanical adaptations without disrupting life',
    objective: 'Investigate the architecture, leaf arrangement, and venation of an unfamiliar plant.',
    natureZone: 'Garden edge, tree base, hedgerow, or park verge',
    safetyReminder: 'Remain aware of uneven ground. Never touch plants with stinging hairs, toxic sap, or thorny spines. Do not taste any plant parts.',
    recordingTip: 'Look closely at leaf margins (serrated, lobed, or smooth) and light exposure.',
    tasksByDifficulty: {
      gentle: [
        { instruction: 'Locate a single plant that catches your attention and pause for 30 seconds.', fieldTip: 'Observe its total silhouette from standing height.' },
        { instruction: 'Examine leaf arrangement along the stem without pulling or bending.', fieldTip: 'Are leaves opposite each other, alternate, or whorled?' },
        { instruction: 'Notice leaf edges (smooth, tooth-like serrations, or wavy margins).', fieldTip: 'Gently look at the underside without snapping the petiole.' },
      ],
      curious: [
        { instruction: 'Survey the plant canopy and identify the dominant growth habit (herbaceous, woody, creeper).', fieldTip: 'Observe if stems are square, round, or ribbed.' },
        { instruction: 'Examine leaf venation patterns under daylight (palmate, pinnate, or parallel).', fieldTip: 'Veins tell us how the plant transports moisture and resists wind.' },
        { instruction: 'Compare leaves basking in direct sunlight versus leaves in shaded lower layers.', fieldTip: 'Sun leaves are often thicker and deeper green; shade leaves are broader.' },
        { instruction: 'Check the transition zone between stem and leaf (petiole and stipules).', fieldTip: 'Look for tiny glands, hairs, or clasping bases.' },
      ],
      explorer: [
        { instruction: 'Map the micro-habitat: soil moisture, shelter from wind, and proximity to stone or mulch.', fieldTip: 'Micro-climates dictate transpiration rates and fungal presence.' },
        { instruction: 'Document architectural branching: alternate, opposite, dichotomous, or basal rosette.', fieldTip: 'Branching dictates canopy coverage and light-gathering geometry.' },
        { instruction: 'Examine leaf surface adaptations: waxy cuticles, trichomes (hairs), or sunken stomata.', fieldTip: 'Hairiness often conserves boundary-layer moisture or repels herbivores.' },
        { instruction: 'Inspect the root-stem collar or surrounding ground cover for companion seedlings or moss.', fieldTip: 'Notice symbiotic relationships and soil compaction nearby.' },
        { instruction: 'Formulate one precise scientific question about its adaptation to test or read later.', fieldTip: 'Example: "Why does the lower foliage exhibit different margin serrations than the terminal shoots?"' },
      ],
    },
  },
  backyard_biodiversity: {
    title: 'Backyard Biodiversity',
    tagline: 'Observe the interconnected multi-tier ecosystem right outside your door',
    objective: 'Scan vertical habitat layers (canopy, shrub, herb, soil) to discover species cohabitation.',
    natureZone: 'Backyard, local green patch, boundary fence, or park shrubbery',
    safetyReminder: 'Step carefully to avoid stepping on unseen ground nests, damp mossy roots, or ant colonies. Maintain distance from wildlife.',
    recordingTip: 'Count distinct micro-niches rather than trying to name every species.',
    tasksByDifficulty: {
      gentle: [
        { instruction: 'Stand still for 60 seconds with your eyes softly scanning from eye-level to the ground.', fieldTip: 'Stillness allows animal activity to resume after your arrival.' },
        { instruction: 'Identify three distinct shades of green or brown across the vegetation.', fieldTip: 'Color gradients indicate different species and moisture levels.' },
        { instruction: 'Look for subtle movement: an insect on a stalk, fluttering foliage, or crawling fauna.', fieldTip: 'Notice the relationship between the creature and the leaf it rests on.' },
      ],
      curious: [
        { instruction: 'Inspect the structural tiers: ground layer, low herbs, shrubs, and overhead branchlets.', fieldTip: 'Multi-layer complexity provides shelter, nesting, and food sources.' },
        { instruction: 'Examine signs of past activity: leaf miner trails, nibbled edges, or spider silk anchor points.', fieldTip: 'Evidence of life is often easier to find than active animals.' },
        { instruction: 'Observe ground surface debris: leaf litter, fallen twigs, or decaying bark.', fieldTip: 'The detritus layer harbors the decomposers powering the soil microbiome.' },
        { instruction: 'Record how two different organisms (e.g. lichen and tree, or ant and flower) share space.', fieldTip: 'Is their relationship mutualism, commensalism, or shelter?' },
      ],
      explorer: [
        { instruction: 'Conduct a 1-meter micro-quadrat inspection: examine a 1x1 meter patch in detail.', fieldTip: 'Count how many distinct plant and invertebrate forms coexist in this meter.' },
        { instruction: 'Analyze organic decomposition stages in the soil/humus boundary layer.', fieldTip: 'Feel the temperature and notice the earthy petrichor scent without disturbing roots.' },
        { instruction: 'Track vertical energy pathways: who visits flowers for nectar vs. who feeds on stems?', fieldTip: 'Look for pollinators, predatory beetles, and parasitoid signs.' },
        { instruction: 'Document micro-climatic gradients between shaded soil and sunlit canopy.', fieldTip: 'Observe humidity retention under fallen leaves versus exposed soil.' },
        { instruction: 'Synthesize a food-web hypothesis for this localized habitat patch.', fieldTip: 'Write down primary producers, primary consumers, and decomposers noticed.' },
      ],
    },
  },
  bird_habitat: {
    title: 'Bird & Habitat Observer',
    tagline: 'Tune into avian perches, acoustic territory calls, and shelter foliage',
    objective: 'Decouple sight from sound to understand how birds use tree canopy and understory cover.',
    natureZone: 'Woodland border, urban park, garden trees, or open meadow edges',
    safetyReminder: 'Keep looking up and around for low-hanging branches and traffic. Never approach nests or distress nesting parents.',
    recordingTip: 'Note perch heights (low shrub vs. top power line/snag) and flight patterns.',
    tasksByDifficulty: {
      gentle: [
        { instruction: 'Find a comfortable standing or sitting spot with a view of tree crowns or telephone wires.', fieldTip: 'Keep your body still and relax your gaze.' },
        { instruction: 'Listen for 2 minutes with eyes closed and count distinct acoustic vocalizations.', fieldTip: 'Distinguish sharp contact chips from prolonged melodic phrases.' },
        { instruction: 'Spot the source of one bird call and note its perch height and surrounding foliage.', fieldTip: 'Is it concealed in thick shrubbery or calling from an exposed dead twig?' },
      ],
      curious: [
        { instruction: 'Analyze avian feeding niches: ground foragers (thrushes/sparrows) vs. bark gleaners vs. aerial hawkers.', fieldTip: 'Look at beak profiles and hunting maneuvers.' },
        { instruction: 'Examine fruiting or seeding plants nearby that provide sustenance.', fieldTip: 'Notice which trees have berry clusters or seed pods that attract flocking birds.' },
        { instruction: 'Observe flight styles: undulating rhythmic flaps, steady glides, or rapid darting.', fieldTip: 'Flight mechanics reflect wing aspect ratio and forest density adaptations.' },
        { instruction: 'Record how bird presence alters in response to a gust of wind or passing human.', fieldTip: 'Notice alarm calls and sudden flock repositioning.' },
      ],
      explorer: [
        { instruction: 'Map structural habitat perches: song perches, lookout snags, and dense roosting evergreens.', fieldTip: 'High snags provide acoustics and predator vigilance; dense shrubs protect from raptors.' },
        { instruction: 'Distinguish territorial territorial songs from social warning contact calls.', fieldTip: 'Listen to call repetition interval, frequency modulation, and reply calls.' },
        { instruction: 'Assess human edge effects: noise levels, reflective glass surfaces, and cat corridors.', fieldTip: 'Observe whether birds maintain a buffer zone away from hard infrastructure.' },
        { instruction: 'Document avian-botanical mutualisms (seed dispersal, blossom pollination).', fieldTip: 'Look for pollen dusting on facial feathers or regurgitated seed pits.' },
        { instruction: 'Formulate an assessment of this habitat’s carrying capacity for migratory stopovers.', fieldTip: 'Are there continuous water, shelter, and insect densities available?' },
      ],
    },
  },
  nature_texture: {
    title: 'Nature Texture Hunt',
    tagline: 'Experience tactile and microscopic topography across organic surfaces',
    objective: 'Explore surface adaptations: ribbed bark, papery seedpods, velveteen moss, and crystalline rocks.',
    natureZone: 'Fallen logs, rock faces, mossy stonework, or weathered tree trunks',
    safetyReminder: 'Never touch unknown fungi, stinging nettles, hairy caterpillars, or poisonous ivy/oak. Watch out for sharp stones and splinters.',
    recordingTip: 'Compare tactile feelings mentally: smooth, grooved, rugose, fibrous, or viscous.',
    tasksByDifficulty: {
      gentle: [
        { instruction: 'Touch two distinctly different tree trunks with your fingertips.', fieldTip: 'Notice one that is furrowed and one that is smooth or peeling.' },
        { instruction: 'Find a natural surface that feels surprisingly cool or surprisingly dry.', fieldTip: 'Notice how stone holds coolness while dry pine needles insulate.' },
        { instruction: 'Observe sunlight reflecting off an organic surface at an angle.', fieldTip: 'Low-angle raking light highlights microscopic surface roughness.' },
      ],
      curious: [
        { instruction: 'Locate 3 contrasting natural surfaces: e.g., striated bark, powdery lichen, and succulent leaves.', fieldTip: 'Surface textures evolved to retain water, shed rain, or deter insect herbivores.' },
        { instruction: 'Examine how water droplets behave on a leaf surface: beading vs. sheeting.', fieldTip: 'Beading illustrates the hydrophobic "lotus effect" driven by micro-wax crystals.' },
        { instruction: 'Investigate a piece of weathered deadwood or dried seed pod.', fieldTip: 'Feel the fibrous grain exposed by fungal decay and cellular lignin breakdown.' },
        { instruction: 'Compare the texture of upper leaf surfaces with their undersides.', fieldTip: 'Undersides often have velvety pubescence or raised vascular ribbing.' },
      ],
      explorer: [
        { instruction: 'Document micro-relief adaptations across bark: corky furrowing, lenticels, or exfoliating scales.', fieldTip: 'Furrows channel rainwater downward to root zones; lenticels permit gas exchange.' },
        { instruction: 'Inspect epiphyte colonization: how do moss rhizoids anchor into bark crevices?', fieldTip: 'Observe how rougher textures provide mechanical purchase for cryptogams.' },
        { instruction: 'Examine geological mineral grain: sandstone grit vs. slate cleavage vs. smooth river pebble.', fieldTip: 'Grain size reflects deposition energy and weathering history.' },
        { instruction: 'Contrast fungal fruiting body textures: woody bracket fungus vs. gelatinous jelly fungus.', fieldTip: 'Structural chitin density determines longevity and moisture resistance.' },
        { instruction: 'Synthesize how surface roughness affects thermal absorption and wind resistance.', fieldTip: 'Rough boundary layers reduce moisture evaporation during hot spells.' },
      ],
    },
  },
  mindful_walk: {
    title: 'Mindful Outdoor Walk',
    tagline: 'Step slow, breathe fresh air, and engage non-visual sensory awareness',
    objective: 'Disengage from hurry and analytical naming; cultivate open receptive attention to natural rhythms.',
    natureZone: 'Quiet trail, neighborhood tree-lined street, botanical garden, or lakeshore path',
    safetyReminder: 'Keep awareness of your immediate steps, trail edges, and road traffic. Stay within safe public areas.',
    recordingTip: 'Focus on experiential awareness: temperatures, air currents, aromas, and shifting light.',
    tasksByDifficulty: {
      gentle: [
        { instruction: 'Walk for 3 minutes at half your normal pace without checking your phone.', fieldTip: 'Feel the sensation of the soles of your feet contacting the earth.' },
        { instruction: 'Inhale deeply and identify two distinct outdoor aromas (loam, pine, rain, or blossoming flowers).', fieldTip: 'Notice how humidity magnifies organic scents.' },
        { instruction: 'Pause and feel the temperature and direction of the breeze on your face.', fieldTip: 'Sensory awareness grounds our nervous system in physical reality.' },
      ],
      curious: [
        { instruction: 'Practice peripheral awareness: soften your focus to perceive the canopy waving in the sky.', fieldTip: 'Broadening your field of view shifts the brain out of narrow task-tunnel vision.' },
        { instruction: 'Notice 4 subtle variations of sunlight: dappled shadows, backlit leaves, sky reflection in puddles.', fieldTip: 'Observe how leaves glow translucent when illuminated from behind.' },
        { instruction: 'Tune into acoustic layers: distant birdcalls, rustling dried leaves, gentle wind in needles.', fieldTip: 'Listen to silence between sounds rather than latching onto one noise.' },
        { instruction: 'Find an ordinary pebble or fallen leaf and hold it mindfully for 60 seconds.', fieldTip: 'Appreciate its weight, curve, imperfections, and uniqueness without judging it.' },
      ],
      explorer: [
        { instruction: 'Walk in rhythm with conscious breathing: four steps inhaling, four steps exhaling.', fieldTip: 'Aligning physical locomotion with respiration calms cognitive rumination.' },
        { instruction: 'Observe the micro-movements of air: how birch leaves tremble compared to stiff oak foliage.', fieldTip: 'Notice the physics of aerodynamic drag across different leaf petioles.' },
        { instruction: 'Trace natural fractal geometry: notice branching structures repeating from twigs to tree limbs.', fieldTip: 'Natural fractals stimulate restorative alpha brain wave states.' },
        { instruction: 'Observe transient natural phenomena: drifting clouds, dancing dust motes, dew evaporation.', fieldTip: 'Contemplate how nature is continuously flowing and never static.' },
        { instruction: 'Close the walk with a silent moment of gratitude for the living biosphere around you.', fieldTip: 'Prepare to return to your day refreshed, calm, and grounded.' },
      ],
    },
  },
}

export function generateMission(
  type: MissionType,
  durationMinutes: MissionDuration,
  difficulty: MissionDifficulty
): MissionDefinition {
  const template = MISSION_TEMPLATES[type] || MISSION_TEMPLATES.plant_detective
  const rawTasks = template.tasksByDifficulty[difficulty] || template.tasksByDifficulty.gentle

  // Adjust number of tasks according to duration:
  // 10 min -> 3 tasks
  // 20 min -> 4 tasks
  // 30 min -> all available tasks (up to 5)
  const taskCount = durationMinutes === 10 ? 3 : durationMinutes === 20 ? 4 : 5
  const selectedTasks = rawTasks.slice(0, Math.min(taskCount, rawTasks.length))

  const tasks = selectedTasks.map((t, idx) => ({
    id: `task-${idx + 1}`,
    instruction: t.instruction,
    fieldTip: t.fieldTip,
  }))

  return {
    id: `mission-${type}-${durationMinutes}m-${difficulty}-${Date.now()}`,
    type,
    title: template.title,
    tagline: template.tagline,
    objective: template.objective,
    durationMinutes,
    difficulty,
    tasks,
    safetyReminder: template.safetyReminder,
    recordingTip: template.recordingTip,
    natureZone: template.natureZone,
  }
}
