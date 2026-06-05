'use client'

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  date: string        // label affiché sur l'axe X
  timestamp: number   // pour trier
  pace: number        // secondes/km (allure effort)
  hr: number | null   // FC moyenne
  structure: string
}

function secToPace(sec: number): string {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: DataPoint = payload[0].payload
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-semibold text-white mb-1">{d.date}</p>
      {d.structure && <p className="text-[#6B7280] text-xs mb-1">{d.structure}</p>}
      <p className="text-[#A3A3A3]">Allure effort : <span className="text-[#E8FF47]">{secToPace(d.pace)}/km</span></p>
      {d.hr && <p className="text-[#A3A3A3]">FC moy. : <span className="text-[#F87171]">{d.hr} bpm</span></p>}
    </div>
  )
}

interface Props {
  workouts: {
    workoutDate: string | null
    analyzedAt: string
    structure: string | null
    avgEffortPaceSeconds: number
    avgHR: number | null
  }[]
}

export default function ProgressionChart({ workouts }: Props) {
  const data: DataPoint[] = workouts
    .filter(w => w.avgEffortPaceSeconds > 0)
    .map(w => {
      const d = new Date(w.workoutDate ?? w.analyzedAt)
      return {
        date: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d),
        timestamp: d.getTime(),
        pace: w.avgEffortPaceSeconds,
        hr: w.avgHR ?? null,
        structure: w.structure ?? '',
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  if (data.length < 2) return (
    <p className="text-[#4B5563] text-sm text-center py-8">
      Ajoute au moins 2 séances avec des intervalles pour voir ta progression.
    </p>
  )

  const avgPace = Math.round(data.reduce((s, d) => s + d.pace, 0) / data.length)
  const hasHR = data.some(d => d.hr !== null)

  return (
    <div className="w-full">
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: hasHR ? 48 : 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              yAxisId="pace"
              domain={['auto', 'auto']}
              tickFormatter={secToPace}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              reversed
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333' }} />
            <ReferenceLine
              yAxisId="pace"
              y={avgPace}
              stroke="#E8FF47"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: secToPace(avgPace), position: 'insideTopLeft', fill: '#E8FF47', fontSize: 10, opacity: 0.8 }}
            />
            <Line
              yAxisId="pace"
              dataKey="pace"
              type="monotone"
              stroke="#E8FF47"
              strokeWidth={2}
              dot={{ r: 4, fill: '#E8FF47', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            {hasHR && (
              <Line
                yAxisId="hr"
                dataKey="hr"
                type="monotone"
                stroke="#F87171"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F87171', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 px-1 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true" className="shrink-0">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#E8FF47" strokeWidth="1.5"/>
          </svg>
          Allure effort
        </span>
        {hasHR && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke="#F87171" strokeWidth="1.5"/>
            </svg>
            FC moy.
          </span>
        )}
      </div>
    </div>
  )
}
