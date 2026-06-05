'use client'

import React, { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { formatPace, getHRZone } from '@/lib/workoutAnalyzer'
import type { WorkoutAnalysis, LapData, HRZoneConfig, HRZoneMethod } from '@/lib/workoutAnalyzer'
import type { ShareFormat } from './ShareCard'
import { FORMAT_SIZES } from './ShareCard'

const LapChart = dynamic(() => import('./LapChart'), { ssr: false })
const MapView = dynamic(() => import('./MapView'), { ssr: false })
const ShareCard = dynamic(() => import('./ShareCard'), { ssr: false })

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

function groupLapsByPhase(laps: LapData[]): Array<{ category: string; laps: LapData[] }> {
  const groups: Array<{ category: string; laps: LapData[] }> = []
  for (const lap of laps) {
    const cat = (lap.type === 'effort' || lap.type === 'recovery') ? 'intervals' : lap.type
    if (groups.length > 0 && groups[groups.length - 1].category === cat) {
      groups[groups.length - 1].laps.push(lap)
    } else {
      groups.push({ category: cat, laps: [lap] })
    }
  }
  return groups
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

const ZONE_BADGE: Record<number, string> = {
  1: 'bg-[#262626] text-[#6B7280] border-[#333]',
  2: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  3: 'bg-green-500/10 text-green-400 border-green-500/20',
  4: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  5: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const ZONE_COLORS = ['#4B5563', '#3B82F6', '#22C55E', '#F97316', '#EF4444']

function LapRow({ lap, zone, avgEffortPaceSeconds }: { lap: LapData; zone: number | null; avgEffortPaceSeconds: number }) {
  let deltaNode: React.ReactNode = <span className="text-[#333]">—</span>
  if (lap.type === 'effort' && avgEffortPaceSeconds > 0 && lap.avgSpeed > 0) {
    const delta = Math.round(3600 / lap.avgSpeed - avgEffortPaceSeconds)
    const color = delta > 3 ? 'text-red-400' : delta < -3 ? 'text-green-400' : 'text-[#E8FF47]'
    deltaNode = <span className={`font-mono ${color}`}>{delta > 0 ? '+' : ''}{delta}s</span>
  }
  return (
    <tr className="border-b border-[#1A1A1A] hover:bg-[#161616] transition-colors">
      <td className="py-2 px-3 text-[#6B7280] text-sm">{lap.index + 1}</td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE[lap.type]}`}>
          {TYPE_LABEL[lap.type]}
        </span>
      </td>
      <td className="py-2 px-3">
        {zone !== null ? (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONE_BADGE[zone]}`}>Z{zone}</span>
        ) : (
          <span className="text-[#333] text-xs">—</span>
        )}
      </td>
      <td className="py-2 px-3 text-sm text-white font-mono">
        {(lap.distance * 1000).toFixed(0)}m
      </td>
      <td className="py-2 px-3 text-sm text-white font-mono">
        {lap.type === 'recovery' ? formatDuration(lap.timerTime) : `${lap.avgPace}/km`}
      </td>
      <td className="py-2 px-3 text-sm">{deltaNode}</td>
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

const GROUP_LABEL: Record<string, string> = {
  intervals: 'Intervalles',
  warmup: 'Échauffement',
  cooldown: 'Retour calme',
  easy: 'Facile',
}

function PhaseCard({ type, laps }: { type: string; laps: LapData[] }) {
  const stats = phaseStats(laps)
  if (!stats) return null
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
      <div className="mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE[type]}`}>
          {PHASE_LABEL[type]}
        </span>
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

// ─── HR zone settings ────────────────────────────────────────────────────────

function HRZoneSettings({ config, onSave }: { config: HRZoneConfig | null; onSave: (c: HRZoneConfig) => void }) {
  const [open, setOpen] = useState(!config)
  const [method, setMethod] = useState<HRZoneMethod>(config?.method ?? 'hrmax')
  const [fcMax, setFcMax] = useState(config?.fcMax?.toString() ?? '')
  const [lthr, setLthr] = useState(config?.lthr?.toString() ?? '')
  const [fcRest, setFcRest] = useState(config?.fcRest?.toString() ?? '')

  const isValid = () => {
    if (method === 'hrmax') return Number(fcMax) > 0
    if (method === 'lthr') return Number(lthr) > 0
    if (method === 'karvonen') return Number(fcMax) > 0 && Number(fcRest) > 0
    return false
  }

  const handleSave = () => {
    const c: HRZoneConfig = { method }
    if (method === 'hrmax') c.fcMax = Number(fcMax)
    if (method === 'lthr') c.lthr = Number(lthr)
    if (method === 'karvonen') { c.fcMax = Number(fcMax); c.fcRest = Number(fcRest) }
    onSave(c)
    setOpen(false)
  }

  if (!open && config) {
    const summary = config.method === 'hrmax' ? `% FCmax · ${config.fcMax} bpm`
      : config.method === 'lthr' ? `FC seuil · ${config.lthr} bpm`
      : `Karvonen · FCmax ${config.fcMax} / FC repos ${config.fcRest}`
    return (
      <div className="flex items-center justify-between text-xs text-[#4B5563] px-1">
        <span>Zones FC — {summary}</span>
        <button onClick={() => setOpen(true)} className="hover:text-white transition-colors ml-4">Modifier</button>
      </div>
    )
  }

  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-medium">Paramètres zones FC</h3>
        {config && (
          <button onClick={() => setOpen(false)} className="text-[#4B5563] hover:text-white text-xs transition-colors">
            Annuler
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { value: 'hrmax' as const, label: '% FCmax' },
          { value: 'lthr' as const, label: 'FC seuil (Friel)' },
          { value: 'karvonen' as const, label: 'Karvonen' },
        ]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setMethod(value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              method === value
                ? 'bg-[#E8FF47]/10 border-[#E8FF47]/30 text-[#E8FF47]'
                : 'border-[#262626] text-[#6B7280] hover:border-[#444]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {(method === 'hrmax' || method === 'karvonen') && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#4B5563] uppercase tracking-wider">FCmax (bpm)</label>
            <input
              type="number" value={fcMax} onChange={e => setFcMax(e.target.value)}
              placeholder="190"
              className="bg-[#0C0C0C] border border-[#262626] rounded-lg px-3 py-1.5 text-white text-sm w-28 focus:outline-none focus:border-[#E8FF47]/50"
            />
          </div>
        )}
        {method === 'lthr' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#4B5563] uppercase tracking-wider">FC seuil (bpm)</label>
            <input
              type="number" value={lthr} onChange={e => setLthr(e.target.value)}
              placeholder="165"
              className="bg-[#0C0C0C] border border-[#262626] rounded-lg px-3 py-1.5 text-white text-sm w-28 focus:outline-none focus:border-[#E8FF47]/50"
            />
          </div>
        )}
        {method === 'karvonen' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#4B5563] uppercase tracking-wider">FC repos (bpm)</label>
            <input
              type="number" value={fcRest} onChange={e => setFcRest(e.target.value)}
              placeholder="50"
              className="bg-[#0C0C0C] border border-[#262626] rounded-lg px-3 py-1.5 text-white text-sm w-28 focus:outline-none focus:border-[#E8FF47]/50"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSave} disabled={!isValid()}
        className="bg-[#E8FF47] text-black text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-30 hover:bg-[#d4e840] transition-colors"
      >
        Enregistrer
      </button>
    </div>
  )
}

