import { centroid } from './geo'
import type {
  Advisory,
  Contact,
  Point,
  RainfallObservation,
  ReportCategory,
  Shelter,
  Skill,
  Volunteer,
  Ward,
} from './types'

type WardSeed = { code: string; name: string; poly: [number, number][]; susceptibility: number }

/**
 * Schematic ward shapes, arranged roughly north → south. These are illustrative tiles,
 * NOT official BMC ward boundaries.
 */
const WARD_SEEDS: WardSeed[] = [
  { code: 'R/C', name: 'Borivali', poly: [[85, 20], [205, 20], [200, 110], [80, 110]], susceptibility: 0.35 },
  { code: 'S', name: 'Bhandup', poly: [[205, 20], [325, 35], [320, 120], [200, 110]], susceptibility: 0.45 },
  { code: 'P/N', name: 'Malad', poly: [[80, 110], [200, 110], [195, 200], [70, 200]], susceptibility: 0.5 },
  { code: 'N', name: 'Ghatkopar', poly: [[200, 110], [320, 120], [330, 205], [195, 200]], susceptibility: 0.45 },
  { code: 'K/W', name: 'Andheri West', poly: [[70, 200], [140, 200], [135, 290], [60, 290]], susceptibility: 0.7 },
  { code: 'K/E', name: 'Andheri East', poly: [[140, 200], [240, 202], [240, 290], [135, 290]], susceptibility: 0.75 },
  { code: 'L', name: 'Kurla', poly: [[240, 202], [330, 205], [335, 290], [240, 290]], susceptibility: 0.8 },
  { code: 'H/W', name: 'Bandra West', poly: [[60, 290], [150, 290], [155, 370], [80, 370]], susceptibility: 0.4 },
  { code: 'H/E', name: 'Santacruz East', poly: [[150, 290], [240, 290], [240, 370], [155, 370]], susceptibility: 0.7 },
  { code: 'M/E', name: 'Chembur East', poly: [[240, 290], [335, 290], [340, 375], [240, 370]], susceptibility: 0.65 },
  { code: 'G/N', name: 'Dadar–Dharavi', poly: [[100, 370], [195, 370], [195, 445], [115, 445]], susceptibility: 0.7 },
  { code: 'F/N', name: 'Matunga–Sion', poly: [[195, 370], [290, 372], [270, 445], [195, 445]], susceptibility: 0.8 },
  { code: 'E', name: 'Byculla', poly: [[115, 445], [270, 445], [245, 525], [150, 525]], susceptibility: 0.5 },
  { code: 'A', name: 'Colaba–Fort', poly: [[150, 525], [245, 525], [215, 620], [180, 620]], susceptibility: 0.3 },
]

export function seedWards(): Ward[] {
  return WARD_SEEDS.map((w) => {
    const polygon: Point[] = w.poly.map(([x, y]) => ({ x, y }))
    return {
      id: w.code.replace('/', '-').toLowerCase(),
      code: w.code,
      name: w.name,
      polygon,
      center: centroid(polygon),
      susceptibility: w.susceptibility,
    }
  })
}

const minsAgo = (now: number, m: number) => new Date(now - m * 60000).toISOString()

/** Illustrative sample rainfall (mm over 3 h). Not live IMD observations. */
const SAMPLE_RAIN: Record<string, number | null> = {
  'r-c': 38,
  s: 52,
  'p-n': 61,
  n: 48,
  'k-w': 72,
  'k-e': 88,
  l: 96,
  'h-w': 54,
  'h-e': 112,
  'm-e': null,
  'g-n': 82,
  'f-n': 76,
  e: 40,
  a: 22,
}

export function seedRainfall(now: number): RainfallObservation[] {
  return Object.entries(SAMPLE_RAIN).map(([wardId, mm], i) => ({
    id: `rain-${wardId}`,
    wardId,
    mm,
    windowHours: 3,
    observedAt: minsAgo(now, wardId === 'a' ? 220 : 12 + i * 2),
    source: 'Demo sample dataset (illustrative values, not live IMD data)',
    isSample: true,
  }))
}

