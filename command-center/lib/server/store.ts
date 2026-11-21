import 'server-only'
import { randomBytes, randomUUID } from 'node:crypto'
import { pointInPolygon } from '../geo'
import {
  REPORT_SEEDS,
  seedAdvisories,
  seedContacts,
  seedRainfall,
  seedShelters,
  seedVolunteers,
  seedWards,
} from '../seed'
import { classifyReport, priorityRank } from '../services/classify'
import { DUPLICATE_RULES, scoreDuplicate } from '../services/duplicates'
import { availablePlaces, matchShelters, matchVolunteers } from '../services/matching'
import { assessWard } from '../services/risk'
import { checkClaim } from '../services/truth-check'
import { loadSnapshot, replaceSnapshot, saveSnapshot, storageMode } from './persistence'
import type {
  Advisory,
  AppNotification,
  Priority,
  Skill,
  Alert,
  AlertDelivery,
  Assignment,
  AssignmentStatus,
  AuditEvent,
  CommandState,
  Contact,
  DuplicateSuggestion,
  Incident,
  Lang,
  Point,
  RainfallObservation,
  Report,
  ReportCategory,
  ReportStatus,
  ReportView,
  Shelter,
  ShelterReservation,
  TrackingView,
  Volunteer,
  Ward,
} from '../types'

type DB = {
  seededAt: number
  wards: Ward[]
  rainfall: RainfallObservation[]
  reports: Report[]
  incidents: Incident[]
  suggestions: DuplicateSuggestion[]
  dismissedPairs: string[]
  shelters: Shelter[]
  reservations: ShelterReservation[]
  volunteers: Volunteer[]
  assignments: Assignment[]
  alerts: Alert[]
  deliveries: AlertDelivery[]
  contacts: Contact[]
  advisories: Advisory[]
  audit: AuditEvent[]
  notifications: AppNotification[]
}

const rate = new Map<string, number[]>()
let current: DB | null = null

const iso = (t = Date.now()) => new Date(t).toISOString()
const id = (p: string) => `${p}-${randomUUID().slice(0, 8)}`

function referenceCode() {
  const n = randomBytes(3).readUIntBE(0, 3) % 1000000
  return `JR-${n.toString().padStart(6, '0')}`
}

function freshDb(): DB {
  const now = Date.now()
  const wards = seedWards()
  const db: DB = {
    seededAt: now,
    wards,
    rainfall: seedRainfall(now),
    reports: [],
    incidents: [],
    suggestions: [],
    dismissedPairs: [],
    shelters: seedShelters(now),
    reservations: [],
    volunteers: seedVolunteers(now),
    assignments: [],
    alerts: [],
    deliveries: [],
    contacts: seedContacts(wards),
    advisories: seedAdvisories(now),
    audit: [],
    notifications: [],
  }
  for (const s of REPORT_SEEDS) {
    insertReport(db, {
      category: s.category,
      wardId: s.wardId,
      location: { x: s.x, y: s.y },
      landmark: s.landmark,
      partySize: s.partySize,
      needsMobility: s.needsMobility,
      needsMedical: s.needsMedical,
      hasChildren: false,
      otherNeeds: '',
      description: s.description,
      contactName: null,
      contactPhone: null,
      language: 'en',
      createdAt: iso(now - s.minsAgo * 60000),
      isSeed: true,
    })
  }
  // A seeded shelter reservation so availability math is visible from the start.
  const shelterReq = db.reports.find((r) => r.category === 'shelter' && r.wardId === 'f-n')
  if (shelterReq) {
    db.reservations.push({ id: id('res'), shelterId: 'sh-6', reportId: shelterReq.id, places: shelterReq.partySize, status: 'active', createdAt: iso(now - 40 * 60000) })
    setStatus(shelterReq, 'reviewed', iso(now - 45 * 60000))
  }
  db.audit.push({ id: id('ev'), at: iso(now), actor: 'system', type: 'demo.seeded', message: 'Demo data loaded (fictional wards, shelters, volunteers and reports).' })
  return db
}

function db(): DB {
  if (!current) throw new Error('Store accessed outside a transaction')
  return current
}

