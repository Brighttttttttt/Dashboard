'use client'

import { useEffect, useRef } from 'react'
import type { WorkoutAnalysis, GpsPoint } from '@/lib/workoutAnalyzer'
import { formatPace } from '@/lib/workoutAnalyzer'

export type ShareFormat = 1 | 2 | 3 | 4 | 5

export const FORMAT_SIZES: Record<ShareFormat, { w: number; h: number }> = {
  1: { w: 540, h: 675 },
  2: { w: 540, h: 540 },
  3: { w: 405, h: 720 },
  4: { w: 600, h: 315 },
  5: { w: 480, h: 480 },
}

// ─── GPS canvas ───────────────────────────────────────────────────────────────

function GpsCanvas({
  points, width, height,
  bg = '#0A0A0A',
  transparent = false,
  lineWidth,
  glow = true,
}: {
  points: GpsPoint[]
  width: number
  height: number
  bg?: string
  transparent?: boolean
  lineWidth?: number
  glow?: boolean
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
    const pad = Math.round(width * 0.07)

    const rangeX = maxLon - minLon || 0.001
    const rangeY = maxLat - minLat || 0.001
    const scaleX = (width - pad * 2) / rangeX
    const scaleY = (height - pad * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)
    const offX = pad + ((width - pad * 2) - rangeX * scale) / 2
    const offY = pad + ((height - pad * 2) - rangeY * scale) / 2

    ctx.clearRect(0, 0, width, height)
    if (!transparent) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)
    }

    const lw = lineWidth ?? Math.max(2.5, width / 100)

    if (glow) {
      // outer glow pass
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(232,255,71,0.25)'
      ctx.lineWidth = lw * 4
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      points.forEach((p, i) => {
        const x = offX + (p.lon - minLon) * scale
        const y = offY + (maxLat - p.lat) * scale
        if (i === 0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
      })
      ctx.stroke()
    }

    // main line
    ctx.beginPath()
    ctx.strokeStyle = '#E8FF47'
    ctx.lineWidth = lw
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    points.forEach((p, i) => {
      const x = offX + (p.lon - minLon) * scale
      const y = offY + (maxLat - p.lat) * scale
      if (i === 0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
    })
    ctx.stroke()

    // start dot
    const startX = offX + (points[0].lon - minLon) * scale
    const startY = offY + (maxLat - points[0].lat) * scale
    ctx.beginPath()
    ctx.fillStyle = '#E8FF47'
    ctx.arc(startX, startY, lw * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }, [points, width, height, bg, transparent, lineWidth, glow])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width, height, display: 'block' }}
    />
  )
}

// ─── shared primitives ────────────────────────────────────────────────────────

const STAT_COLORS = {
  pace: '#E8FF47',
  distance: '#FFFFFF',
  duration: '#9CA3AF',
  hr: '#F87171',
}

function StatChip({
  label, value, color = '#E8FF47', small = false,
}: {
  label: string; value: string; color?: string; small?: boolean
}) {
  const fs = small ? 18 : 22
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      paddingLeft: small ? 10 : 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}>
      <span style={{ color, fontSize: fs, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ color: '#4B5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  )
}

function Logo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size,
        background: dark ? '#0C0C0C' : '#E8FF47',
        borderRadius: Math.round(size * 0.22),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: dark ? '#E8FF47' : '#000', fontWeight: 900, fontSize: size * 0.52 }}>B</span>
      </div>
      <span style={{ color: dark ? '#E8FF47' : '#fff', fontWeight: 700, fontSize: size * 0.55, letterSpacing: '-0.01em' }}>
        Bright
      </span>
    </div>
  )
}

function LimeBar({ width }: { width: number }) {
  return (
    <div style={{
      width,
      height: 3,
      background: 'linear-gradient(90deg, #E8FF47 0%, rgba(232,255,71,0.3) 60%, transparent 100%)',
      flexShrink: 0,
    }} />
  )
}

function workoutStats(analysis: WorkoutAnalysis) {
  const avgPace = analysis.avgEffortPaceSeconds > 0
    ? `${formatPace(analysis.avgEffortPaceSeconds)}/km`
    : analysis.totalDistance > 0
      ? `${formatPace(analysis.activeTime / analysis.totalDistance)}/km`
      : '—'
  const dist = `${analysis.totalDistance.toFixed(1)} km`
  const dur = `${Math.floor(analysis.totalDuration / 60)} mn`
  const hr = analysis.avgHR > 0 ? `${analysis.avgHR} bpm` : null
  const label = analysis.workoutType === 'intervals' ? 'Intervalles' : 'Course'
  return { avgPace, dist, dur, hr, label }
}

// ─── Format 1 — Carte complète 4:5 ───────────────────────────────────────────

