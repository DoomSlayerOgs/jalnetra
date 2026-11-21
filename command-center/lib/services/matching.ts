import { distanceKm } from '../geo'
import { SKILL_LABEL } from '../labels'
import type {
  Report,
  Shelter,
  ShelterMatch,
  Volunteer,
  VolunteerExclusion,
  VolunteerMatch,
} from '../types'

export const SHELTER_STALE_MINUTES = 120

/** Available places = capacity − occupied − active reservations. */
export function availablePlaces(shelter: Shelter, reservedActive: number) {
  return Math.max(0, shelter.capacity - shelter.occupied - reservedActive)
}

export function matchShelters(
  report: Pick<Report, 'location' | 'partySize' | 'needsMobility' | 'needsMedical'>,
  shelters: Shelter[],
  reservedByShelter: Record<string, number>,
  now: number,
) {
  const matches: ShelterMatch[] = []
  const excluded: { shelter: Shelter; reason: string }[] = []

  for (const shelter of shelters) {
    const available = availablePlaces(shelter, reservedByShelter[shelter.id] ?? 0)
    if (!shelter.open) {
      excluded.push({ shelter, reason: 'Closed' })
      continue
    }
    if (available < report.partySize) {
      excluded.push({ shelter, reason: `Only ${available} places — party of ${report.partySize}` })
      continue
    }
    if (report.needsMobility && !shelter.accessible) {
      excluded.push({ shelter, reason: 'Not wheelchair accessible' })
      continue
    }
    if (report.needsMedical && !shelter.medicalSupport) {
      excluded.push({ shelter, reason: 'No medical support' })
      continue
    }
    const stale = now - new Date(shelter.capacityUpdatedAt).getTime() > SHELTER_STALE_MINUTES * 60000
    const km = distanceKm(report.location, shelter.location)
    const reasons = [`Room for the whole party (${available} places free)`]
    if (report.needsMobility) reasons.push('Wheelchair accessible')
    if (report.needsMedical) reasons.push('Medical support on site')
    if (shelter.drinkingWater) reasons.push('Drinking water available')
    reasons.push(`≈${km.toFixed(1)} km (straight line)`)
    matches.push({ shelter, available, distanceKm: km, reasons, stale })
  }

  matches.sort((a, b) => Number(a.stale) - Number(b.stale) || a.distanceKm - b.distanceKm)
  return { matches, excluded }
}

export function matchVolunteers(
  report: Pick<Report, 'location' | 'requiredSkills'>,
  volunteers: Volunteer[],
  busyIds: Set<string>,
) {
  const matches: VolunteerMatch[] = []
  const excluded: VolunteerExclusion[] = []
  const required = report.requiredSkills
  const needsRescue = required.includes('water_rescue')

  for (const v of volunteers) {
    if (!v.available) {
      excluded.push({ volunteer: v, reason: 'Marked unavailable' })
      continue
    }
    if (busyIds.has(v.id)) {
      excluded.push({ volunteer: v, reason: 'Already on an active assignment' })
      continue
    }
    if (needsRescue && !(v.skills.includes('water_rescue') && v.verified)) {
      excluded.push({ volunteer: v, reason: 'Water rescue requires a verified trained volunteer' })
      continue
    }
    const matched = required.filter((s) => v.skills.includes(s))
    if (required.length > 0 && matched.length === 0) {
      excluded.push({ volunteer: v, reason: 'No matching skill' })
      continue
    }
    const km = distanceKm(report.location, v.location)
    const reasons = [
      matched.length ? `Skills: ${matched.map((s) => SKILL_LABEL[s]).join(', ')}` : 'General support',
      `≈${km.toFixed(1)} km away (straight line)`,
      v.verified ? 'Demo-verified' : 'Not yet verified',
    ]
    matches.push({ volunteer: v, distanceKm: km, matchedSkills: matched, reasons })
  }

  matches.sort(
    (a, b) =>
      b.matchedSkills.length - a.matchedSkills.length ||
      Number(b.volunteer.verified) - Number(a.volunteer.verified) ||
      a.distanceKm - b.distanceKm,
  )
  return { matches, excluded }
}
