import { describe, it, expect } from 'vitest'
import {
  analyzeWorkout,
  formatDurationLabel,
  roundDistance,
  formatPace,
  speedToPaceSeconds,
  cv,
} from './workoutAnalyzer'

// ─── helpers ─────────────────────────────────────────────────────────────────

function mkLap(speed: number, distKm: number, timerSec: number) {
  return {
    avg_speed: speed,
    total_distance: distKm,
    total_timer_time: timerSec,
    total_elapsed_time: timerSec,
    avg_heart_rate: 150,
    max_heart_rate: 170,
    avg_cadence: 90,
    start_time: '',
  }
}

function mkFit(laps: ReturnType<typeof mkLap>[]) {
  return {
    laps,
    sessions: [{
      sport: 'running',
      total_distance: laps.reduce((s, l) => s + l.total_distance, 0),
      total_elapsed_time: laps.reduce((s, l) => s + l.total_elapsed_time, 0),
      total_timer_time: laps.reduce((s, l) => s + l.total_timer_time, 0),
      avg_heart_rate: 150,
    }],
  }
}

// ─── formatDurationLabel ─────────────────────────────────────────────────────

describe('formatDurationLabel', () => {
  it(`arrondit vers le bas (76s → 1'15")`, () => expect(formatDurationLabel(76)).toBe(`1'15"`))
  it(`arrondit vers le haut (78s → 1'20")`, () => expect(formatDurationLabel(78)).toBe(`1'20"`))
  it(`minutes rondes sans secondes (60s → 1')`, () => expect(formatDurationLabel(60)).toBe(`1'`))
  it(`minutes et secondes (90s → 1'30")`, () => expect(formatDurationLabel(90)).toBe(`1'30"`))
  it(`secondes seules (47s → 45")`, () => expect(formatDurationLabel(47)).toBe(`45"`))
  it(`zéro (0s → 0")`, () => expect(formatDurationLabel(0)).toBe(`0"`))
})

// ─── roundDistance ────────────────────────────────────────────────────────────

describe('roundDistance', () => {
  it('snaps 405m → 400m (1.2%)', () => expect(roundDistance(0.405)).toBe('400m'))
  it('snaps 1km exact → 1km', () => expect(roundDistance(1.00)).toBe('1km'))
  it('snaps 1.05km → 1km (4.8%)', () => expect(roundDistance(1.05)).toBe('1km'))
  it('snaps 1.09km → 1km (8.3%)', () => expect(roundDistance(1.09)).toBe('1km'))
  it('snaps 880m → 800m (9.1%)', () => expect(roundDistance(0.88)).toBe('800m'))
  it('snaps 4.95km → 5km (1%)', () => expect(roundDistance(4.95)).toBe('5km'))
  it('fallback brut 720m (11.1% > 10%)', () => expect(roundDistance(0.72)).toBe('720m'))
})

// ─── formatPace ───────────────────────────────────────────────────────────────

describe('formatPace', () => {
  it('206s → 3:26', () => expect(formatPace(206)).toBe('3:26'))
  it('300s → 5:00', () => expect(formatPace(300)).toBe('5:00'))
  it('61s → 1:01', () => expect(formatPace(61)).toBe('1:01'))
  it('0s → --:--', () => expect(formatPace(0)).toBe('--:--'))
})

// ─── speedToPaceSeconds ───────────────────────────────────────────────────────

describe('speedToPaceSeconds', () => {
  it('17.5 km/h → ~205.7 s/km', () => expect(speedToPaceSeconds(17.5)).toBeCloseTo(205.7, 1))
  it('10 km/h → 360 s/km', () => expect(speedToPaceSeconds(10)).toBe(360))
  it('0 km/h → 0', () => expect(speedToPaceSeconds(0)).toBe(0))
})

// ─── cv ───────────────────────────────────────────────────────────────────────

describe('cv', () => {
  it('valeurs identiques → 0', () => expect(cv([90, 90, 90])).toBe(0))
  it('une seule valeur → 0', () => expect(cv([90])).toBe(0))
  it('tableau vide → 0', () => expect(cv([])).toBe(0))
  it('[80, 90, 100, 110] → ~0.118', () => expect(cv([80, 90, 100, 110])).toBeCloseTo(0.118, 2))
  it('moyenne zéro → 0', () => expect(cv([0, 0, 0])).toBe(0))
})

