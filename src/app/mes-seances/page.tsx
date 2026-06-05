import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function formatDistance(km: number | null) {
  if (!km) return '—'
  return km >= 1 ? `${km.toFixed(2)} km` : `${(km * 1000).toFixed(0)} m`
}

function formatDuration(sec: number | null) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m} min`
}

export default async function MesSeancesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { analyzedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      analyzedAt: true,
      sport: true,
      structure: true,
      totalDistance: true,
      totalTime: true,
      avgHR: true,
    },
  })

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-[#0C0C0C] border-b border-[#1A1A1A] px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#E8FF47] flex items-center justify-center">
            <span className="text-black text-xs font-black">B</span>
          </div>
          <span className="text-white font-semibold text-sm">Bright Dashboard</span>
        </Link>
        <span className="text-[#333] mx-2">|</span>
        <span className="text-[#E8FF47] text-sm font-medium">Mes séances</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Mes séances</h1>
          <Link
            href="/"
            className="text-sm text-[#6B7280] hover:text-white transition-colors"
          >
            + Nouvelle séance
          </Link>
        </div>

        {workouts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#4B5563] text-lg">Aucune séance enregistrée.</p>
            <Link href="/" className="mt-4 inline-block text-[#E8FF47] hover:underline text-sm">
              Analyser ma première séance →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Link
                key={w.id}
                href={`/mes-seances/${w.id}`}
                className="bg-[#161616] border border-[#262626] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#E8FF47]/30 hover:bg-[#1A1A1A] transition-colors block"
              >
                {/* Date */}
                <div className="w-24 shrink-0">
                  <p className="text-[#6B7280] text-xs">{formatDate(w.analyzedAt)}</p>
                </div>

                {/* Structure */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {w.structure || w.sport || 'Séance'}
                  </p>
                  <p className="text-[#4B5563] text-xs truncate mt-0.5">
                    {w.filename || '—'}
                  </p>
                </div>

                {/* Métriques */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[#6B7280] text-[10px] uppercase tracking-wider">Distance</p>
                    <p className="text-white text-sm font-mono">{formatDistance(w.totalDistance)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[#6B7280] text-[10px] uppercase tracking-wider">Durée</p>
                    <p className="text-white text-sm font-mono">{formatDuration(w.totalTime)}</p>
                  </div>
                  {w.avgHR && (
                    <div className="text-right hidden md:block">
                      <p className="text-[#6B7280] text-[10px] uppercase tracking-wider">FC moy.</p>
                      <p className="text-white text-sm font-mono">{w.avgHR} bpm</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