/** Load state, run a synchronous reader. */
async function read<T>(fn: () => T): Promise<T> {
  const snap = await loadSnapshot(freshDb)
  current = snap.data
  try {
    return fn()
  } finally {
    current = null
  }
}

/**
 * Load, mutate synchronously, then save with an optimistic version check.
 * The mutation must not await, so check-and-insert logic stays atomic per attempt.
 */
async function write<T>(fn: () => T): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const snap = await loadSnapshot(freshDb)
    current = snap.data
    let result: T
    try {
      result = fn()
    } finally {
      current = null
    }
    if (await saveSnapshot(snap.data, snap.version)) return result
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 80))
  }
  throw new ActionError('The system is busy. Please retry.', 503)
}

export async function resetDemo() {
  await replaceSnapshot(freshDb())
  return true
}

function notify(d: DB, n: Omit<AppNotification, 'id' | 'at' | 'read'>) {
  d.notifications.unshift({ id: id('ntf'), at: iso(), read: false, ...n })
  if (d.notifications.length > 300) d.notifications.length = 300
}

function log(d: DB, actor: string, type: string, message: string, wardId?: string) {
  d.audit.unshift({ id: id('ev'), at: iso(), actor, type, message, wardId })
  if (d.audit.length > 200) d.audit.length = 200
}

function setStatus(r: Report, status: ReportStatus, at = iso()) {
  r.status = status
  r.history[status] = at
  r.updatedAt = at
}

type NewReport = {
  category: ReportCategory
  wardId: string
  location: Point
  landmark: string
  partySize: number
  needsMobility: boolean
  needsMedical: boolean
  hasChildren: boolean
  otherNeeds: string
  description: string
  contactName: string | null
  contactPhone: string | null
  language: Lang
  createdAt?: string
  isSeed?: boolean
}

