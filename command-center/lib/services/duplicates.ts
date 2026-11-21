import { distanceKm } from '../geo'
import type { Report } from '../types'

const GROUPS: Record<string, string> = {
  waterlogging: 'water',
  water_entering: 'water',
  trapped: 'water',
  medical: 'medical',
  mobility: 'mobility',
  shelter: 'shelter',
}

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'in', 'on', 'our', 'my', 'we', 'to', 'of', 'and', 'near', 'from', 'with', 'into'])

function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

export const DUPLICATE_RULES = { maxKm: 1.0, windowMinutes: 180, autoLink: 0.7, suggest: 0.45 }

/** Scores how likely two reports describe the same physical incident. */
export function scoreDuplicate(a: Report, b: Report) {
  const reasons: string[] = []
  const km = distanceKm(a.location, b.location)
  if (km > DUPLICATE_RULES.maxKm) return null
  const minutes = Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) / 60000
  if (minutes > DUPLICATE_RULES.windowMinutes) return null
  if (GROUPS[a.category] !== GROUPS[b.category]) return null

  const proximity = 1 - km / DUPLICATE_RULES.maxKm
  const time = 1 - minutes / DUPLICATE_RULES.windowMinutes
  const text = jaccard(tokens(`${a.description} ${a.landmark}`), tokens(`${b.description} ${b.landmark}`))
  const sameCat = a.category === b.category ? 1 : 0.6

  reasons.push(`${(km * 1000).toFixed(0)} m apart`)
  reasons.push(`${Math.round(minutes)} min apart`)
  reasons.push(a.category === b.category ? 'Same category' : 'Related category')
  if (text > 0.15) reasons.push('Similar wording')

  const confidence = Math.min(1, proximity * 0.35 + time * 0.2 + sameCat * 0.25 + text * 0.4)
  return { confidence: Math.round(confidence * 100) / 100, reasons }
}
