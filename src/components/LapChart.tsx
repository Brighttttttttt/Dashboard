'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { LapData } from '@/lib/workoutAnalyzer'

const TYPE_COLOR: Record<string, string> = {
  effort: '#E8FF47',
  recovery: '#60A5FA',
  warmup: '#4B5563',
  cooldown: '#4B5563',
  easy: '#6B7280',
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
    // Y-axis: speed in km/h — higher bar = faster
    speed: parseFloat(l.avgSpeed.toFixed(2)),
  }))

  // Reference line: average effort speed
  const avgEffortSpeed = avgEffortPaceSeconds > 0 ? 3600 / avgEffortPaceSeconds : undefined

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="index"
            tickFormatter={(v) => `L${v + 1}`}
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#4B5563', fontSize: 11, dx: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          {avgEffortSpeed && (
            <ReferenceLine
              y={avgEffortSpeed}
              stroke="#E8FF47"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          )}
          <Bar dataKey="speed" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((entry) => (
              <Cell key={entry.index} fill={TYPE_COLOR[entry.type] ?? '#6B7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
