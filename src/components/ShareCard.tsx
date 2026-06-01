'use client'

import { useEffect, useRef } from 'react'
import type { WorkoutAnalysis, GpsPoint } from '@/lib/workoutAnalyzer'
import { formatPace } from '@/lib/workoutAnalyzer'

export type ShareFormat = 1 | 2 | 3 | 4 | 5

// ─── GPS canvas helper ────────────────────────────────────────────────────────

function GpsCanvas({
  points,
  width,
  height,
  bg = '#161616',
  transparent = false,
}: {
  points: GpsPoint[]
  width: number
  height: number
  bg?: string
  transparent?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || points.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lats = points.map(p => p.lat)
    const lons = points.map(p => p.lon)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLon = Math.min(...lons), maxLon = Math.max(...lons)
    const pad = 20

    const scaleX = (width - pad * 2) / (maxLon - minLon || 1)
    const scaleY = (height - pad * 2) / (maxLat - minLat || 1)
    const scale = Math.min(scaleX, scaleY)

    const offX = pad + ((width - pad * 2) - (maxLon - minLon) * scale) / 2
    const offY = pad + ((height - pad * 2) - (maxLat - minLat) * scale) / 2

    ctx.clearRect(0, 0, width, height)
    if (!transparent) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)
    }

    ctx.beginPath()
    ctx.strokeStyle = '#E8FF47'
    ctx.lineWidth = Math.max(2, width / 120)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    points.forEach((p, i) => {
      const x = offX + (p.lon - minLon) * scale
      const y = offY + (maxLat - p.lat) * scale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [points, width, height, bg, transparent])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width, height, display: 'block' }}
    />
  )
}

// ─── stat chip ────────────────────────────────────────────────────────────────

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{
      background: 'rgba(232,255,71,0.08)',
      border: '1px solid rgba(232,255,71,0.2)',
      borderRadius: 12,
      padding: small ? '8px 14px' : '12px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: small ? 80 : 100,
    }}>
      <span style={{ color: '#6B7280', fontSize: small ? 10 : 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color: 'white', fontSize: small ? 16 : 20, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size,
        background: '#E8FF47',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'black', fontWeight: 900, fontSize: size * 0.5 }}>B</span>
      </div>
      <span style={{ color: 'white', fontWeight: 600, fontSize: size * 0.6 }}>Bright</span>
    </div>
  )
}

// ─── formats ─────────────────────────────────────────────────────────────────