function insertReport(d: DB, input: NewReport) {
  const createdAt = input.createdAt ?? iso()
  const cls = classifyReport(input)
  const report: Report = {
    id: id('rep'),
    reference: referenceCode(),
    token: randomBytes(18).toString('base64url'),
    ...input,
    priority: cls.priority,
    requiredSkills: cls.requiredSkills,
    classificationNotes: cls.notes,
    status: 'received',
    history: { received: createdAt },
    incidentId: null,
    duplicateOf: null,
    createdAt,
    updatedAt: createdAt,
    isSeed: input.isSeed ?? false,
  }
  d.reports.push(report)
  linkDuplicates(d, report)
  return report
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

function attachToIncident(d: DB, report: Report, other: Report) {
  let incident = other.incidentId ? d.incidents.find((i) => i.id === other.incidentId) : undefined
  if (!incident) {
    incident = {
      id: id('inc'),
      wardId: other.wardId,
      category: other.category,
      reportIds: [other.id],
      center: other.location,
      createdAt: other.createdAt,
      status: 'open',
    }
    d.incidents.push(incident)
    other.incidentId = incident.id
  }
  if (!incident.reportIds.includes(report.id)) incident.reportIds.push(report.id)
  report.incidentId = incident.id
  report.duplicateOf = other.id
}

function linkDuplicates(d: DB, report: Report) {
  for (const other of d.reports) {
    if (other.id === report.id || other.status === 'closed') continue
    if (d.dismissedPairs.includes(pairKey(report.id, other.id))) continue
    const score = scoreDuplicate(report, other)
    if (!score) continue
    if (score.confidence >= DUPLICATE_RULES.autoLink && !report.incidentId) {
      attachToIncident(d, report, other)
    } else if (score.confidence >= DUPLICATE_RULES.suggest && report.incidentId !== other.incidentId) {
      d.suggestions.push({ reportId: report.id, candidateId: other.id, confidence: score.confidence, reasons: score.reasons })
    }
  }
}

function reservedByShelter(d: DB) {
  const out: Record<string, number> = {}
  for (const r of d.reservations) if (r.status === 'active') out[r.shelterId] = (out[r.shelterId] ?? 0) + r.places
  return out
}

const ACTIVE: AssignmentStatus[] = ['approved', 'accepted', 'en_route', 'arrived']

function busyVolunteerIds(d: DB) {
  return new Set(d.assignments.filter((a) => ACTIVE.includes(a.status)).map((a) => a.volunteerId))
}

function toView(d: DB, r: Report): ReportView {
  const { token: _t, contactPhone, ...rest } = r
  const res = d.reservations.find((x) => x.reportId === r.id && x.status !== 'released')
  const asg = [...d.assignments].reverse().find((a) => a.reportId === r.id && a.status !== 'declined')
  return {
    ...rest,
    hasContact: Boolean(contactPhone),
    shelterReservation: res ? { ...res, shelterName: d.shelters.find((s) => s.id === res.shelterId)?.name ?? '' } : null,
    assignment: asg ? { ...asg, volunteerName: d.volunteers.find((v) => v.id === asg.volunteerId)?.displayName ?? '' } : null,
  }
}

function getCommandStateSync(): CommandState {
  const d = db()
  const now = Date.now()
  const assessments = d.wards.map((w) =>
    assessWard(w, d.rainfall.find((r) => r.wardId === w.id) ?? null, d.reports, now),
  )
  const reserved = reservedByShelter(d)
  const busy = busyVolunteerIds(d)
  const shelters = d.shelters.map((s) => ({ ...s, reserved: reserved[s.id] ?? 0, available: availablePlaces(s, reserved[s.id] ?? 0) }))
  const volunteers = d.volunteers.map((v) => ({ ...v, busy: busy.has(v.id) }))
  const reports = d.reports
    .map((r) => toView(d, r))
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.createdAt.localeCompare(a.createdAt))
  const open = reports.filter((r) => r.category !== 'waterlogging' && !['completed', 'closed', 'rejected'].includes(r.status))
  const openShelters = shelters.filter((s) => s.open)

  return {
    mode: 'demo',
    storage: storageMode,
    generatedAt: iso(now),
    notifications: d.notifications.filter((n) => n.audience === 'officer').slice(0, 30),
    wards: d.wards,
    assessments,
    reports,
    incidents: d.incidents,
    duplicateSuggestions: d.suggestions,
    shelters,
    volunteers,
    assignments: d.assignments,
    alerts: [...d.alerts].reverse(),
    audit: d.audit.slice(0, 40),
    metrics: {
      wardsAttention: assessments.filter((a) => a.level === 'high' || a.level === 'critical').length,
      openRequests: open.length,
      shelterPlaces: shelters.filter((s) => s.open).reduce((s, x) => s + x.available, 0),
      volunteersAvailable: volunteers.filter((v) => v.available && !v.busy).length,
      totalRequests: reports.length,
      pendingVerification: reports.filter((r) => r.status === 'received').length,
      verified: reports.filter((r) => r.history.reviewed && r.status !== 'rejected').length,
      critical: open.filter((r) => r.priority === 'life_threatening').length,
      volunteersDeployed: volunteers.filter((v) => v.busy).length,
      sheltersOpen: openShelters.length,
      shelterOccupied: openShelters.reduce((s, x) => s + x.occupied + x.reserved, 0),
      shelterCapacity: openShelters.reduce((s, x) => s + x.capacity, 0),
      activeOperations: d.assignments.filter((a) => ACTIVE.includes(a.status)).length,
    },
  }
}

export class ActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function rateLimit(key: string, max = 6, windowMs = 60000) {
  const now = Date.now()
  const hits = (rate.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= max) throw new ActionError('Too many submissions. Please wait a minute and try again.', 429)
  hits.push(now)
  rate.set(key, hits)
}

function createReportSync(input: Omit<NewReport, 'createdAt' | 'isSeed'>) {
  const d = db()
  const ward = d.wards.find((w) => w.id === input.wardId)
  if (!ward) throw new ActionError('Unknown ward')
  if (!pointInPolygon(input.location, ward.polygon)) input.location = ward.center
  const r = insertReport(d, input)
  log(d, 'citizen', 'report.created', `New ${r.category.replace('_', ' ')} report ${r.reference} (${r.priority.replace('_', ' ')})`, r.wardId)
  return { reference: r.reference, token: r.token, createdAt: r.createdAt }
}

