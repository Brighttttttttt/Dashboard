import { describe, it, expect } from 'vitest'
import {
  analyzeWorkout,
  computePaceTrend,
  formatDurationLabel,
  formatRecoveryLabel,
  getHRZone,
  roundDistance,
  formatPace,
  speedToPaceSeconds,
  cv,
} from './workoutAnalyzer'
import type { HRZoneConfig, LapData } from './workoutAnalyzer'

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

// ─── getHRZone ────────────────────────────────────────────────────────────────

describe('getHRZone — % FCmax (fcMax=190)', () => {
  const cfg: HRZoneConfig = { method: 'hrmax', fcMax: 190 }
  it('Z1 (110 bpm = 57.9%)', () => expect(getHRZone(110, cfg)).toBe(1))
  it('Z2 (125 bpm = 65.8%)', () => expect(getHRZone(125, cfg)).toBe(2))
  it('Z3 (145 bpm = 76.3%)', () => expect(getHRZone(145, cfg)).toBe(3))
  it('Z4 (163 bpm = 85.8%)', () => expect(getHRZone(163, cfg)).toBe(4))
  it('Z5 (180 bpm = 94.7%)', () => expect(getHRZone(180, cfg)).toBe(5))
  it('hr=0 → null', () => expect(getHRZone(0, cfg)).toBeNull())
  it('fcMax absent → null', () => expect(getHRZone(150, { method: 'hrmax' })).toBeNull())
})

describe('getHRZone — FC seuil LTHR (lthr=165)', () => {
  const cfg: HRZoneConfig = { method: 'lthr', lthr: 165 }
  it('Z1 (135 bpm = 81.8%)', () => expect(getHRZone(135, cfg)).toBe(1))
  it('Z2 (143 bpm = 86.7%)', () => expect(getHRZone(143, cfg)).toBe(2))
  it('Z3 (153 bpm = 92.7%)', () => expect(getHRZone(153, cfg)).toBe(3))
  it('Z4 (161 bpm = 97.6%)', () => expect(getHRZone(161, cfg)).toBe(4))
  it('Z5 (170 bpm = 103%)', () => expect(getHRZone(170, cfg)).toBe(5))
  it('lthr absent → null', () => expect(getHRZone(150, { method: 'lthr' })).toBeNull())
})

describe('getHRZone — Karvonen (fcMax=190, fcRest=50, réserve=140)', () => {
  const cfg: HRZoneConfig = { method: 'karvonen', fcMax: 190, fcRest: 50 }
  it('Z1 (90 bpm = 28.6% FCR)', () => expect(getHRZone(90, cfg)).toBe(1))
  it('Z2 (125 bpm = 53.6% FCR)', () => expect(getHRZone(125, cfg)).toBe(2))
  it('Z3 (137 bpm = 62.1% FCR)', () => expect(getHRZone(137, cfg)).toBe(3))
  it('Z4 (150 bpm = 71.4% FCR)', () => expect(getHRZone(150, cfg)).toBe(4))
  it('Z5 (165 bpm = 82.1% FCR)', () => expect(getHRZone(165, cfg)).toBe(5))
  it('fcMax absent → null', () => expect(getHRZone(150, { method: 'karvonen', fcRest: 50 })).toBeNull())
  it('fcRest absent → null', () => expect(getHRZone(150, { method: 'karvonen', fcMax: 190 })).toBeNull())
})

// ─── formatRecoveryLabel ─────────────────────────────────────────────────────

