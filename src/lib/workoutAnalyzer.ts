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

function speedToPaceSeconds(speedKmh: number): number {
  if (!speedKmh || speedKmh <= 0) return 0
  return 3600 / speedKmh
}

function formatPace(paceSeconds: number): string {
  if (!paceSeconds || paceSeconds <= 0) return '--:--'
  const min = Math.floor(paceSeconds / 60)
  const sec = Math.round(paceSeconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function cv(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

function formatDurationLabel(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  if (min === 0) return `${sec}"`
  if (sec === 0) return `${min}'`
  return `${min}'${sec.toString().padStart(2, '0')}"`
}

function roundDistance(distanceKm: number): string {
  const m = distanceKm * 1000
  // Round to nearest standard distance
  const standards = [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000, 10000]
  const nearest = standards.reduce((prev, curr) =>
    Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
  )
  if (Math.abs(nearest - m) / m < 0.08) {
    return nearest >= 1000 ? `${nearest / 1000}km` : `${nearest}m`
  }
  // fallback
  return m >= 1000 ? `${(distanceKm).toFixed(2)}km` : `${Math.round(m)}m`
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
        } else {
          currentSetRecoveries.push(lap)
        }
      }
    }
    if (currentSetEfforts.length > 0) {
      rawSets.push({ efforts: currentSetEfforts, recoveries: currentSetRecoveries })
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

      // Time-based detection: time CV much lower than distance CV → watch beeped on timer
      const timesCV = cv(raw.efforts.map(l => l.timerTime))
      const distsCV = cv(raw.efforts.map(l => l.distance))
      const isTimeBased = raw.efforts.length >= 2 && timesCV < distsCV * 0.7

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
    structure = `${sets[0].reps}×${sets[0].effortLabel}`
  } else if (sets.length > 1) {
    const allSameLabel = sets.every(s => s.effortLabel === sets[0].effortLabel)
    if (allSameLabel && sets.every(s => s.reps === sets[0].reps)) {
      structure = `${sets.length}×(${sets[0].reps}×${sets[0].effortLabel})`
    } else {
      structure = sets.map(s => `${s.reps}×${s.effortLabel}`).join(' + ')
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
