import type { Point } from './types'

/** Schematic map: 400 × 640 units. One unit ≈ 70 m (approximation for demo distances only). */
export const MAP_WIDTH = 400
export const MAP_HEIGHT = 640
export const KM_PER_UNIT = 0.07

export function distanceKm(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y) * KM_PER_UNIT
}

export function centroid(points: Point[]): Point {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length
  const y = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x: Math.round(x), y: Math.round(y) }
}

export function pointInPolygon(pt: Point, poly: Point[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Approximate Greater Mumbai bounding box, used to place a device location on the schematic. */
const BOUNDS = { latN: 19.27, latS: 18.89, lngW: 72.78, lngE: 72.99 }

export function latLngToSchematic(lat: number, lng: number): Point | null {
  if (lat > BOUNDS.latN || lat < BOUNDS.latS || lng < BOUNDS.lngW || lng > BOUNDS.lngE) return null
  const y = ((BOUNDS.latN - lat) / (BOUNDS.latN - BOUNDS.latS)) * 600 + 20
  const x = ((lng - BOUNDS.lngW) / (BOUNDS.lngE - BOUNDS.lngW)) * 280 + 60
  return { x: Math.round(x), y: Math.round(y) }
}