describe('formatRecoveryLabel', () => {
  it('distance standard → label distance (100m)', () => expect(formatRecoveryLabel(60, 0.10)).toBe('100m'))
  it('distance standard → label distance (300m)', () => expect(formatRecoveryLabel(300, 0.30)).toBe('300m'))
  it('distance non-standard, CVs nuls → time-based par défaut', () => expect(formatRecoveryLabel(135, 0.15)).toBe(`2'15"`))
  it('distance non-standard, CVs nuls → time-based (60s → "1\'")', () => expect(formatRecoveryLabel(60, 0.067)).toBe(`1'`))
  it('distance clairement plus régulière → distance-based', () => expect(formatRecoveryLabel(90, 0.17, 0.08, 0.02)).toBe('170m'))
  it('temps clairement plus régulier → time-based', () => expect(formatRecoveryLabel(90, 0.17, 0.02, 0.08)).toBe(`1'30"`))
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

  it(`structure "7×1km (2'15")"`, () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe(`7×1km (2'15")`)
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
  // Temps très stables (~90s), distances variables dans la zone 335-360m
  // (hors de toute distance standard → snapping désactivé → détection par CV)
  const effortData = [
    { dist: 0.335, timer: 89 },
    { dist: 0.360, timer: 91 },
    { dist: 0.345, timer: 90 },
    { dist: 0.355, timer: 89 },
    { dist: 0.340, timer: 91 },
    { dist: 0.350, timer: 90 },
  ]
  const efforts = effortData.map(({ dist, timer }) => mkLap((dist / timer) * 3600, dist, timer))
  const recs = Array.from({ length: 5 }, () => mkLap(4, 0.1, 60))
  const laps = efforts.flatMap((e, i) => i < 5 ? [e, recs[i]] : [e])

  it(`structure "6×1'30" (100m)"`, () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe(`6×1'30" (100m)`)
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

  it(`structure "2×(4×400m) (1'/300m)"`, () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe(`2×(4×400m) (1'/300m)`)
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

  it(`structure "3×400m (1') + 3×800m (1')"`, () => {
    expect(analyzeWorkout(mkFit(laps)).structure).toBe(`3×400m (1') + 3×800m (1')`)
  })
})

describe('analyzeWorkout — 2×500m (distance et temps tous les deux réguliers)', () => {
  // Cas réel : 503m/1:36 + 512m/1:35
  // CV(temps)≈0.005, CV(dist)≈0.009 → ratio 0.56 → sans guard distanceStandard,
  // classé time-based à tort (507m snape vers 500m → distance-based attendu)
  const efforts = [
    mkLap((0.503 / 96) * 3600, 0.503, 96),
    mkLap((0.512 / 95) * 3600, 0.512, 95),
  ]

  it('isTimeBased = false (500m est une distance standard)', () => {
    expect(analyzeWorkout(mkFit(efforts)).sets[0].isTimeBased).toBe(false)
  })
  it('structure = "2×500m"', () => {
    expect(analyzeWorkout(mkFit(efforts)).structure).toBe('2×500m')
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

// ─── computePaceTrend ─────────────────────────────────────────────────────────

function mkEffortLap(speed: number): LapData {
  return { avgSpeed: speed } as LapData
}

describe('computePaceTrend', () => {
  it('renvoie steady si aucun lap', () => {
    expect(computePaceTrend([])).toBe('steady')
  })
  it('renvoie steady si 1 seul lap', () => {
    expect(computePaceTrend([mkEffortLap(17)])).toBe('steady')
  })
  it('détecte une progression (2e moitié +3.5%)', () => {
    expect(computePaceTrend([mkEffortLap(17), mkEffortLap(17.6)])).toBe('progressive')
  })
  it('détecte un déclin (2e moitié -3.5%)', () => {
    expect(computePaceTrend([mkEffortLap(17.6), mkEffortLap(17)])).toBe('declining')
  })
  it('renvoie steady si écart < 2% (1.2%)', () => {
    expect(computePaceTrend([mkEffortLap(17), mkEffortLap(17.2)])).toBe('steady')
  })
  it('4 reps croissantes → progressive', () => {
    const laps = [16, 16.5, 17, 17.5].map(mkEffortLap)
    expect(computePaceTrend(laps)).toBe('progressive')
  })
  it('4 reps décroissantes → declining', () => {
    const laps = [17.5, 17, 16.5, 16].map(mkEffortLap)
    expect(computePaceTrend(laps)).toBe('declining')
  })
})
