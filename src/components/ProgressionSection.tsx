'use client'

import dynamic from 'next/dynamic'

const ProgressionChart = dynamic(() => import('./ProgressionChart'), { ssr: false })

interface Props {
  workouts: {
    workoutDate: string | null
    analyzedAt: string
    structure: string | null
    avgEffortPaceSeconds: number
    avgHR: number | null
  }[]
}

export default function ProgressionSection({ workouts }: Props) {
  if (workouts.length < 2) return null
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Progression — allure effort</h2>
      <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
        <ProgressionChart workouts={workouts} />
      </div>
    </div>
  )
}