const SHELTER_SEEDS: [string, string, number, number, number, number, boolean, boolean, boolean, boolean, number][] = [
  // name, ward, x, y, capacity, occupied, accessible, water, medical, open, updatedMinsAgo
  ['Sahyadri Community Hall (demo)', 'k-e', 200, 240, 120, 96, true, true, true, true, 15],
  ['Marol Civic Centre (demo)', 'k-e', 175, 270, 80, 79, false, true, false, true, 25],
  ['Mithi Riverside Hall (demo)', 'l', 290, 250, 150, 110, true, true, false, true, 10],
  ['Kurla Relief Point B (demo)', 'l', 310, 275, 60, 60, false, true, false, true, 40],
  ['Santacruz Ward Hall (demo)', 'h-e', 200, 330, 100, 52, true, true, true, true, 20],
  ['Sion Hilltop Centre (demo)', 'f-n', 240, 405, 90, 41, true, true, false, true, 8],
  ['Dharavi Transit Shelter (demo)', 'g-n', 155, 410, 110, 98, false, true, true, true, 190],
  ['Chembur Relief Hall (demo)', 'm-e', 290, 330, 70, 30, true, false, false, true, 30],
  ['Bandra Seaside Hall (demo)', 'h-w', 105, 330, 85, 20, true, true, false, false, 60],
  ['Malad Community Centre (demo)', 'p-n', 135, 155, 130, 40, true, true, true, true, 18],
]

export function seedShelters(now: number): Shelter[] {
  return SHELTER_SEEDS.map(([name, wardId, x, y, capacity, occupied, accessible, water, medical, open, upd], i) => ({
    id: `sh-${i + 1}`,
    name,
    wardId,
    location: { x, y },
    capacity,
    occupied,
    accessible,
    drinkingWater: water,
    medicalSupport: medical,
    open,
    capacityUpdatedAt: minsAgo(now, upd),
  }))
}

const VOL_SEEDS: [string, Skill[], string, number, number, boolean, boolean][] = [
  ['Ananya R.', ['first_aid', 'mobility_assist'], 'k-e', 185, 230, true, true],
  ['Rohit S.', ['water_rescue', 'first_aid'], 'k-e', 215, 260, true, true],
  ['Imran K.', ['transport', 'general'], 'k-e', 160, 250, true, true],
  ['Sneha P.', ['mobility_assist', 'general'], 'l', 280, 235, true, true],
  ['Vikram D.', ['water_rescue'], 'l', 300, 260, true, true],
  ['Farah M.', ['first_aid'], 'l', 265, 270, true, true],
  ['Joseph L.', ['general'], 'k-w', 100, 240, true, false],
  ['Priya N.', ['first_aid', 'mobility_assist'], 'h-e', 190, 320, true, true],
  ['Aditya G.', ['transport'], 'h-e', 215, 350, true, true],
  ['Meera T.', ['general', 'mobility_assist'], 'g-n', 150, 400, true, true],
  ['Sameer B.', ['water_rescue', 'transport'], 'f-n', 235, 395, true, true],
  ['Kavita J.', ['first_aid'], 'f-n', 255, 420, false, true],
  ['Arjun V.', ['general'], 'm-e', 285, 315, true, true],
  ['Nisha C.', ['mobility_assist'], 'm-e', 300, 345, true, true],
  ['Rahul P.', ['transport', 'general'], 'p-n', 140, 170, true, true],
  ['Zoya H.', ['first_aid'], 'p-n', 110, 140, true, true],
  ['Ganesh W.', ['water_rescue', 'first_aid'], 'n', 260, 160, true, true],
  ['Deepa S.', ['general'], 's', 260, 70, true, false],
  ['Tanvir A.', ['transport'], 'e', 190, 480, true, true],
  ['Lakshmi I.', ['first_aid', 'general'], 'a', 200, 570, true, true],
]

export function seedVolunteers(now: number): Volunteer[] {
  return VOL_SEEDS.map(([displayName, skills, wardId, x, y, available, verified], i) => ({
    id: `vol-${i + 1}`,
    displayName,
    skills,
    wardId,
    location: { x, y },
    available,
    verified,
    lastUpdateAt: minsAgo(now, 5 + i * 3),
  }))
}

export type ReportSeed = {
  category: ReportCategory
  wardId: string
  x: number
  y: number
  landmark: string
  partySize: number
  needsMobility: boolean
  needsMedical: boolean
  description: string
  minsAgo: number
}

