import { describe, it, expect } from 'vitest'
import { generateMission } from '../data/missions'
import type { MissionType, MissionDuration, MissionDifficulty } from '../types'

describe('Mission Generator', () => {
  it('generates a valid mission with required properties', () => {
    const mission = generateMission('plant_detective', 20, 'curious')
    expect(mission.id).toContain('mission-plant_detective-20m-curious')
    expect(mission.title).toBe('Plant Detective')
    expect(mission.objective).toBeDefined()
    expect(mission.safetyReminder).toContain('Never touch plants with stinging hairs')
    expect(mission.recordingTip).toBeDefined()
    expect(mission.tasks.length).toBe(4) // 20 min -> 4 tasks
  })

  it('adjusts task count according to duration', () => {
    const m10 = generateMission('backyard_biodiversity', 10, 'gentle')
    expect(m10.tasks.length).toBe(3)

    const m20 = generateMission('nature_texture', 20, 'curious')
    expect(m20.tasks.length).toBe(4)

    const m30 = generateMission('mindful_walk', 30, 'explorer')
    expect(m30.tasks.length).toBe(5)
  })

  it('supports all 5 mission types and all 3 difficulties', () => {
    const types: MissionType[] = [
      'plant_detective',
      'backyard_biodiversity',
      'bird_habitat',
      'nature_texture',
      'mindful_walk',
    ]
    const difficulties: MissionDifficulty[] = ['gentle', 'curious', 'explorer']
    const durations: MissionDuration[] = [10, 20, 30]

    for (const type of types) {
      for (const diff of difficulties) {
        for (const dur of durations) {
          const mission = generateMission(type, dur, diff)
          expect(mission.tasks.length).toBeGreaterThanOrEqual(3)
          expect(mission.objective.length).toBeGreaterThan(10)
          expect(mission.safetyReminder.length).toBeGreaterThan(10)
        }
      }
    }
  })
})
