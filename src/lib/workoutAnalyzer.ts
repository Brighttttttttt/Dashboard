export type LapType = 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'easy'

export interface LapData {
  index: number
  type: LapType
  distance: number        // km
  timerTime: number       // seconds (active time)
  elapsedTime: number     // seconds (total including pauses)
  avgSpeed: number        // km/h
  avgPace: string         // "3:45"
  avgPaceSeconds: number  // seconds per km
  avgHR: number
  maxHR: number
  avgCadence: number      // spm (already ×2)
  startTime: string
}

export interface IntervalSet {
  reps: number
  distanceLabel: string   // "1km", "800m"
  effortLabel: string     // "1km", "800m" or "1'15\"" — use this in UI
  isTimeBased: boolean
  avgEffortTime: number   // seconds (average per effort lap)
  avgEffortPace: string
  avgEffortPaceSeconds: number
  avgRecoveryTime: number // seconds
  recoveryLabel: string   // "1'30\"", "200m" or "" if no recovery
  efforts: LapData[]
  recoveries: LapData[]
}

export interface WorkoutAnalysis {
  workoutType: 'intervals' | 'easy' | 'tempo' | 'unknown'
  structure: string           // "7×1km"
  sport: string
  totalDistance: number       // km
  totalDuration: number       // seconds elapsed
  activeTime: number          // seconds timer
  avgHR: number
  totalEffortDistance: number // km
  totalEffortTime: number     // seconds
  avgEffortPace: string
  avgEffortPaceSeconds: number
  warmupDistance: number      // km
  cooldownDistance: number    // km
  laps: LapData[]
  sets: IntervalSet[]
}

// ─── helpers ────────────────────────────────────────────────────────────────

export function speedToPaceSeconds(speedKmh: number): number {
  if (!speedKmh || speedKmh <= 0) return 0
  return 3600 / speedKmh
}

