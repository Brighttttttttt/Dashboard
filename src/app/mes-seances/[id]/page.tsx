import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { WorkoutAnalysis } from '@/lib/workoutAnalyzer'
import AnalysisDashboard from '@/components/AnalysisDashboard'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const workout = await prisma.workout.findFirst({
    where: { id, userId },
  })

  if (!workout) notFound()

  return <AnalysisDashboard initialAnalysis={workout.data as unknown as WorkoutAnalysis} />
}