function ZoneDistribution({ laps, config }: { laps: LapData[]; config: HRZoneConfig }) {
  const timeByZone = [0, 0, 0, 0, 0]
  let total = 0
  for (const lap of laps) {
    const z = getHRZone(lap.avgHR, config)
    if (z !== null) { timeByZone[z - 1] += lap.timerTime; total += lap.timerTime }
  }
  if (total === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Répartition zones FC</h3>
      <div className="flex rounded-lg overflow-hidden h-5">
        {timeByZone.map((t, i) => {
          const pct = (t / total) * 100
          return pct >= 0.5 ? (
            <div key={i} style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}
              title={`Z${i + 1} : ${Math.round(pct)}%`} />
          ) : null
        })}
      </div>
      <div className="flex gap-4 flex-wrap">
        {timeByZone.map((t, i) => t > 0 ? (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: ZONE_COLORS[i] }} />
            <span className="text-[#6B7280] text-xs">Z{i + 1} · {Math.round((t / total) * 100)}%</span>
          </div>
        ) : null)}
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

const FORMAT_LABELS: Record<ShareFormat, string> = {
  1: 'Carte (4:5)',
  2: 'Carré GPS',
  3: 'Story (9:16)',
  4: 'Paysage (16:9)',
  5: 'Sticker',
}