export function formatPace(paceSeconds: number): string {
  if (!paceSeconds || paceSeconds <= 0) return '--:--'
  const min = Math.floor(paceSeconds / 60)
  const sec = Math.round(paceSeconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function cv(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

const DURATION_SNAP_SECONDS = 5  // adjust to change snap granularity for set title labels

export function formatDurationLabel(seconds: number): string {
  const snapped = Math.round(seconds / DURATION_SNAP_SECONDS) * DURATION_SNAP_SECONDS
  const min = Math.floor(snapped / 60)
  const sec = snapped % 60
  if (min === 0) return `${sec}"`
  if (sec === 0) return `${min}'`
  return `${min}'${sec.toString().padStart(2, '0')}"`
}

export function roundDistance(distanceKm: number): string {
  const m = distanceKm * 1000
  const standards = [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000, 10000]
  const nearest = standards.reduce((prev, curr) =>
    Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
  )
  if (Math.abs(nearest - m) / m < 0.10) {
    return nearest >= 1000 ? `${nearest / 1000}km` : `${nearest}m`
  }
  // fallback: valeur brute
  return m >= 1000 ? `${(distanceKm).toFixed(2)}km` : `${Math.round(m)}m`
}

function isDistanceStandard(distanceKm: number): boolean {
  const m = distanceKm * 1000
  const standards = [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000, 10000]
  const nearest = standards.reduce((prev, curr) =>
    Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
  )
  return Math.abs(nearest - m) / m < 0.10
}

// ─── HR zones ────────────────────────────────────────────────────────────────

export type HRZoneMethod = 'hrmax' | 'lthr' | 'karvonen'

export interface HRZoneConfig {
  method: HRZoneMethod
  fcMax?: number   // required for 'hrmax' and 'karvonen'
  lthr?: number    // required for 'lthr'
  fcRest?: number  // required for 'karvonen'
}

export function getHRZone(hr: number, config: HRZoneConfig): 1 | 2 | 3 | 4 | 5 | null {
  if (!hr || hr <= 0) return null

  if (config.method === 'hrmax') {
    if (!config.fcMax || config.fcMax <= 0) return null
    const pct = hr / config.fcMax
    if (pct < 0.60) return 1
    if (pct < 0.70) return 2
    if (pct < 0.80) return 3
    if (pct < 0.90) return 4
    return 5
  }

  if (config.method === 'lthr') {
    if (!config.lthr || config.lthr <= 0) return null
    const pct = hr / config.lthr
    if (pct < 0.85) return 1
    if (pct < 0.90) return 2
    if (pct < 0.95) return 3
    if (pct < 1.00) return 4
    return 5
  }

  if (config.method === 'karvonen') {
    if (!config.fcMax || config.fcMax <= 0 || !config.fcRest || config.fcRest <= 0) return null
    const reserve = config.fcMax - config.fcRest
    if (reserve <= 0) return null
    const pct = (hr - config.fcRest) / reserve
    if (pct < 0.50) return 1
    if (pct < 0.60) return 2
    if (pct < 0.70) return 3
    if (pct < 0.80) return 4
    return 5
  }

  return null
}

// Recovery: prefer time by default; use distance only if clearly more regular or snaps to a standard
export function formatRecoveryLabel(avgTimeSec: number, avgDistKm: number, timesCV = 0, distsCV = 0): string {
  if (isDistanceStandard(avgDistKm)) return roundDistance(avgDistKm)
  if (distsCV < timesCV * 0.7) return roundDistance(avgDistKm)
  return formatDurationLabel(Math.round(avgTimeSec))
}

// ─── main classifier ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyzeWorkout(fitData: any): WorkoutAnalysis {
  const rawLaps = (fitData.laps ?? []) as any[]
  const session = fitData.sessions?.[0] ?? {}

  if (!rawLaps.length) {
    return emptyAnalysis(session)
  }

  // ── Step 1: find max speed (excluding obvious pauses / 0-speed laps) ──
  const maxSpeed = Math.max(...rawLaps.map((l: any) => l.avg_speed ?? 0))

  // ── Step 2: classify each lap ──
  const effortThreshold = maxSpeed * 0.80

  const laps: LapData[] = rawLaps.map((l: any, i: number) => {
    const speed = l.avg_speed ?? 0
    const dist = l.total_distance ?? 0
    const timer = l.total_timer_time ?? 0

    let type: LapType = 'easy'
    if (speed < 5 || (dist < 0.15 && timer > 30)) {
      type = 'recovery'
    } else if (speed >= effortThreshold) {
      type = 'effort'
    }

    const paceSeconds = speedToPaceSeconds(speed)
    return {
      index: i,
      type,
      distance: dist,
      timerTime: timer,
      elapsedTime: l.total_elapsed_time ?? timer,
      avgSpeed: speed,
      avgPace: formatPace(paceSeconds),
      avgPaceSeconds: paceSeconds,
      avgHR: l.avg_heart_rate ?? 0,
      maxHR: l.max_heart_rate ?? 0,
      avgCadence: (l.avg_cadence ?? 0) * 2,
      startTime: l.start_time ?? '',
    }
  })

  // ── Step 3: warmup / cooldown boundaries ──
  const firstIntervalIdx = laps.findIndex(l => l.type === 'effort' || l.type === 'recovery')
  const lastIntervalIdx = [...laps].map(l => l.type).lastIndexOf('effort' as LapType)
  const lastRecovIdx = [...laps].map(l => l.type).lastIndexOf('recovery' as LapType)
  const lastBoundary = Math.max(lastIntervalIdx, lastRecovIdx)

  for (let i = 0; i < laps.length; i++) {
    if (laps[i].type === 'easy') {
      if (firstIntervalIdx === -1 || i < firstIntervalIdx) {
        laps[i].type = 'warmup'
      } else if (lastBoundary !== -1 && i > lastBoundary) {
        laps[i].type = 'cooldown'
      }
    }
  }

  // ── Step 4: build interval sets ──
  const effortLaps = laps.filter(l => l.type === 'effort')
  const recoveryLaps = laps.filter(l => l.type === 'recovery')

  const sets: IntervalSet[] = []
  let interSetRecoveryLabel = ''

  if (effortLaps.length > 0) {
    // Detect set boundaries: a recovery that is > 2× average recovery duration → new set
    const avgRecovery = recoveryLaps.length
      ? recoveryLaps.reduce((s, l) => s + l.timerTime, 0) / recoveryLaps.length
      : 0

    // Group efforts/recoveries into sets
    // Simple: find sequences separated by "super-recovery" (much longer than average)
    const setThreshold = avgRecovery * 2.5

    let currentSetEfforts: LapData[] = []
    let currentSetRecoveries: LapData[] = []
    const rawSets: Array<{ efforts: LapData[]; recoveries: LapData[] }> = []
    const superRecoveryLaps: LapData[] = []

    // Walk through the interval block laps in order
    const intervalBlock = laps.filter(
      l => l.type === 'effort' || l.type === 'recovery'
    )

    for (let i = 0; i < intervalBlock.length; i++) {
      const lap = intervalBlock[i]
      if (lap.type === 'effort') {
        currentSetEfforts.push(lap)
      } else {
        // recovery – check if it's a set break
        if (setThreshold > 0 && lap.timerTime > setThreshold && currentSetEfforts.length > 0) {
          rawSets.push({ efforts: currentSetEfforts, recoveries: currentSetRecoveries })
          currentSetEfforts = []
          currentSetRecoveries = []
          superRecoveryLaps.push(lap)
        } else {
          currentSetRecoveries.push(lap)
        }
      }
    }
    if (currentSetEfforts.length > 0) {
      rawSets.push({ efforts: currentSetEfforts, recoveries: currentSetRecoveries })
    }

    if (superRecoveryLaps.length > 0) {
      const avgInterTimeSec = superRecoveryLaps.reduce((s, l) => s + l.timerTime, 0) / superRecoveryLaps.length
      const avgInterDistKm = superRecoveryLaps.reduce((s, l) => s + l.distance, 0) / superRecoveryLaps.length
      const interTimesCV = cv(superRecoveryLaps.map(l => l.timerTime))
      const interDistsCV = cv(superRecoveryLaps.map(l => l.distance))
      interSetRecoveryLabel = formatRecoveryLabel(avgInterTimeSec, avgInterDistKm, interTimesCV, interDistsCV)
    }

    for (const raw of rawSets) {
      const avgEffortSpeed =
        raw.efforts.reduce((s, l) => s + l.avgSpeed, 0) / raw.efforts.length
      const avgEffortPaceSeconds = speedToPaceSeconds(avgEffortSpeed)
      const avgDistKm =
        raw.efforts.reduce((s, l) => s + l.distance, 0) / raw.efforts.length
      const avgTimeSec =
        raw.efforts.reduce((s, l) => s + l.timerTime, 0) / raw.efforts.length
      const avgRec =
        raw.recoveries.length
          ? raw.recoveries.reduce((s, l) => s + l.timerTime, 0) / raw.recoveries.length
          : 0
      const avgRecDistKm =
        raw.recoveries.length
          ? raw.recoveries.reduce((s, l) => s + l.distance, 0) / raw.recoveries.length
          : 0
      const recTimesCV = cv(raw.recoveries.map(l => l.timerTime))
      const recDistsCV = cv(raw.recoveries.map(l => l.distance))
      const recoveryLabel = raw.recoveries.length > 0
        ? formatRecoveryLabel(avgRec, avgRecDistKm, recTimesCV, recDistsCV)
        : ''

      // Time-based detection: time CV much lower than distance CV → watch beeped on timer
      const timesCV = cv(raw.efforts.map(l => l.timerTime))
      const distsCV = cv(raw.efforts.map(l => l.distance))
      // Si la distance snape vers une valeur standard (400m, 500m, 1km…) → distance-based,
      // même si les temps sont aussi réguliers (ex : 2×500m avec 503m/1:36 et 512m/1:35)
      const isTimeBased = !isDistanceStandard(avgDistKm)
        && raw.efforts.length >= 2
        && timesCV < distsCV * 0.7

      const distanceLabel = roundDistance(avgDistKm)
      const effortLabel = isTimeBased ? formatDurationLabel(Math.round(avgTimeSec)) : distanceLabel

      sets.push({
        reps: raw.efforts.length,
        distanceLabel,
        effortLabel,
        isTimeBased,
        avgEffortTime: avgTimeSec,
        avgEffortPace: formatPace(avgEffortPaceSeconds),
        avgEffortPaceSeconds,
        avgRecoveryTime: avgRec,
        recoveryLabel,
        efforts: raw.efforts,
        recoveries: raw.recoveries,
      })
    }
  }

  // ── Step 5: global metrics ──
  const warmupLaps = laps.filter(l => l.type === 'warmup')
  const cooldownLaps = laps.filter(l => l.type === 'cooldown')

  const warmupDistance = warmupLaps.reduce((s, l) => s + l.distance, 0)
  const cooldownDistance = cooldownLaps.reduce((s, l) => s + l.distance, 0)
  const totalEffortDistance = effortLaps.reduce((s, l) => s + l.distance, 0)
  const totalEffortTime = effortLaps.reduce((s, l) => s + l.timerTime, 0)

  const avgEffortSpeed =
    effortLaps.length
      ? effortLaps.reduce((s, l) => s + l.avgSpeed, 0) / effortLaps.length
      : 0
  const avgEffortPaceSeconds = speedToPaceSeconds(avgEffortSpeed)

  // ── Step 6: structure string ──
  let structure = ''
  if (sets.length === 1) {
    const recSuffix = sets[0].recoveryLabel ? ` (${sets[0].recoveryLabel})` : ''
    structure = `${sets[0].reps}×${sets[0].effortLabel}${recSuffix}`
  } else if (sets.length > 1) {
    const allSameLabel = sets.every(s => s.effortLabel === sets[0].effortLabel)
    if (allSameLabel && sets.every(s => s.reps === sets[0].reps)) {
      const recLabel = sets[0].recoveryLabel
      const recSuffix = (recLabel || interSetRecoveryLabel)
        ? ` (${[recLabel, interSetRecoveryLabel].filter(Boolean).join('/')})`
        : ''
      structure = `${sets.length}×(${sets[0].reps}×${sets[0].effortLabel})${recSuffix}`
    } else {
      structure = sets.map(s => {
        const recSuffix = s.recoveryLabel ? ` (${s.recoveryLabel})` : ''
        return `${s.reps}×${s.effortLabel}${recSuffix}`
      }).join(' + ')
    }
  }

  const workoutType =
    effortLaps.length > 0 ? 'intervals' : 'easy'

  return {
    workoutType,
    structure,
    sport: session.sport ?? 'running',
    totalDistance: session.total_distance ?? 0,
    totalDuration: session.total_elapsed_time ?? 0,
    activeTime: session.total_timer_time ?? 0,
    avgHR: session.avg_heart_rate ?? 0,
    totalEffortDistance,
    totalEffortTime,
    avgEffortPace: formatPace(avgEffortPaceSeconds),
    avgEffortPaceSeconds,
    warmupDistance,
    cooldownDistance,
    laps,
    sets,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emptyAnalysis(session: any): WorkoutAnalysis {
  return {
    workoutType: 'unknown',
    structure: '',
    sport: session.sport ?? 'running',
    totalDistance: session.total_distance ?? 0,
    totalDuration: session.total_elapsed_time ?? 0,
    activeTime: session.total_timer_time ?? 0,
    avgHR: session.avg_heart_rate ?? 0,
    totalEffortDistance: 0,
    totalEffortTime: 0,
    avgEffortPace: '--:--',
    avgEffortPaceSeconds: 0,
    warmupDistance: 0,
    cooldownDistance: 0,
    laps: [],
    sets: [],
  }
}