function Format1({ analysis }: { analysis: WorkoutAnalysis }) {
  const { w, h } = FORMAT_SIZES[1]
  const hasGps = analysis.gpsTrack.length >= 2
  const { avgPace, dist, dur, hr, label } = workoutStats(analysis)

  return (
    <div style={{
      width: w, height: h, overflow: 'hidden',
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
    }}>
      {/* radial lime glow background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: h * 0.45,
        background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(232,255,71,0.07) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      <LimeBar width={w} />

      <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Logo size={26} />
          <span style={{ color: '#2A2A2A', fontSize: 11 }}>bright.run</span>
        </div>

        {/* title block */}
        <div style={{ marginBottom: 24 }}>
          <span style={{
            color: '#E8FF47', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            display: 'block', marginBottom: 6,
          }}>
            {label}
          </span>
          <span style={{
            color: '#FFFFFF', fontSize: 54, fontWeight: 900,
            lineHeight: 1, letterSpacing: '-0.02em', display: 'block',
          }}>
            {analysis.structure || 'Séance'}
          </span>
          {analysis.summary && (
            <span style={{
              color: '#6B7280', fontSize: 13, fontStyle: 'italic',
              display: 'block', marginTop: 8, lineHeight: 1.5,
            }}>
              {analysis.summary}
            </span>
          )}
        </div>

        {/* GPS */}
        {hasGps && (
          <div style={{
            borderRadius: 14, overflow: 'hidden',
            marginBottom: 24, flexShrink: 0,
            border: '1px solid rgba(232,255,71,0.1)',
          }}>
            <GpsCanvas points={analysis.gpsTrack} width={w - 72} height={170} />
          </div>
        )}

        {/* stats */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 'auto' }}>
          <StatChip label="Allure" value={avgPace} color={STAT_COLORS.pace} />
          <StatChip label="Distance" value={dist} color={STAT_COLORS.distance} />
          <StatChip label="Durée" value={dur} color={STAT_COLORS.duration} />
          {hr && <StatChip label="FC moy." value={hr} color={STAT_COLORS.hr} />}
        </div>

        {/* footer */}
        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <span style={{ color: '#2A2A2A', fontSize: 11, letterSpacing: '0.05em' }}>bright.run</span>
        </div>
      </div>
    </div>
  )
}

// ─── Format 2 — Carré GPS 1:1 ────────────────────────────────────────────────