function Format1({ analysis }: { analysis: WorkoutAnalysis }) {
  const hasGps = analysis.gpsTrack.length >= 2
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : analysis.totalDistance > 0
      ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
      : '—'

  return (
    <div style={{
      width: 540, height: 675,
      background: '#0C0C0C',
      padding: 36,
      display: 'flex', flexDirection: 'column', gap: 20,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <span style={{ color: '#333', fontSize: 11 }}>bright.run</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#E8FF47', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {analysis.workoutType === 'intervals' ? 'Intervalles' : 'Course'}
        </span>
        <span style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
          {analysis.structure || 'Séance'}
        </span>
        {analysis.summary && (
          <span style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>{analysis.summary}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat label="Distance" value={`${analysis.totalDistance.toFixed(1)}km`} />
        <Stat label="Durée" value={`${Math.floor(analysis.totalDuration / 60)}mn`} />
        <Stat label="Allure" value={avgPace} />
        {analysis.avgHR > 0 && <Stat label="FC" value={`${analysis.avgHR}bpm`} />}
      </div>

      {hasGps && (
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <GpsCanvas points={analysis.gpsTrack} width={468} height={160} />
        </div>
      )}

      <div style={{ height: 1, background: '#1A1A1A' }} />
      <span style={{ color: '#333', fontSize: 10, textAlign: 'right' }}>Analyse propulsée par Bright</span>
    </div>
  )
}

function Format2({ analysis }: { analysis: WorkoutAnalysis }) {
  const hasGps = analysis.gpsTrack.length >= 2
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : '—'

  return (
    <div style={{
      width: 540, height: 540,
      background: '#0C0C0C',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {hasGps ? (
        <GpsCanvas points={analysis.gpsTrack} width={540} height={540} bg="#0C0C0C" />
      ) : (
        <div style={{ width: 540, height: 540, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#333', fontSize: 14 }}>Pas de données GPS</span>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
        padding: '40px 28px 28px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <span style={{ color: 'white', fontSize: 36, fontWeight: 800 }}>
          {analysis.structure || 'Séance'}
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ color: '#E8FF47', fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{avgPace}</span>
          <span style={{ color: '#6B7280', fontSize: 16 }}>·</span>
          <span style={{ color: 'white', fontSize: 16, fontFamily: 'monospace' }}>{analysis.totalDistance.toFixed(1)} km</span>
          {analysis.avgHR > 0 && (
            <>
              <span style={{ color: '#6B7280', fontSize: 16 }}>·</span>
              <span style={{ color: '#F87171', fontSize: 16, fontFamily: 'monospace' }}>{analysis.avgHR} bpm</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Logo size={22} />
          <span style={{ color: '#444', fontSize: 10 }}>bright.run</span>
        </div>
      </div>
    </div>
  )
}

function Format3({ analysis }: { analysis: WorkoutAnalysis }) {
  const hasGps = analysis.gpsTrack.length >= 2
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : analysis.totalDistance > 0
      ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
      : '—'

  return (
    <div style={{
      width: 405, height: 720,
      background: '#0C0C0C',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {hasGps ? (
          <GpsCanvas points={analysis.gpsTrack} width={405} height={440} bg="#0C0C0C" />
        ) : (
          <div style={{ width: 405, height: 440, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#333' }}>Pas de données GPS</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <Logo size={24} />
        </div>
      </div>

      <div style={{
        background: '#111',
        borderTop: '1px solid #1A1A1A',
        padding: '24px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <span style={{ color: '#E8FF47', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {analysis.workoutType === 'intervals' ? 'Intervalles' : 'Course'}
          </span>
          <div style={{ color: 'white', fontSize: 34, fontWeight: 800, marginTop: 4 }}>
            {analysis.structure || 'Séance'}
          </div>
          {analysis.summary && (
            <div style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>{analysis.summary}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Stat label="Allure" value={avgPace} small />
          <Stat label="Distance" value={`${analysis.totalDistance.toFixed(1)}km`} small />
          <Stat label="Durée" value={`${Math.floor(analysis.totalDuration / 60)}mn`} small />
          {analysis.avgHR > 0 && <Stat label="FC" value={`${analysis.avgHR}bpm`} small />}
        </div>
        <span style={{ color: '#333', fontSize: 10, textAlign: 'right' }}>bright.run</span>
      </div>
    </div>
  )
}

function Format4({ analysis }: { analysis: WorkoutAnalysis }) {
  const hasGps = analysis.gpsTrack.length >= 2
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : analysis.totalDistance > 0
      ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
      : '—'

  return (
    <div style={{
      width: 600, height: 315,
      background: '#0C0C0C',
      display: 'flex',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        width: 220, padding: '28px 24px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid #1A1A1A',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Logo size={22} />
          <span style={{ color: '#E8FF47', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 12 }}>
            {analysis.workoutType === 'intervals' ? 'Intervalles' : 'Course'}
          </span>
          <span style={{ color: 'white', fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
            {analysis.structure || 'Séance'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Allure', value: avgPace },
            { label: 'Distance', value: `${analysis.totalDistance.toFixed(1)} km` },
            { label: 'Durée', value: `${Math.floor(analysis.totalDuration / 60)} mn` },
            ...(analysis.avgHR > 0 ? [{ label: 'FC', value: `${analysis.avgHR} bpm` }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280', fontSize: 11 }}>{label}</span>
              <span style={{ color: 'white', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {hasGps ? (
          <GpsCanvas points={analysis.gpsTrack} width={380} height={315} bg="#0C0C0C" />
        ) : (
          <div style={{ width: 380, height: 315, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#333', fontSize: 12 }}>Pas de données GPS</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Format5({ analysis }: { analysis: WorkoutAnalysis }) {
  const hasGps = analysis.gpsTrack.length >= 2
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : analysis.totalDistance > 0
      ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
      : '—'

  return (
    <div style={{
      width: 480, height: 480,
      background: 'transparent',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
    }}>
      {hasGps ? (
        <GpsCanvas points={analysis.gpsTrack} width={480} height={380} transparent />
      ) : (
        <div style={{ width: 480, height: 380 }} />
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: 10, flexWrap: 'wrap', padding: 8,
      }}>
        {[
          { label: analysis.structure || 'Séance', color: '#E8FF47', text: '#000' },
          { label: avgPace, color: 'rgba(0,0,0,0.7)', text: '#E8FF47', border: '1px solid #E8FF47' },
          { label: `${analysis.totalDistance.toFixed(1)} km`, color: 'rgba(0,0,0,0.7)', text: 'white', border: '1px solid rgba(255,255,255,0.3)' },
          ...(analysis.avgHR > 0 ? [{ label: `${analysis.avgHR} bpm`, color: 'rgba(0,0,0,0.7)', text: '#F87171', border: '1px solid rgba(248,113,113,0.4)' }] : []),
        ].map(({ label, color, text, border }) => (
          <span key={label} style={{
            background: color,
            color: text,
            border: border ?? 'none',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
          }}>{label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── main export ─────────────────────────────────────────────────────────────

const FORMAT_SIZES: Record<ShareFormat, { w: number; h: number }> = {
  1: { w: 540, h: 675 },
  2: { w: 540, h: 540 },
  3: { w: 405, h: 720 },
  4: { w: 600, h: 315 },
  5: { w: 480, h: 480 },
}

interface Props {
  analysis: WorkoutAnalysis
  format: ShareFormat
  cardRef: React.RefObject<HTMLDivElement | null>
}

export default function ShareCard({ analysis, format, cardRef }: Props) {
  const { w, h } = FORMAT_SIZES[format]

  const content = format === 1 ? <Format1 analysis={analysis} />
    : format === 2 ? <Format2 analysis={analysis} />
    : format === 3 ? <Format3 analysis={analysis} />
    : format === 4 ? <Format4 analysis={analysis} />
    : <Format5 analysis={analysis} />

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: -9999,
        top: -9999,
        width: w,
        height: h,
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  )
}

export { FORMAT_SIZES }