function clearReportsSync(officer: string) {
  const d = db()
  const cleared = d.reports.length
  d.reports = []
  d.incidents = []
  d.suggestions = []
  d.dismissedPairs = []
  d.reservations = []
  d.assignments = []
  d.notifications = []
  log(d, officer, 'reports.cleared', `All SOS requests cleared (${cleared})`)
  return { cleared }
}

function getReport(d: DB, reportId: string) {
  const r = d.reports.find((x) => x.id === reportId)
  if (!r) throw new ActionError('Report not found', 404)
  return r
}

function getMatchesSync(reportId: string) {
  const d = db()
  const r = getReport(d, reportId)
  const shelters = matchShelters(r, d.shelters, reservedByShelter(d), Date.now())
  const volunteers = matchVolunteers(r, d.volunteers, busyVolunteerIds(d))
  return { shelters, volunteers }
}

function reviewReportSync(reportId: string, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  if (r.status === 'rejected') throw new ActionError('This request was rejected', 409)
  if (r.status === 'received') setStatus(r, 'reviewed')
  log(d, officer, 'report.reviewed', `${r.reference} verified by officer`, r.wardId)
  notify(d, { audience: `report:${r.id}`, title: 'Request verified', body: 'An officer has verified your request and is arranging help.' })
}

function reserveShelterSync(reportId: string, shelterId: string, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  const shelter = d.shelters.find((s) => s.id === shelterId)
  if (!shelter) throw new ActionError('Shelter not found', 404)
  if (!shelter.open) throw new ActionError('Shelter is closed')
  const existing = d.reservations.find((x) => x.reportId === r.id && x.status === 'active')
  if (existing) existing.status = 'released'
  // Synchronous check-and-insert: no await between read and write, so no overbooking.
  const avail = availablePlaces(shelter, reservedByShelter(d)[shelter.id] ?? 0)
  if (avail < r.partySize) {
    if (existing) existing.status = 'active'
    throw new ActionError(`Not enough places: ${avail} free, party of ${r.partySize}`, 409)
  }
  d.reservations.push({ id: id('res'), shelterId, reportId: r.id, places: r.partySize, status: 'active', createdAt: iso() })
  if (r.status === 'received') setStatus(r, 'reviewed')
  log(d, officer, 'shelter.reserved', `${r.partySize} places reserved at ${shelter.name} for ${r.reference}`, r.wardId)
  notify(d, { audience: `report:${r.id}`, title: 'Shelter place reserved', body: `${r.partySize} place(s) held for you at ${shelter.name}.` })
}

function assignVolunteerSync(reportId: string, volunteerId: string, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  const { volunteers } = getMatchesSync(reportId)
  const match = volunteers.matches.find((m) => m.volunteer.id === volunteerId)
  if (!match) {
    const ex = volunteers.excluded.find((e) => e.volunteer.id === volunteerId)
    throw new ActionError(ex ? `Cannot assign: ${ex.reason}` : 'Volunteer not found', 409)
  }
  if (d.assignments.some((a) => a.reportId === r.id && ACTIVE.includes(a.status))) {
    throw new ActionError('This request already has an active assignment', 409)
  }
  const now = iso()
  d.assignments.push({ id: id('asg'), reportId: r.id, volunteerId, approvedBy: officer, status: 'approved', createdAt: now, updatedAt: now })
  if (!r.history.reviewed) setStatus(r, 'reviewed', now)
  setStatus(r, 'assigned', now)
  log(d, officer, 'assignment.approved', `${match.volunteer.displayName} assigned to ${r.reference}`, r.wardId)
  notify(d, { audience: `volunteer:${volunteerId}`, title: 'New task assigned', body: `${r.reference}: ${r.category.replace('_', ' ')} near ${r.landmark || 'reported location'}. Please accept or decline.` })
  notify(d, { audience: `report:${r.id}`, title: 'Volunteer assigned', body: `${match.volunteer.displayName} has been assigned to your request.` })
}

