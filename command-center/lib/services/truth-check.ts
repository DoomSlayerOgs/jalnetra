import type { Advisory, TruthCheckResult } from '../types'

/** Advisories older than this cannot verify a claim about a current event. */
const CURRENT_EVENT_MAX_HOURS = 48

function words(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
}

const hasAll = (w: Set<string>, pattern: string[]) => pattern.every((p) => w.has(p))

/**
 * Checks a message only against the curated advisory dataset. Never invents evidence:
 * no matching advisory → "unverified".
 */
export function checkClaim(text: string, advisories: Advisory[], now: number): TruthCheckResult {
  const w = words(text)
  const checkedAt = new Date(now).toISOString()

  const scored = advisories
    .map((a) => ({ a, overlap: a.keywords.filter((k) => w.has(k)).length }))
    .filter((s) => s.overlap > 0)
    .sort((x, y) => y.overlap - x.overlap)

  for (const { a } of scored) {
    const ageHours = (now - new Date(a.publishedAt).getTime()) / 3600000
    const contradicts = a.contradicts.some((p) => hasAll(w, p))
    const supports = a.supports.some((p) => hasAll(w, p))
    if (!contradicts && !supports) continue

    if (ageHours > CURRENT_EVENT_MAX_HOURS) {
      return {
        verdict: 'unverified',
        explanation: `The only related advisory is from a previous period (${Math.round(ageHours / 24)} days old). An old advisory cannot confirm or deny a current event.`,
        advisory: a,
        checkedAt,
      }
    }
    if (contradicts) {
      return {
        verdict: 'contradicted',
        explanation: `A recent advisory says otherwise: "${a.title}". This message appears to be false. Please do not forward it.`,
        advisory: a,
        checkedAt,
      }
    }
    return {
      verdict: 'supported',
      explanation: `A recent advisory confirms this: "${a.title}". Still follow the latest official instructions.`,
      advisory: a,
      checkedAt,
    }
  }

  return {
    verdict: 'unverified',
    explanation:
      'Unverified — no relevant official confirmation found. This does not prove the message is false. Do not share it until an official source confirms.',
    advisory: null,
    checkedAt,
  }
}
