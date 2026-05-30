'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { formatPace } from '@/lib/workoutAnalyzer'
import type { WorkoutAnalysis, LapData } from '@/lib/workoutAnalyzer'

const LapChart = dynamic(() => import('./LapChart'), { ssr: false })

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(sec: number) {
  if (!sec) return '--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDistance(km: number) {
  if (km >= 1) return `${km.toFixed(2)} km`
  return `${(km * 1000).toFixed(0)} m`
}

function phaseStats(laps: LapData[]) {
  if (!laps.length) return null
  const totalDist = laps.reduce((s, l) => s + l.distance, 0)
  const totalTime = laps.reduce((s, l) => s + l.timerTime, 0)
  const paceSeconds = totalDist > 0 ? totalTime / totalDist : 0
  const hrsWithData = laps.filter(l => l.avgHR > 0)
  const avgHR = hrsWithData.length
    ? Math.round(hrsWithData.reduce((s, l) => s + l.avgHR, 0) / hrsWithData.length)
    : 0
  return { totalDist, totalTime, paceSeconds, avgHR }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[#6B7280] text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="text-[#4B5563] text-xs">{sub}</p>}
    </div>
  )
}

const TYPE_BADGE: Record<string, string> = {
  effort: 'bg-[#E8FF47]/10 text-[#E8FF47] border-[#E8FF47]/20',
  recovery: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warmup: 'bg-[#262626] text-[#6B7280] border-[#333]',
  cooldown: 'bg-[#262626] text-[#6B7280] border-[#333]',
  easy: 'bg-[#262626] text-[#6B7280] border-[#333]',
}

const TYPE_LABEL: Record<string, string> = {
  effort: 'Effort',
  recovery: 'Récup',
  warmup: 'Échauff',
  cooldown: 'Ret. calme',
  easy: 'Facile',
}