const TRANSITIONS: Record<string, { from: AssignmentStatus[]; to: AssignmentStatus; report?: ReportStatus }> = {
  accept: { from: ['approved'], to: 'accepted', report: 'accepted' },
  decline: { from: ['approved', 'accepted'], to: 'declined' },
  en_route: { from: ['accepted'], to: 'en_route', report: 'en_route' },
  arrived: { from: ['en_route'], to: 'arrived', report: 'arrived' },
  completed: { from: ['arrived'], to: 'completed', report: 'completed' },
}

function updateAssignmentSync(assignmentId: string, action: string, volunteerId: string) {
  const d = db()
  const a = d.assignments.find((x) => x.id === assignmentId)
  if (!a) throw new ActionError('Assignment not found', 404)
  if (a.volunteerId !== volunteerId) throw new ActionError('This task is not assigned to you', 403)
  const t = TRANSITIONS[action]
  if (!t) throw new ActionError('Unknown action')
  if (!t.from.includes(a.status)) throw new ActionError(`Cannot ${action.replace('_', ' ')} from status "${a.status}"`, 409)
  const r = getReport(d, a.reportId)
  const now = iso()
  a.status = t.to
  a.updatedAt = now
  const v = d.volunteers.find((x) => x.id === volunteerId)!
  v.lastUpdateAt = now
  if (t.report) setStatus(r, t.report, now)
  if (action === 'decline') {
    r.status = 'reviewed'
    delete r.history.assigned
    delete r.history.accepted
    r.updatedAt = now
  }
  if (action === 'completed') {
    const res = d.reservations.find((x) => x.reportId === r.id && x.status === 'active')
    if (res) {
      res.status = 'checked_in'
      const s = d.shelters.find((x) => x.id === res.shelterId)
      if (s) {
        s.occupied += res.places
        s.capacityUpdatedAt = now
      }
    }
  }
  log(d, v.displayName, `assignment.${action}`, `${v.displayName}: ${action.replace('_', ' ')} — ${r.reference}`, r.wardId)
  const label: Record<string, string> = {
    accept: 'accepted the task',
    decline: 'declined the task',
    en_route: 'is on the way',
    arrived: 'has arrived',
    completed: 'completed the task',
  }
  notify(d, { audience: 'officer', title: `${r.reference} update`, body: `${v.displayName} ${label[action]}.` })
  if (action !== 'decline') notify(d, { audience: `report:${r.id}`, title: 'Volunteer update', body: `${v.displayName} ${label[action]}.` })
}

function rejectReportSync(reportId: string, reason: string, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  if (['completed', 'closed', 'rejected'].includes(r.status)) throw new ActionError(`Cannot reject a ${r.status} request`, 409)
  if (d.assignments.some((a) => a.reportId === r.id && ACTIVE.includes(a.status))) {
    throw new ActionError('Cancel the active volunteer assignment first', 409)
  }
  d.reservations.filter((x) => x.reportId === r.id && x.status === 'active').forEach((x) => (x.status = 'released'))
  r.status = 'rejected'
  r.rejectionReason = reason
  r.updatedAt = iso()
  log(d, officer, 'report.rejected', `${r.reference} rejected: ${reason}`, r.wardId)
  notify(d, { audience: `report:${r.id}`, title: 'Request not actioned', body: `An officer reviewed this request and could not action it: ${reason}. If you are in danger, call 112.` })
}

function setPrioritySync(reportId: string, priority: Priority, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  const before = r.priority
  r.priority = priority
  r.priorityOverride = { by: officer, at: iso() }
  r.updatedAt = iso()
  log(d, officer, 'report.priority', `${r.reference} priority changed ${before.replace('_', ' ')} → ${priority.replace('_', ' ')}`, r.wardId)
}

function updateShelterSync(
  shelterId: string,
  patch: { open?: boolean; capacity?: number; occupied?: number },
  officer: string,
) {
  const d = db()
  const s = d.shelters.find((x) => x.id === shelterId)
  if (!s) throw new ActionError('Shelter not found', 404)
  const reserved = reservedByShelter(d)[s.id] ?? 0
  const capacity = patch.capacity ?? s.capacity
  const occupied = patch.occupied ?? s.occupied
  if (capacity < 0 || occupied < 0) throw new ActionError('Values cannot be negative')
  if (occupied + reserved > capacity) {
    throw new ActionError(`Capacity ${capacity} is below occupied ${occupied} + reserved ${reserved}`, 409)
  }
  s.capacity = capacity
  s.occupied = occupied
  if (patch.open !== undefined) s.open = patch.open
  s.capacityUpdatedAt = iso()
  log(d, officer, 'shelter.updated', `${s.name}: ${s.open ? 'open' : 'closed'}, ${s.occupied}/${s.capacity} occupied`, s.wardId)
}

