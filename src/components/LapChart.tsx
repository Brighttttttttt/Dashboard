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

// Vert (#22C55E) → Rouge (#EF4444) selon l'écart relatif à l'allure moyenne d'effort
// Seuil max : 8 % d'écart = rouge complet
function effortColor(lapSpeed: number, avgEffortSpeed: number): string {
  if (avgEffortSpeed <= 0) return '#22C55E'
  const t = Math.min(Math.abs(lapSpeed - avgEffortSpeed) / avgEffortSpeed / 0.08, 1)
  const r = Math.round(34 + t * 205)
  const g = Math.round(197 - t * 129)
  const b = Math.round(94 - t * 26)
  return `rgb(${r},${g},${b})`
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

  return (
    <div className="w-full">
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: hasHR ? 40 : 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="index"
              tickFormatter={(v) => `L${v + 1}`}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="speed"
              domain={[0, 'auto']}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#4B5563', fontSize: 11, dx: 12 }}
            />
            {hasHR && (
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fill: '#F87171', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'bpm', angle: 90, position: 'insideRight', fill: '#F87171', fontSize: 11, dx: -4 }}
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
      {hasHR && (
        <div className="flex gap-4 mt-2 px-2 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#E8FF47]" />
            Allure (km/h)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[#F87171]" />
            FC (bpm)
          </span>
        </div>
      )}
    </div>
  )
}