export const REPORT_SEEDS: ReportSeed[] = [
  { category: 'water_entering', wardId: 'k-e', x: 196, y: 228, landmark: 'Near the subway underpass', partySize: 4, needsMobility: false, needsMedical: false, description: 'Water entering ground floor homes, knee deep on the lane.', minsAgo: 50 },
  { category: 'water_entering', wardId: 'k-e', x: 201, y: 232, landmark: 'Lane behind the subway', partySize: 2, needsMobility: false, needsMedical: false, description: 'Water is coming into our room from the lane.', minsAgo: 38 },
  { category: 'waterlogging', wardId: 'k-e', x: 192, y: 225, landmark: 'Subway underpass', partySize: 1, needsMobility: false, needsMedical: false, description: 'Underpass fully waterlogged, vehicles stuck.', minsAgo: 30 },
  { category: 'trapped', wardId: 'l', x: 300, y: 245, landmark: 'Chawl near the river bank', partySize: 5, needsMobility: false, needsMedical: false, description: 'Family stuck on first floor, water rising on the stairs.', minsAgo: 26 },
  { category: 'waterlogging', wardId: 'l', x: 285, y: 260, landmark: 'Station road', partySize: 1, needsMobility: false, needsMedical: false, description: 'Waist deep water on station road.', minsAgo: 44 },
  { category: 'waterlogging', wardId: 'l', x: 292, y: 255, landmark: 'Station road junction', partySize: 1, needsMobility: false, needsMedical: false, description: 'Station road junction flooded, buses stopped.', minsAgo: 35 },
  { category: 'medical', wardId: 'h-e', x: 205, y: 325, landmark: 'Building near the canal', partySize: 2, needsMobility: false, needsMedical: true, description: 'Elderly neighbour needs her dialysis, cannot reach hospital.', minsAgo: 22 },
  { category: 'shelter', wardId: 'f-n', x: 250, y: 410, landmark: 'Low-lying lane near the market', partySize: 6, needsMobility: false, needsMedical: false, description: 'Our house is flooded, need a place to stay with children.', minsAgo: 60 },
  { category: 'waterlogging', wardId: 'f-n', x: 240, y: 398, landmark: 'Market circle', partySize: 1, needsMobility: false, needsMedical: false, description: 'Market circle waterlogged.', minsAgo: 55 },
  { category: 'mobility', wardId: 'g-n', x: 160, y: 415, landmark: 'Lane next to the community toilet block', partySize: 2, needsMobility: true, needsMedical: false, description: 'My mother uses a wheelchair, we need help moving out.', minsAgo: 18 },
  { category: 'waterlogging', wardId: 'g-n', x: 150, y: 395, landmark: 'Main road', partySize: 1, needsMobility: false, needsMedical: false, description: 'Main road waterlogged near the bridge.', minsAgo: 70 },
  { category: 'water_entering', wardId: 'k-w', x: 100, y: 255, landmark: 'Near the subway', partySize: 3, needsMobility: false, needsMedical: false, description: 'Water entering shops and homes.', minsAgo: 42 },
  { category: 'waterlogging', wardId: 'h-e', x: 185, y: 300, landmark: 'Highway service road', partySize: 1, needsMobility: false, needsMedical: false, description: 'Service road waterlogged.', minsAgo: 28 },
  { category: 'shelter', wardId: 'm-e', x: 295, y: 335, landmark: 'Settlement near the nallah', partySize: 4, needsMobility: false, needsMedical: false, description: 'Need shelter, our shed roof is leaking and water inside.', minsAgo: 15 },
  { category: 'waterlogging', wardId: 'p-n', x: 130, y: 160, landmark: 'Link road', partySize: 1, needsMobility: false, needsMedical: false, description: 'Link road has standing water.', minsAgo: 80 },
]

export function seedContacts(wards: Ward[]): Contact[] {
  const contacts: Contact[] = []
  wards.forEach((w, wi) => {
    const n = 3 + ((wi * 7) % 6)
    for (let i = 0; i < n; i++) {
      contacts.push({
        id: `ct-${w.id}-${i}`,
        wardId: w.id,
        label: `Demo resident ${i + 1}`,
        maskedPhone: `+91 9•••• •••${(10 + wi * 3 + i).toString().slice(-2)}`,
      })
    }
  })
  return contacts
}