function registerVolunteerSync(input: { displayName: string; phone: string; wardId: string; skills: Skill[] }) {
  const d = db()
  const ward = d.wards.find((w) => w.id === input.wardId)
  if (!ward) throw new ActionError('Unknown ward')
  if (input.phone && d.volunteers.some((v) => v.phone === input.phone)) {
    throw new ActionError('A volunteer with this phone number is already registered', 409)
  }
  const v: Volunteer = {
    id: id('vol'),
    displayName: input.displayName,
    wardId: ward.id,
    location: ward.center,
    skills: input.skills,
    available: true,
    verified: false,
    lastUpdateAt: iso(),
    phone: input.phone || null,
    selfRegistered: true,
  }
  d.volunteers.push(v)
  log(d, 'volunteer', 'volunteer.registered', `${v.displayName} registered (pending verification) in ward ${ward.code}`, ward.id)
  notify(d, { audience: 'officer', title: 'New volunteer registered', body: `${v.displayName} in ${ward.name} is awaiting verification.` })
  return { id: v.id }
}

function verifyVolunteerSync(volunteerId: string, officer: string) {
  const d = db()
  const v = d.volunteers.find((x) => x.id === volunteerId)
  if (!v) throw new ActionError('Volunteer not found', 404)
  v.verified = true
  log(d, officer, 'volunteer.verified', `${v.displayName} verified`, v.wardId)
  notify(d, { audience: `volunteer:${v.id}`, title: 'You are verified', body: 'Officers can now assign you to rescue tasks.' })
}

function markReadSync(audience: string) {
  for (const n of db().notifications) if (n.audience === audience) n.read = true
}

function completeReportSync(reportId: string, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  setStatus(r, r.category === 'waterlogging' ? 'closed' : 'completed')
  d.assignments.filter((a) => a.reportId === r.id && ACTIVE.includes(a.status)).forEach((a) => {
    a.status = 'completed'
    a.updatedAt = iso()
  })
  log(d, officer, 'report.completed', `${r.reference} marked ${r.status}`, r.wardId)
}

function resolveDuplicateSync(reportId: string, candidateId: string, accept: boolean, officer: string) {
  const d = db()
  const r = getReport(d, reportId)
  const other = getReport(d, candidateId)
  d.suggestions = d.suggestions.filter((s) => !(s.reportId === reportId && s.candidateId === candidateId))
  if (accept) {
    attachToIncident(d, r, other)
    log(d, officer, 'duplicate.linked', `${r.reference} linked to incident with ${other.reference} (requests kept separate)`, r.wardId)
  } else {
    d.dismissedPairs.push(pairKey(reportId, candidateId))
    log(d, officer, 'duplicate.dismissed', `${r.reference} and ${other.reference} marked as separate incidents`, r.wardId)
  }
}

function sendAlertSync(wardId: string, message: string, officer: string) {
  const d = db()
  const ward = d.wards.find((w) => w.id === wardId)
  if (!ward) throw new ActionError('Unknown ward')
  const recipients = d.contacts.filter((c) => c.wardId === wardId)
  const alert: Alert = {
    id: id('alt'),
    wardId,
    message,
    channels: ['in_app', 'sms_simulated'],
    sender: officer,
    createdAt: iso(),
    status: 'simulated',
    recipientCount: recipients.length,
  }
  d.alerts.push(alert)
  for (const c of recipients) {
    d.deliveries.push({ id: id('dlv'), alertId: alert.id, contactId: c.id, channel: 'sms_simulated', status: 'simulated' })
  }
  log(d, officer, 'alert.sent', `Alert sent to ward ${ward.code} ${ward.name} only (${recipients.length} demo recipients, simulated SMS)`, wardId)
  return { alert, recipients: recipients.map((c) => ({ label: c.label, maskedPhone: c.maskedPhone })) }
}