// ─── classification des laps ──────────────────────────────────────────────────

describe('classification des laps', () => {
  it('speed < 5 km/h → recovery', () => {
    const { laps } = analyzeWorkout(mkFit([mkLap(4, 0.3, 270)]))
    expect(laps[0].type).toBe('recovery')
  })

  it('dist < 0.15km ET timer > 30s → recovery (pause courte)', () => {
    // speed=8 est au-dessus du seuil, mais la condition de pause prend la priorité
    const { laps } = analyzeWorkout(mkFit([mkLap(8, 0.10, 45)]))
    expect(laps[0].type).toBe('recovery')
  })

  it('speed >= maxSpeed×0.80 → effort', () => {
    // maxSpeed=17.5, threshold=14 ; lap[1] à 17.5 ≥ 14 → effort
    const { laps } = analyzeWorkout(mkFit([
      mkLap(10, 0.5, 180),
      mkLap(17.5, 1.0, 206),
    ]))
    expect(laps[1].type).toBe('effort')
  })

  it('5 ≤ speed < maxSpeed×0.80, entre deux efforts → easy', () => {
    // threshold=14 ; lap[1] à 10 < 14, entre deux efforts → reste easy (pas warmup/cooldown)
    const { laps } = analyzeWorkout(mkFit([
      mkLap(17.5, 1.0, 206),
      mkLap(10, 1.0, 360),
      mkLap(17.5, 1.0, 206),
    ]))
    expect(laps[1].type).toBe('easy')
  })

  it('lap easy avant le premier effort → warmup', () => {
    const { laps } = analyzeWorkout(mkFit([
      mkLap(10, 1.0, 360),
      mkLap(17.5, 1.0, 206),
      mkLap(4, 0.15, 135),
    ]))
    expect(laps[0].type).toBe('warmup')
  })

  it('lap easy après le dernier effort/récup → cooldown', () => {
    const { laps } = analyzeWorkout(mkFit([
      mkLap(17.5, 1.0, 206),
      mkLap(4, 0.15, 135),
      mkLap(10, 1.0, 360),
    ]))
    expect(laps[2].type).toBe('cooldown')
  })
})

// ─── analyzeWorkout — scénarios complets ─────────────────────────────────────

describe('analyzeWorkout — 7×1km (distance-based)', () => {
  // maxSpeed=17.5, threshold=14 ; temps proportionnels aux distances → CV identiques → isTimeBased=false
  const dists = [1.00, 1.01, 0.99, 1.00, 1.02, 0.99, 1.00]
  const efforts = dists.map(d => mkLap(17.5, d, (d / 17.5) * 3600))
  const recs = Array.from({ length: 6 }, () => mkLap(4, 0.15, 135))
  const laps = [
    mkLap(10, 1.0, 360), // warmup
    ...efforts.flatMap((e, i) => i < 6 ? [e, recs[i]] : [e]),
    mkLap(10, 1.0, 360), // cooldown
  ]

  it('structure "7×1km"', () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe('7×1km')
  })
  it('1 set, 7 reps', () => {
    const { sets } = analyzeWorkout(mkFit(laps))
    expect(sets).toHaveLength(1)
    expect(sets[0].reps).toBe(7)
  })
  it('isTimeBased = false', () => {
    expect(analyzeWorkout(mkFit(laps)).sets[0].isTimeBased).toBe(false)
  })
  it('warmup et cooldown bien classifiés', () => {
    const { laps: result } = analyzeWorkout(mkFit(laps))
    expect(result[0].type).toBe('warmup')
    expect(result[result.length - 1].type).toBe('cooldown')
  })
})

