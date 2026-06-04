import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import FitParser from 'fit-file-parser'
import { analyzeWorkout } from '@/lib/workoutAnalyzer'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.fit')) {
      return NextResponse.json({ error: 'Only .fit files are supported' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const fitData = await new Promise<unknown>((resolve, reject) => {
      const parser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'list',
      })
      parser.parse(buffer, (error, data) => {
        if (error) reject(error)
        else resolve(data)
      })
    })

    const analysis = analyzeWorkout(fitData)

    if (userId) {
      try {
        await prisma.workout.create({
          data: {
            userId,
            filename: file.name,
            sport: analysis.sport,
            structure: analysis.structure,
            totalDistance: analysis.totalDistance,
            totalTime: analysis.activeTime,
            avgHR: analysis.avgHR > 0 ? analysis.avgHR : null,
            data: analysis as object,
          },
        })
      } catch (dbErr) {
        console.error('DB save error:', dbErr)
      }
    }

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('FIT parse error:', err)
    return NextResponse.json({ error: 'Failed to parse FIT file' }, { status: 500 })
  }
}