function Format2({ analysis }: { analysis: WorkoutAnalysis }) {
  const { w, h } = FORMAT_SIZES[2]
  const hasGps = analysis.gpsTrack.length >= 2
  const { avgPace, dist, hr, label } = workoutStats(analysis)

  return (
    <div style={{
      width: w, height: h, overflow: 'hidden',
      background: '#0A0A0A', position: 'relative',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      {hasGps ? (
        <GpsCanvas points={analysis.gpsTrack} width={w} height={h} bg="#0A0A0A" />
      ) : (
        <div style={{ width: w, height: h, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#2A2A2A', fontSize: 14 }}>Pas de données GPS</span>
        </div>
      )}

      {/* gradient overlay bottom 55% */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: h * 0.58,
        background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.7) 30%, rgba(10,10,10,0.97) 70%, #0A0A0A 100%)',
      }} />

      {/* top logo */}
      <div style={{ position: 'absolute', top: 20, left: 22 }}>
        <Logo size={22} />
      </div>

      {/* content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 28px 28px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div>
          <span style={{ color: '#E8FF47', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
            {label}
          </span>
          <span style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', display: 'block' }}>
            {analysis.structure || 'Séance'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: '#E8FF47', fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>{avgPace}</span>
          <span style={{ color: '#333' }}>·</span>
          <span style={{ color: '#fff', fontSize: 16, fontFamily: 'monospace' }}>{dist}</span>
          {hr && <>
            <span style={{ color: '#333' }}>·</span>
            <span style={{ color: '#F87171', fontSize: 16, fontFamily: 'monospace' }}>{hr}</span>
          </>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ color: '#333', fontSize: 10 }}>bright.run</span>
        </div>
      </div>
    </div>
  )
}

// ─── Format 3 — Story 9:16 ───────────────────────────────────────────────────

function Format3({ analysis }: { analysis: WorkoutAnalysis }) {
  const { w, h } = FORMAT_SIZES[3]
  const hasGps = analysis.gpsTrack.length >= 2
  const { avgPace, dist, dur, hr, label } = workoutStats(analysis)
  const gpsH = Math.round(h * 0.58)

  return (
    <div style={{
      width: w, height: h, overflow: 'hidden',
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      <LimeBar width={w} />

      {/* GPS zone */}
      <div style={{ position: 'relative', height: gpsH, flexShrink: 0 }}>
        {hasGps ? (
          <GpsCanvas points={analysis.gpsTrack} width={w} height={gpsH} bg="#0A0A0A" />
        ) : (
          <div style={{ width: w, height: gpsH, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#2A2A2A', fontSize: 13 }}>Pas de données GPS</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 18, left: 20 }}>
          <Logo size={22} />
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(transparent, #0A0A0A)',
        }} />
      </div>

      {/* stats zone */}
      <div style={{
        flex: 1,
        padding: '20px 28px 28px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div>
          <span style={{ color: '#E8FF47', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
            {label}
          </span>
          <span style={{ color: '#fff', fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', display: 'block' }}>
            {analysis.structure || 'Séance'}
          </span>
          {analysis.summary && (
            <span style={{ color: '#6B7280', fontSize: 11, fontStyle: 'italic', display: 'block', marginTop: 6 }}>
              {analysis.summary}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
          <StatChip label="Allure" value={avgPace} color={STAT_COLORS.pace} small />
          <StatChip label="Distance" value={dist} color={STAT_COLORS.distance} small />
          <StatChip label="Durée" value={dur} color={STAT_COLORS.duration} small />
          {hr && <StatChip label="FC" value={hr} color={STAT_COLORS.hr} small />}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ color: '#2A2A2A', fontSize: 10 }}>bright.run</span>
        </div>
      </div>
    </div>
  )
}

// ─── Format 4 — Bandeau paysage 16:9 ─────────────────────────────────────────

function Format4({ analysis }: { analysis: WorkoutAnalysis }) {
  const { w, h } = FORMAT_SIZES[4]
  const hasGps = analysis.gpsTrack.length >= 2
  const { avgPace, dist, dur, hr, label } = workoutStats(analysis)
  const leftW = 210

  return (
    <div style={{
      width: w, height: h, overflow: 'hidden',
      background: '#0A0A0A',
      display: 'flex',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      <LimeBar width={3} />

      {/* left column */}
      <div style={{
        width: leftW, padding: '24px 22px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <div>
          <Logo size={22} />
          <div style={{ marginTop: 18 }}>
            <span style={{ color: '#E8FF47', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
              {label}
            </span>
            <span style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', display: 'block' }}>
              {analysis.structure || 'Séance'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Allure', value: avgPace, color: STAT_COLORS.pace },
            { label: 'Distance', value: dist, color: STAT_COLORS.distance },
            { label: 'Durée', value: dur, color: STAT_COLORS.duration },
            ...(hr ? [{ label: 'FC moy.', value: hr, color: STAT_COLORS.hr }] : []),
          ].map(({ label: l, value, color }) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#4B5563', fontSize: 11 }}>{l}</span>
              <span style={{ color, fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{value}</span>
            </div>
          ))}
          <span style={{ color: '#1A1A1A', fontSize: 10, marginTop: 4 }}>bright.run</span>
        </div>
      </div>

      {/* GPS */}
      <div style={{ flex: 1, position: 'relative' }}>
        {hasGps ? (
          <GpsCanvas points={analysis.gpsTrack} width={w - leftW - 3} height={h} bg="#0A0A0A" />
        ) : (
          <div style={{ width: w - leftW - 3, height: h, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#2A2A2A', fontSize: 12 }}>Pas de données GPS</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Format 5 — Sticker transparent ──────────────────────────────────────────

function Format5({ analysis }: { analysis: WorkoutAnalysis }) {
  const { w, h } = FORMAT_SIZES[5]
  const hasGps = analysis.gpsTrack.length >= 2
  const { avgPace, dist, hr } = workoutStats(analysis)

  const chips = [
    { text: analysis.structure || 'Séance', bg: '#E8FF47', color: '#000', fw: 800 },
    { text: avgPace, bg: 'rgba(0,0,0,0.72)', color: '#E8FF47', border: '1.5px solid rgba(232,255,71,0.6)', fw: 700 },
    { text: dist, bg: 'rgba(0,0,0,0.72)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', fw: 600 },
    ...(hr ? [{ text: hr, bg: 'rgba(0,0,0,0.72)', color: '#F87171', border: '1.5px solid rgba(248,113,113,0.4)', fw: 600 }] : []),
  ]

  return (
    <div style={{
      width: w, height: h,
      background: 'transparent',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
    }}>
      {hasGps ? (
        <GpsCanvas points={analysis.gpsTrack} width={w} height={h - 72} transparent glow />
      ) : (
        <div style={{ width: w, height: h - 72 }} />
      )}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, right: 12,
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {chips.map(({ text, bg, color, border, fw }) => (
          <span key={text} style={{
            background: bg,
            color,
            border: border ?? 'none',
            borderRadius: 24,
            padding: '7px 16px',
            fontSize: 14,
            fontWeight: fw,
            fontFamily: 'monospace',
            letterSpacing: '-0.01em',
          }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

interface Props {
  analysis: WorkoutAnalysis
  format: ShareFormat
}

export default function ShareCard({ analysis, format }: Props) {
  const map: Record<ShareFormat, React.ReactNode> = {
    1: <Format1 analysis={analysis} />,
    2: <Format2 analysis={analysis} />,
    3: <Format3 analysis={analysis} />,
    4: <Format4 analysis={analysis} />,
    5: <Format5 analysis={analysis} />,
  }
  return <>{map[format]}</>
}