describe(`analyzeWorkout — 6×1'30" (time-based)`, () => {
  // Temps très stables (~90s), distances variables → CV(temps) << CV(distances) → isTimeBased=true
  const effortData = [
    { dist: 0.38, timer: 89 },
    { dist: 0.41, timer: 91 },
    { dist: 0.39, timer: 90 },
    { dist: 0.40, timer: 89 },
    { dist: 0.37, timer: 91 },
    { dist: 0.42, timer: 90 },
  ]
  const efforts = effortData.map(({ dist, timer }) => mkLap((dist / timer) * 3600, dist, timer))
  const recs = Array.from({ length: 5 }, () => mkLap(4, 0.1, 60))
  const laps = efforts.flatMap((e, i) => i < 5 ? [e, recs[i]] : [e])

  it(`structure "6×1'30""`, () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe(`6×1'30"`)
  })
  it('isTimeBased = true', () => {
    expect(analyzeWorkout(mkFit(laps)).sets[0].isTimeBased).toBe(true)
  })
  it(`effortLabel = "1'30""`, () => {
    expect(analyzeWorkout(mkFit(laps)).sets[0].effortLabel).toBe(`1'30"`)
  })
})

describe('analyzeWorkout — 2×(4×400m) (multi-séries)', () => {
  // Récup courte: 60s, super-récup: 300s
  // avgRecovery = (6×60 + 300)/7 ≈ 94s, seuil = 94×2.5 ≈ 235s < 300s → split ✓
  const effort = () => mkLap(15, 0.40, 96)
  const rec = () => mkLap(4, 0.067, 60)
  const superRec = mkLap(3.6, 0.30, 300)
  const laps = [
    mkLap(10, 1.0, 360),           // warmup
    effort(), rec(), effort(), rec(), effort(), rec(), effort(), // série 1
    superRec,                                                    // séparation
    effort(), rec(), effort(), rec(), effort(), rec(), effort(), // série 2
    mkLap(10, 1.0, 360),           // cooldown
  ]

  it('structure "2×(4×400m)"', () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe('2×(4×400m)')
  })
  it('2 sets de 4 reps chacun', () => {
    const { sets } = analyzeWorkout(mkFit(laps))
    expect(sets).toHaveLength(2)
    expect(sets[0].reps).toBe(4)
    expect(sets[1].reps).toBe(4)
  })
})

describe('analyzeWorkout — 3×400m + 3×800m (séries mixtes)', () => {
  // Distances légèrement variables pour éviter le cas-limite FP (CV=0 exact vs CV≈0)
  const mk = (dist: number) => mkLap(15, dist, (dist / 15) * 3600)
  const rec = () => mkLap(4, 0.067, 60)
  const superRec = mkLap(3.6, 0.30, 300)
  const laps = [
    mk(0.40), rec(), mk(0.41), rec(), mk(0.39),
    superRec,
    mk(0.80), rec(), mk(0.81), rec(), mk(0.79),
  ]

  it('structure "3×400m + 3×800m"', () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe('3×400m + 3×800m')
  })
})

describe('analyzeWorkout — séance facile (aucun effort)', () => {
  // Tous les laps à speed < 5 → recovery → effortLaps vide → workoutType='easy'
  const laps = Array.from({ length: 5 }, () => mkLap(4, 0.5, 450))

  it('workoutType = "easy"', () => {
    expect(analyzeWorkout(mkFit(laps)).workoutType).toBe('easy')
  })
  it('aucun set', () => {
    expect(analyzeWorkout(mkFit(laps)).sets).toHaveLength(0)
  })
  it('structure vide', () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe('')
  })
})

describe('analyzeWorkout — fichier vide (0 laps)', () => {
  it('workoutType = "unknown", pas de crash', () => {
    expect(analyzeWorkout({ laps: [], sessions: [] }).workoutType).toBe('unknown')
  })
  it('aucun set', () => {
    expect(analyzeWorkout({ laps: [], sessions: [] }).sets).toHaveLength(0)
  })
})

describe("analyzeWorkout — 1 seul lap d'effort", () => {
  const laps = [mkLap(17.5, 1.0, 206)]

  it('1 set, 1 rep', () => {
    const { sets } = analyzeWorkout(mkFit(laps))
    expect(sets).toHaveLength(1)
    expect(sets[0].reps).toBe(1)
  })
  it('pas de crash', () => {
    expect(() => analyzeWorkout(mkFit(laps))).not.toThrow()
  })
})
