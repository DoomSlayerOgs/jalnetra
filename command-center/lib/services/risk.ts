import type { RainfallObservation, Report, RiskLevel, Ward, WardAssessment } from '../types'

/** Configurable prototype rules — not a scientifically validated forecast model. */
export const RISK_RULES = {
  /** mm over the observation window → points */
  rainfallBands: [
    { minMm: 100, points: 4, label: 'Very heavy rainfall' },
    { minMm: 65, points: 3, label: 'Heavy rainfall' },
    { minMm: 35, points: 2, label: 'Moderate–heavy rainfall' },
    { minMm: 15, points: 1, label: 'Moderate rainfall' },
    { minMm: 0, points: 0, label: 'Light rainfall' },
  ],
  highSusceptibility: 0.7,
  susceptibilityPoints: 1,
  reportWindowMinutes: 180,
  reportBands: [
    { min: 3, points: 2 },
    { min: 1, points: 1 },
  ],
  staleAfterMinutes: 180,
  levels: [
    { minScore: 6, level: 'critical' as RiskLevel },
    { minScore: 4, level: 'high' as RiskLevel },
    { minScore: 2, level: 'watch' as RiskLevel },
    { minScore: 0, level: 'lower' as RiskLevel },
  ],
}

const HAZARD_CATEGORIES = new Set(['waterlogging', 'water_entering', 'trapped'])

export function assessWard(
  ward: Ward,
  rainfall: RainfallObservation | null,
  reports: Report[],
  now: number,
  rules = RISK_RULES,
): WardAssessment {
  const factors: string[] = []
  const warnings: string[] = []
  let score = 0

  const stale =
    rainfall && now - new Date(rainfall.observedAt).getTime() > rules.staleAfterMinutes * 60000
  const rainMm = rainfall && !stale ? rainfall.mm : null

  if (rainMm === null) {
    warnings.push(
      !rainfall || rainfall.mm === null
        ? 'No rainfall observation available — missing data is not zero rainfall.'
        : `Rainfall observation is older than ${rules.staleAfterMinutes / 60} h and was not used.`,
    )
  } else {
    const band = rules.rainfallBands.find((b) => rainMm >= b.minMm)!
    score += band.points
    factors.push(`${band.label}: ${rainMm} mm in ${rainfall!.windowHours} h`)
  }

  if (ward.susceptibility >= rules.highSusceptibility) {
    score += rules.susceptibilityPoints
    factors.push('Historically flood-prone area (assumed demo susceptibility)')
  }

  // Hazard counts physical reports only; distinct help needs drive response priority separately.
  const recent = reports.filter(
    (r) =>
      r.wardId === ward.id &&
      HAZARD_CATEGORIES.has(r.category) &&
      now - new Date(r.createdAt).getTime() <= rules.reportWindowMinutes * 60000,
  )
  const reportBand = rules.reportBands.find((b) => recent.length >= b.min)
  if (reportBand) {
    score += reportBand.points
    factors.push(`${recent.length} citizen water report${recent.length === 1 ? '' : 's'} in last 3 h`)
  }

  let level: RiskLevel
  if (rainMm === null && recent.length === 0) {
    level = 'unknown'
  } else {
    level = rules.levels.find((l) => score >= l.minScore)!.level
    if (rainMm === null && level === 'lower') level = 'watch'
  }

  if (recent.length === 0 && level !== 'unknown') {
    warnings.push('No citizen reports received — this does not mean the area is safe.')
  }

  return {
    wardId: ward.id,
    level,
    score,
    factors,
    warnings,
    rainfall,
    waterloggingReports: recent.length,
    assessedAt: new Date(now).toISOString(),
  }
}
