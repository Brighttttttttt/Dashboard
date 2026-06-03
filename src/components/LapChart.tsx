'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { LapData } from '@/lib/workoutAnalyzer'

const TYPE_COLOR: Record<string, string> = {
  recovery: '#60A5FA',
  warmup: '#4B5563',
  cooldown: '#4B5563',
  easy: '#6B7280',
}

function effortColor(lapSpeed: number, avgEffortSpeed: number): string {
  if (avgEffortSpeed <= 0) return '#22C55E'
  const t = Math.min(Math.abs(lapSpeed - avgEffortSpeed) / avgEffortSpeed / 0.08, 1)
  const r = Math.round(34 + t * 205)
  const g = Math.round(197 - t * 129)
  const b = Math.round(94 - t * 26)
  return `rgb(${r},${g},${b})`
}

function speedToPace(kmh: number): string {
  if (kmh <= 0) return ''
  const totalSec = 3600 / kmh
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  laps: LapData[]
  avgEffortPaceSeconds: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const lap: LapData = payload[0].payload
  const typeLabel: Record<string, string> = {
    effort: 'Effort',
    recovery: 'Récupération',
    warmup: 'Échauffement',
    cooldown: 'Retour calme',
    easy: 'Facile',
  }
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-semibold text-white mb-1">
        Lap {lap.index + 1} — {typeLabel[lap.type]}
      </p>
      <p className="text-[#A3A3A3]">Distance : <span className="text-white">{(lap.distance * 1000).toFixed(0)}m</span></p>
      <p className="text-[#A3A3A3]">Allure : <span className="text-white">{lap.avgPace}/km</span></p>
      <p className="text-[#A3A3A3]">FC moy : <span className="text-white">{lap.avgHR || '—'} bpm</span></p>
      <p className="text-[#A3A3A3]">Durée : <span className="text-white">{formatDuration(lap.timerTime)}</span></p>
    </div>
  )
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function LapChart({ laps, avgEffortPaceSeconds }: Props) {
  const data = laps.map(l => ({
    ...l,
    speed: parseFloat(l.avgSpeed.toFixed(2)),
    hr: l.avgHR > 0 ? l.avgHR : null,
  }))

  const avgEffortSpeed = avgEffortPaceSeconds > 0 ? 3600 / avgEffortPaceSeconds : undefined
  const hasHR = data.some(d => d.hr !== null)

  const lapsWithHR = data.filter(d => d.hr !== null)
  const avgHR = lapsWithHR.length > 0
    ? Math.round(lapsWithHR.reduce((s, d) => s + (d.hr ?? 0), 0) / lapsWithHR.length)
    : null

  return (
    <div className="w-full">
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: hasHR ? 48 : 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="index"
              tickFormatter={(v) => `${v + 1}`}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              yAxisId="speed"
              domain={[0, 'auto']}
              tickFormatter={speedToPace}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            {hasHR && (
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fill: '#F87171', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            {avgEffortSpeed && (
              <ReferenceLine
                yAxisId="speed"
                y={avgEffortSpeed}
                stroke="#E8FF47"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: speedToPace(avgEffortSpeed), position: 'insideTopLeft', fill: '#E8FF47', fontSize: 10, opacity: 0.9 }}
              />
            )}
            {hasHR && avgHR && (
              <ReferenceLine
                yAxisId="hr"
                y={avgHR}
                stroke="#F87171"
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                label={{ value: `${avgHR}`, position: 'insideTopRight', fill: '#F87171', fontSize: 10, opacity: 0.8 }}
              />
            )}
            <Bar yAxisId="speed" dataKey="speed" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {data.map((entry) => (
                <Cell
                  key={entry.index}
                  fill={
                    entry.type === 'effort' && avgEffortSpeed
                      ? effortColor(entry.speed, avgEffortSpeed)
                      : (TYPE_COLOR[entry.type] ?? '#6B7280')
                  }
                />
              ))}
            </Bar>
            {hasHR && (
              <Line
                yAxisId="hr"
                dataKey="hr"
                type="monotone"
                stroke="#F87171"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F87171', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#F87171' }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 px-1 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm shrink-0 bg-[#4B5563]" />
          Allure
        </span>
        {avgEffortSpeed && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke="#E8FF47" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>
            </svg>
            Allure moy.
          </span>
        )}
        {hasHR && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke="#F87171" strokeWidth="1.5"/>
            </svg>
            FC
          </span>
        )}
        {hasHR && avgHR && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke="#F87171" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
            </svg>
            FC moy.
          </span>
        )}
      </div>
    </div>
  )
}