function alertsForWardSync(wardId: string) {
  return [...db().alerts].filter((a) => a.wardId === wardId).reverse()
}

function getTrackingSync(token: string): TrackingView | null {
  const d = db()
  const r = d.reports.find((x) => x.token === token)
  if (!r) return null
  const view = toView(d, r)
  const shelter = view.shelterReservation ? d.shelters.find((s) => s.id === view.shelterReservation!.shelterId) : null
  const vol = view.assignment ? d.volunteers.find((v) => v.id === view.assignment!.volunteerId) : null
  const steps: ReportStatus[] = ['received', 'reviewed', 'assigned', 'accepted', 'en_route', 'arrived', 'completed']
  return {
    reference: r.reference,
    category: r.category,
    wardId: r.wardId,
    wardName: `${d.wards.find((w) => w.id === r.wardId)?.code} ${d.wards.find((w) => w.id === r.wardId)?.name}`,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    partySize: r.partySize,
    shelter: shelter
      ? {
          name: shelter.name,
          places: view.shelterReservation!.places,
          accessible: shelter.accessible,
          medicalSupport: shelter.medicalSupport,
          drinkingWater: shelter.drinkingWater,
          capacityUpdatedAt: shelter.capacityUpdatedAt,
        }
      : null,
    volunteer:
      vol && view.assignment
        ? { displayName: vol.displayName, skills: vol.skills, status: view.assignment.status, lastUpdateAt: view.assignment.updatedAt }
        : null,
    timeline: steps.map((s) => ({ status: s, at: r.history[s] ?? null })),
    alerts: alertsForWardSync(r.wardId),
    rejectionReason: r.rejectionReason ?? null,
    notifications: d.notifications.filter((n) => n.audience === `report:${r.id}`).slice(0, 20),
    storage: storageMode,
  }
}

function getVolunteerTasksSync(volunteerId: string) {
  const d = db()
  const v = d.volunteers.find((x) => x.id === volunteerId)
  if (!v) return null
  const tasks = d.assignments
    .filter((a) => a.volunteerId === volunteerId)
    .reverse()
    .map((a) => {
      const r = getReport(d, a.reportId)
      const view = toView(d, r)
      return {
        assignment: a,
        report: {
          reference: r.reference,
          category: r.category,
          priority: r.priority,
          wardId: r.wardId,
          landmark: r.landmark,
          location: r.location,
          partySize: r.partySize,
          needsMobility: r.needsMobility,
          needsMedical: r.needsMedical,
          hasChildren: r.hasChildren,
          description: r.description,
          requiredSkills: r.requiredSkills,
          shelterName: view.shelterReservation?.shelterName ?? null,
        },
      }
    })
  return { volunteer: { ...v, busy: busyVolunteerIds(d).has(v.id) }, tasks }
}

function setVolunteerAvailabilitySync(volunteerId: string, available: boolean) {
  const d = db()
  const v = d.volunteers.find((x) => x.id === volunteerId)
  if (!v) throw new ActionError('Volunteer not found', 404)
  v.available = available
  v.lastUpdateAt = iso()
  log(d, v.displayName, 'volunteer.availability', `${v.displayName} is now ${available ? 'available' : 'unavailable'}`, v.wardId)
}

function truthCheckSync(text: string) {
  return checkClaim(text, db().advisories, Date.now())
}

function publicSheltersSync() {
  const d = db()
  const reserved = reservedByShelter(d)
  return d.shelters.map((s) => ({ ...s, available: availablePlaces(s, reserved[s.id] ?? 0) }))
}

function suggestSheltersForSync(input: { location: Point; partySize: number; needsMobility: boolean; needsMedical: boolean }) {
  const d = db()
  return matchShelters(input, d.shelters, reservedByShelter(d), Date.now())
}

function publicWardsSync() {
  return db().wards
}