export function seedAdvisories(now: number): Advisory[] {
  return [
    {
      id: 'adv-1',
      publisher: 'Demo Municipal Disaster Control (fictional)',
      title: 'Lake levels normal; no dam breach reported',
      excerpt:
        'Demo advisory: Water levels at city supply lakes are being monitored. There is no breach or overflow emergency at any lake. Residents should ignore forwarded messages claiming a dam burst.',
      publishedAt: minsAgo(now, 90),
      location: 'City-wide',
      sourceUrl: null,
      isDemo: true,
      keywords: ['dam', 'lake', 'burst', 'breach', 'powai', 'vihar', 'overflow'],
      supports: [],
      contradicts: [['dam', 'burst'], ['dam', 'breach'], ['lake', 'burst'], ['lake', 'breach'], ['powai', 'burst']],
    },
    {
      id: 'adv-2',
      publisher: 'Demo Municipal Disaster Control (fictional)',
      title: 'Schools closed tomorrow due to heavy rainfall warning',
      excerpt:
        'Demo advisory: All municipal and private schools in the city will remain closed tomorrow as a precaution due to the heavy rainfall warning.',
      publishedAt: minsAgo(now, 120),
      location: 'City-wide',
      sourceUrl: null,
      isDemo: true,
      keywords: ['school', 'schools', 'closed', 'holiday', 'tomorrow', 'college'],
      supports: [['school', 'closed'], ['schools', 'closed'], ['school', 'holiday']],
      contradicts: [['school', 'open'], ['schools', 'open']],
    },
    {
      id: 'adv-3',
      publisher: 'Demo Railway Operations Desk (fictional)',
      title: 'Harbour line suspended between Kurla and CSMT',
      excerpt:
        'Demo advisory: Harbour line services are suspended between Kurla and CSMT due to water on tracks. Main line services are running with delays.',
      publishedAt: minsAgo(now, 45),
      location: 'Kurla – CSMT',
      sourceUrl: null,
      isDemo: true,
      keywords: ['train', 'trains', 'local', 'harbour', 'railway', 'line', 'suspended', 'cancelled', 'stopped', 'kurla'],
      supports: [['harbour', 'suspended'], ['harbour', 'stopped'], ['harbour', 'cancelled']],
      contradicts: [['all', 'trains', 'cancelled'], ['all', 'local', 'cancelled'], ['all', 'trains', 'stopped']],
    },
    {
      id: 'adv-4',
      publisher: 'Demo Municipal Disaster Control (fictional)',
      title: 'Drinking water supply is safe; no contamination advisory',
      excerpt:
        'Demo advisory: There is no advisory about contamination of municipal tap water. Boil water as a general monsoon precaution. Do not forward messages about poison in water supply.',
      publishedAt: minsAgo(now, 200),
      location: 'City-wide',
      sourceUrl: null,
      isDemo: true,
      keywords: ['water', 'tap', 'supply', 'contaminated', 'poison', 'poisoned', 'drinking'],
      supports: [],
      contradicts: [['water', 'contaminated'], ['water', 'poison'], ['water', 'poisoned'], ['tap', 'contaminated']],
    },
    {
      id: 'adv-5',
      publisher: 'Demo Municipal Disaster Control (fictional)',
      title: 'Andheri subway closed to traffic',
      excerpt:
        'Demo advisory: The Andheri subway is closed to vehicle traffic due to waterlogging. Use alternate routes and follow traffic police instructions.',
      publishedAt: minsAgo(now, 30),
      location: 'Andheri (K/E, K/W)',
      sourceUrl: null,
      isDemo: true,
      keywords: ['andheri', 'subway', 'closed', 'traffic', 'road'],
      supports: [['andheri', 'subway', 'closed'], ['subway', 'closed']],
      contradicts: [['andheri', 'subway', 'open']],
    },
    {
      id: 'adv-old',
      publisher: 'Demo Municipal Disaster Control (fictional)',
      title: 'High tide warning (previous season)',
      excerpt: 'Demo advisory from a previous season: high tide of 4.5 m expected. Avoid sea fronts.',
      publishedAt: minsAgo(now, 60 * 24 * 300),
      location: 'Coastal wards',
      sourceUrl: null,
      isDemo: true,
      keywords: ['tide', 'high', 'sea', 'tsunami', 'waves'],
      supports: [['high', 'tide']],
      contradicts: [],
    },
  ]
}