function AnalysisResult({ analysis, hrZoneConfig, onSaveHrZoneConfig, onReset }: {
  analysis: WorkoutAnalysis
  hrZoneConfig: HRZoneConfig | null
  onSaveHrZoneConfig: (c: HRZoneConfig) => void
  onReset: () => void
}) {
  const [shareFormat, setShareFormat] = useState<ShareFormat>(1)
  const [showModal, setShowModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'resume' | 'analyse' | 'graphique' | 'laps' | 'parametres'>('resume')

  const handleExport = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: shareFormat === 5 ? null : '#0C0C0C',
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `bright-f${shareFormat}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  const lapZones = hrZoneConfig
    ? analysis.laps.map(l => getHRZone(l.avgHR, hrZoneConfig))
    : analysis.laps.map(() => null)
  const lapZoneMap = new Map(analysis.laps.map((l, i) => [l.index, lapZones[i]]))
  const hasSeries = analysis.sets.length > 0
  const hasGps = analysis.gpsTrack.length >= 2

  return (
    <>
      {/* ── Sticky header + tab bar (conteneur unique) ── */}
      <div className="sticky top-[61px] z-20">
        {/* Session header */}
        <div className="bg-[#0C0C0C]/95 backdrop-blur-sm border-b border-[#1A1A1A]">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {analysis.workoutType === 'intervals' && (
                <span className="shrink-0 bg-[#E8FF47]/10 border border-[#E8FF47]/20 rounded-full px-2.5 py-0.5 text-[#E8FF47] text-xs font-medium uppercase tracking-wider">
                  Intervalles
                </span>
              )}
              <span className="text-white font-bold truncate">
                {analysis.structure || 'Séance de course'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowModal(true)}
                title="Exporter"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#E8FF47] hover:bg-[#E8FF47]/10 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
              <button
                onClick={onReset}
                title="Nouvelle séance"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-[#0C0C0C]/90 backdrop-blur-sm border-b border-[#1A1A1A]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex overflow-x-auto">
              {([
                { id: 'resume', label: 'Résumé' },
                { id: 'analyse', label: 'Analyse' },
                { id: 'graphique', label: 'Graphique' },
                { id: 'laps', label: `Laps · ${analysis.laps.length}` },
                { id: 'parametres', label: 'Paramètres' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`text-xs px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === id
                      ? 'text-[#E8FF47] border-[#E8FF47]'
                      : 'text-[#6B7280] border-transparent hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Résumé ── */}
        {activeTab === 'resume' && (
          <>
            <div className="space-y-4">
              {analysis.summary && (
                <p className="text-[#6B7280] text-sm italic">{analysis.summary}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Distance totale" value={formatDistance(analysis.totalDistance)} />
                <StatCard label="Durée totale" value={formatDuration(analysis.totalDuration)} />
                <StatCard
                  label="Allure moyenne"
                  value={analysis.totalDistance > 0
                    ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
                    : '--:--'}
                />
                <StatCard label="FC moyenne" value={analysis.avgHR > 0 ? `${analysis.avgHR} bpm` : '—'} />
              </div>
            </div>

            {hasGps && (
              <div className="bg-[#161616] border border-[#262626] rounded-xl overflow-hidden isolate">
                <div className="p-4 border-b border-[#262626]">
                  <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Tracé GPS</h3>
                </div>
                <div className="p-2">
                  <MapView points={analysis.gpsTrack} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Analyse ── */}
        {activeTab === 'analyse' && (
          <>
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

            {hasSeries && (
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
          </>
        )}

        {/* ── Graphique ── */}
        {activeTab === 'graphique' && (
          <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
            <h3 className="text-[#6B7280] text-sm uppercase tracking-wider mb-4">Allure & FC</h3>
            <LapChart laps={analysis.laps} avgEffortPaceSeconds={analysis.avgEffortPaceSeconds} />
          </div>
        )}

        {/* ── Laps ── */}
        {activeTab === 'laps' && (
          <div className="bg-[#161616] border border-[#262626] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1A1A1A]">
              <h3 className="text-[#6B7280] text-sm uppercase tracking-wider">Laps · {analysis.laps.length}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {['#', 'Type', 'Zone', 'Distance', 'Allure / Durée', 'Δ Allure', 'FC', 'Cadence', 'Temps actif'].map(h => (
                      <th key={h} className="py-2 px-3 text-left text-[#4B5563] text-xs uppercase tracking-wider font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupLapsByPhase(analysis.laps).flatMap((group, gi) => {
                    const stats = phaseStats(group.laps)
                    const header = (
                      <tr key={`h${gi}`} className="bg-[#111111]">
                        <td colSpan={9} className="py-1.5 px-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">
                              {GROUP_LABEL[group.category] ?? group.category}
                            </span>
                            {stats && (
                              <span className="text-[#4B5563] text-xs font-mono">
                                {formatDistance(stats.totalDist)}
                                {stats.paceSeconds > 0 ? ` · ${formatPace(stats.paceSeconds)}/km` : ''}
                                {stats.avgHR > 0 ? ` · ${stats.avgHR} bpm` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                    const rows = group.laps.map(lap => (
                      <LapRow
                        key={lap.index}
                        lap={lap}
                        zone={lapZoneMap.get(lap.index) ?? null}
                        avgEffortPaceSeconds={analysis.avgEffortPaceSeconds}
                      />
                    ))
                    return [header, ...rows]
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Paramètres ── */}
        {activeTab === 'parametres' && (
          <div className="space-y-4">
            <HRZoneSettings config={hrZoneConfig} onSave={onSaveHrZoneConfig} />
            {hrZoneConfig && <ZoneDistribution laps={analysis.laps} config={hrZoneConfig} />}
          </div>
        )}

      </div>

      {/* Export modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-[#161616] border border-[#262626] rounded-2xl p-6 flex flex-col gap-5 w-full max-w-[540px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">Fiche exportable</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#4B5563] hover:text-white text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3, 4, 5] as ShareFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setShareFormat(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    shareFormat === f
                      ? 'bg-[#E8FF47]/10 border-[#E8FF47]/30 text-[#E8FF47]'
                      : 'border-[#262626] text-[#6B7280] hover:border-[#444]'
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
            {(() => {
              const { w, h } = FORMAT_SIZES[shareFormat]
              const maxW = 460
              const maxH = 400
              const scale = Math.min(maxW / w, maxH / h)
              return (
                <div className="flex justify-center">
                  <div style={{
                    width: Math.round(w * scale),
                    height: Math.round(h * scale),
                    overflow: 'hidden',
                    borderRadius: 12,
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: w, height: h }}>
                      <ShareCard analysis={analysis} format={shareFormat} />
                    </div>
                  </div>
                </div>
              )
            })()}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-[#E8FF47] text-black text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#d4e840] transition-colors"
            >
              {exporting ? 'Génération…' : 'Télécharger PNG'}
            </button>
          </div>
        </div>
      )}

      {/* div off-screen pour html2canvas */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -1 }} aria-hidden="true">
        <div ref={cardRef}>
          <ShareCard analysis={analysis} format={shareFormat} />
        </div>
      </div>
    </>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null)
  const [hrZoneConfig, setHrZoneConfig] = useState<HRZoneConfig | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem('hrZoneConfig')
      return stored ? (JSON.parse(stored) as HRZoneConfig) : null
    } catch { return null }
  })

  const saveHrZoneConfig = (c: HRZoneConfig) => {
    setHrZoneConfig(c)
    localStorage.setItem('hrZoneConfig', JSON.stringify(c))
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Navbar sticky */}
      <nav className="sticky top-0 z-30 bg-[#0C0C0C] border-b border-[#1A1A1A] px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-[#E8FF47] flex items-center justify-center">
          <span className="text-black text-xs font-black">B</span>
        </div>
        <span className="text-white font-semibold text-sm">Bright Dashboard</span>
        <span className="text-[#333] mx-2">|</span>
        <span className="text-[#4B5563] text-sm">Running</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/mes-seances" className="text-[#6B7280] hover:text-white text-sm transition-colors">
            Mes séances
          </Link>
          <UserButton />
        </div>
      </nav>

      {!analysis ? (
        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Analyse de séance</h1>
              <p className="text-[#4B5563] mt-2">
                Dépose un fichier .fit exporté depuis Coros pour analyser ta séance.
              </p>
            </div>
            <UploadZone onAnalysis={setAnalysis} />
          </div>
        </main>
      ) : (
        <AnalysisResult
          analysis={analysis}
          hrZoneConfig={hrZoneConfig}
          onSaveHrZoneConfig={saveHrZoneConfig}
          onReset={() => setAnalysis(null)}
        />
      )}
    </div>
  )
}