/** Privacy-safe overview for the citizen portal: no reports, contacts or tokens. */
function publicOverviewSync() {
  const d = db()
  const now = Date.now()
  const assessments = d.wards.map((w) => assessWard(w, d.rainfall.find((r) => r.wardId === w.id) ?? null, d.reports, now))
  const openByWard: Record<string, number> = {}
  for (const r of d.reports) {
    if (['completed', 'closed', 'rejected'].includes(r.status) || r.duplicateOf) continue
    openByWard[r.wardId] = (openByWard[r.wardId] ?? 0) + 1
  }
  return {
    generatedAt: iso(now),
    wards: d.wards,
    assessments,
    shelters: publicSheltersSync(),
    alerts: [...d.alerts].reverse().slice(0, 30),
    openByWard,
  }
}

/* ---------- Public async API: every call is a load → sync mutate → versioned save ---------- */

export { storageMode }
export const getCommandState = () => read(getCommandStateSync)
export const createReport = (input: Omit<NewReport, 'createdAt' | 'isSeed'>) => write(() => createReportSync(input))
export const clearReports = (officer: string) => write(() => clearReportsSync(officer))
export const getMatches = (reportId: string) => read(() => getMatchesSync(reportId))
export const reviewReport = (reportId: string, officer: string) => write(() => reviewReportSync(reportId, officer))
export const rejectReport = (reportId: string, reason: string, officer: string) =>
  write(() => rejectReportSync(reportId, reason, officer))
export const setPriority = (reportId: string, priority: Priority, officer: string) =>
  write(() => setPrioritySync(reportId, priority, officer))
export const reserveShelter = (reportId: string, shelterId: string, officer: string) =>
  write(() => reserveShelterSync(reportId, shelterId, officer))
export const assignVolunteer = (reportId: string, volunteerId: string, officer: string) =>
  write(() => assignVolunteerSync(reportId, volunteerId, officer))
export const updateAssignment = (assignmentId: string, action: string, volunteerId: string) =>
  write(() => updateAssignmentSync(assignmentId, action, volunteerId))
export const completeReport = (reportId: string, officer: string) => write(() => completeReportSync(reportId, officer))
export const resolveDuplicate = (reportId: string, candidateId: string, accept: boolean, officer: string) =>
  write(() => resolveDuplicateSync(reportId, candidateId, accept, officer))
export const sendAlert = (wardId: string, message: string, officer: string) => write(() => sendAlertSync(wardId, message, officer))
export const updateShelter = (shelterId: string, patch: { open?: boolean; capacity?: number; occupied?: number }, officer: string) =>
  write(() => updateShelterSync(shelterId, patch, officer))
export const registerVolunteer = (input: { displayName: string; phone: string; wardId: string; skills: Skill[] }) =>
  write(() => registerVolunteerSync(input))
export const verifyVolunteer = (volunteerId: string, officer: string) => write(() => verifyVolunteerSync(volunteerId, officer))
export const markNotificationsRead = (audience: string) => write(() => markReadSync(audience))
export const getTracking = (token: string) => read(() => getTrackingSync(token))
export const getVolunteerTasks = (volunteerId: string) =>
  read(() => {
    const res = getVolunteerTasksSync(volunteerId)
    if (!res) return null
    const { phone: _phone, ...volunteer } = res.volunteer
    const notifications = db().notifications.filter((n) => n.audience === `volunteer:${volunteerId}`).slice(0, 20)
    return { ...res, volunteer, notifications }
  })
export const listVolunteers = () =>
  read(() => db().volunteers.map(({ phone: _p, ...v }) => ({ ...v, busy: busyVolunteerIds(db()).has(v.id) })))
export const setVolunteerAvailability = (volunteerId: string, available: boolean) =>
  write(() => setVolunteerAvailabilitySync(volunteerId, available))
export const truthCheck = (text: string) => read(() => truthCheckSync(text))
export const publicShelters = () => read(publicSheltersSync)
export const suggestSheltersFor = (input: { location: Point; partySize: number; needsMobility: boolean; needsMedical: boolean }) =>
  read(() => suggestSheltersForSync(input))
export const publicWards = () => read(publicWardsSync)
export const publicOverview = () => read(publicOverviewSync)
export const alertsForWard = (wardId: string) => read(() => alertsForWardSync(wardId))