function LapRow({ lap }: { lap: LapData }) {
  return (
    <tr className="border-b border-[#1A1A1A] hover:bg-[#161616] transition-colors">
      <td className="py-2 px-3 text-[#6B7280] text-sm">{lap.index + 1}</td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE[lap.type]}`}>
          {TYPE_LABEL[lap.type]}
        </span>
      </td>
      <td className="py-2 px-3 text-sm text-white font-mono">
        {(lap.distance * 1000).toFixed(0)}m
      </td>
      <td className="py-2 px-3 text-sm text-white font-mono">
        {lap.type === 'recovery' ? formatDuration(lap.timerTime) : `${lap.avgPace}/km`}
      </td>
      <td className="py-2 px-3 text-sm text-[#A3A3A3]">
        {lap.avgHR > 0 ? `${lap.avgHR} bpm` : '—'}
      </td>
      <td className="py-2 px-3 text-sm text-[#6B7280]">
        {lap.avgCadence > 0 ? `${lap.avgCadence} spm` : '—'}
      </td>
      <td className="py-2 px-3 text-sm text-[#6B7280]">
        {formatDuration(lap.timerTime)}
      </td>
    </tr>
  )
}

const PHASE_LABEL: Record<string, string> = {
  warmup: 'Échauffement',
  effort: 'Effort',
  recovery: 'Récupération',
  cooldown: 'Retour calme',
}

function PhaseCard({ type, laps }: { type: string; laps: LapData[] }) {
  const stats = phaseStats(laps)
  if (!stats) return null
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE[type]}`}>
          {PHASE_LABEL[type]}
        </span>
        <span className="text-[#4B5563] text-xs">{laps.length} lap{laps.length > 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[#4B5563] text-[10px] uppercase tracking-wider">Allure</p>
          <p className="text-white text-sm font-mono font-bold">
            {stats.paceSeconds > 0 ? `${formatPace(stats.paceSeconds)}/km` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[#4B5563] text-[10px] uppercase tracking-wider">FC moy.</p>
          <p className="text-white text-sm font-mono font-bold">
            {stats.avgHR > 0 ? `${stats.avgHR} bpm` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[#4B5563] text-[10px] uppercase tracking-wider">Temps</p>
          <p className="text-white text-sm font-mono font-bold">{formatDuration(stats.totalTime)}</p>
        </div>
        <div>
          <p className="text-[#4B5563] text-[10px] uppercase tracking-wider">Distance</p>
          <p className="text-white text-sm font-mono font-bold">{formatDistance(stats.totalDist)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── upload zone ─────────────────────────────────────────────────────────────

function UploadZone({ onAnalysis }: { onAnalysis: (a: WorkoutAnalysis) => void }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      onAnalysis(data as WorkoutAnalysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }, [onAnalysis])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
        dragging ? 'border-[#E8FF47] bg-[#E8FF47]/5' : 'border-[#2A2A2A] hover:border-[#444]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".fit" className="hidden" onChange={onFileChange} />

      {loading ? (
        <>
          <div className="w-10 h-10 border-2 border-[#E8FF47] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B7280]">Analyse en cours…</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-2xl">
            📂
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Déposer un fichier .fit ici</p>
            <p className="text-[#4B5563] text-sm mt-1">ou cliquer pour sélectionner</p>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── analysis result ─────────────────────────────────────────────────────────

function AnalysisResult({ analysis, onReset }: { analysis: WorkoutAnalysis; onReset: () => void }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {analysis.workoutType === 'intervals' && (
            <div className="inline-flex items-center gap-2 bg-[#E8FF47]/10 border border-[#E8FF47]/20 rounded-full px-3 py-1 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" />
              <span className="text-[#E8FF47] text-xs font-medium uppercase tracking-wider">Intervalles</span>
            </div>
          )}
          <h2 className="text-3xl font-bold text-white">
            {analysis.structure || 'Séance de course'}
          </h2>
        </div>
        <button
          onClick={onReset}
          className="text-[#4B5563] hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          ← Nouvelle séance
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Allure moyenne"
          value={analysis.totalDistance > 0
            ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
            : '--:--'}
        />
        <StatCard
          label="FC moyenne"
          value={analysis.avgHR > 0 ? `${analysis.avgHR} bpm` : '—'}
        />
        <StatCard
          label="Durée totale"
          value={formatDuration(analysis.totalDuration)}
        />
        <StatCard
          label="Distance totale"
          value={formatDistance(analysis.totalDistance)}
        />
      </div>

      {/* Phase KPIs */}
      {(() => {
        const phases = (['warmup', 'effort', 'recovery', 'cooldown'] as const)
          .map(type => ({ type, laps: analysis.laps.filter(l => l.type === type) }))
          .filter(p => p.laps.length > 0)
        return phases.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Phases</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {phases.map(({ type, laps }) => (
                <PhaseCard key={type} type={type} laps={laps} />
              ))}
            </div>
          </div>
        ) : null
      })()}

      {/* Per-set detail */}
      {analysis.sets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Séries</h3>
          {analysis.sets.map((set, si) => (
            <div key={si} className="bg-[#161616] border border-[#262626] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">
                  {analysis.sets.length > 1 ? `Série ${si + 1} — ` : ''}{set.reps}×{set.effortLabel}
                </span>
                <span className="text-[#E8FF47] font-mono text-sm">{set.avgEffortPace}/km moy.</span>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                {set.efforts.map((lap, ri) => {
                  const rec = set.recoveries[ri]
                  return (
                    <div key={ri} className="flex flex-col items-center gap-1">
                      <div className="bg-[#E8FF47]/10 border border-[#E8FF47]/20 rounded-lg p-2 w-full text-center">
                        <p className="text-[#E8FF47] font-mono text-xs font-bold">{lap.avgPace}</p>
                        <p className="text-[#6B7280] text-[10px]">
                          {set.isTimeBased ? formatDuration(lap.timerTime) : `${(lap.distance * 1000).toFixed(0)}m`}
                        </p>
                      </div>
                      {rec && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded px-1 py-0.5 w-full text-center">
                          <p className="text-blue-400 text-[10px]">{formatDuration(rec.timerTime)}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lap chart */}
      <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Vitesse par lap</h3>
          <div className="flex items-center gap-4 text-xs text-[#4B5563]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#E8FF47]" />Effort</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-400" />Récup</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#4B5563]" />Facile</span>
          </div>
        </div>
        <LapChart laps={analysis.laps} avgEffortPaceSeconds={analysis.avgEffortPaceSeconds} />
      </div>

      {/* Lap table */}
      <div className="bg-[#161616] border border-[#262626] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#262626]">
          <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Détail des laps</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {['#', 'Type', 'Distance', 'Allure / Durée', 'FC', 'Cadence', 'Temps actif'].map(h => (
                  <th key={h} className="py-2 px-3 text-left text-[#4B5563] text-xs uppercase tracking-wider font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.laps.map(lap => <LapRow key={lap.index} lap={lap} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null)

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Navbar */}
      <nav className="border-b border-[#1A1A1A] px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-[#E8FF47] flex items-center justify-center">
          <span className="text-black text-xs font-black">B</span>
        </div>
        <span className="text-white font-semibold text-sm">Bright Dashboard</span>
        <span className="text-[#333] mx-2">|</span>
        <span className="text-[#4B5563] text-sm">Running</span>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {!analysis ? (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Analyse de séance</h1>
              <p className="text-[#4B5563] mt-2">
                Dépose un fichier .fit exporté depuis Coros pour analyser ta séance.
              </p>
            </div>
            <UploadZone onAnalysis={setAnalysis} />
          </div>
        ) : (
          <AnalysisResult analysis={analysis} onReset={() => setAnalysis(null)} />
        )}
      </main>
    </div>
  )
}
