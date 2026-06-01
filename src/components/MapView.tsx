'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { GpsPoint } from '@/lib/workoutAnalyzer'

function FitBounds({ points }: { points: GpsPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const lats = points.map(p => p.lat)
    const lons = points.map(p => p.lon)
    map.fitBounds([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ], { padding: [24, 24] })
  }, [map, points])
  return null
}

interface Props {
  points: GpsPoint[]
}

export default function MapView({ points }: Props) {
  if (points.length < 2) return null

  const center: [number, number] = [points[0].lat, points[0].lon]
  const positions: [number, number][] = points.map(p => [p.lat, p.lon])

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="w-full h-64 rounded-xl"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Polyline positions={positions} color="#E8FF47" weight={3} opacity={0.9} />
      <FitBounds points={points} />
    </MapContainer>
  )
}
