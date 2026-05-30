import { describe, it, expect } from 'vitest'
import { analyzeWorkout } from './workoutAnalyzer'
import session7x1km from './__fixtures__/7x1km_session.json'

describe('regression — 7×1km Coros session', () => {
  const result = analyzeWorkout(session7x1km)

  it('workoutType = "intervals"', () => {
    expect(result.workoutType).toBe('intervals')
  })

  it(`structure = "7×1km (2'15\")"`, () => {
    expect(result.structure).toBe(`7×1km (2'15")`)
  })

  it('1 seul set', () => {
    expect(result.sets).toHaveLength(1)
  })

  it('7 répétitions', () => {
    expect(result.sets[0].reps).toBe(7)
  })

  it('isTimeBased = false (distance-based)', () => {
    expect(result.sets[0].isTimeBased).toBe(false)
  })

  it('effortLabel = "1km"', () => {
    expect(result.sets[0].effortLabel).toBe('1km')
  })

  it('allure effort ≈ 3:26/km (±5s)', () => {
    expect(result.avgEffortPaceSeconds).toBeGreaterThan(201)
    expect(result.avgEffortPaceSeconds).toBeLessThan(211)
  })

  it('premier lap = warmup', () => {
    expect(result.laps[0].type).toBe('warmup')
  })

  it('dernier lap = cooldown', () => {
    expect(result.laps[result.laps.length - 1].type).toBe('cooldown')
  })

  it('15 laps au total (1 warmup + 7 efforts + 6 récups + 1 cooldown)', () => {
    expect(result.laps).toHaveLength(15)
  })
})
