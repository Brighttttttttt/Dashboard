import { NextRequest, NextResponse } from 'next/server'
import FitParser from 'fit-file-parser'
import { analyzeWorkout } from '@/lib/workoutAnalyzer'

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json(analysis)
  } catch (err) {
    console.error('FIT parse error:', err)
    return NextResponse.json({ error: 'Failed to parse FIT file' }, { status: 500 })
  }
}
