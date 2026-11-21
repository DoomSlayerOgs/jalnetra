export type RiskLevel = 'lower' | 'watch' | 'high' | 'critical' | 'unknown'

export type Point = { x: number; y: number }

export type Ward = {
  id: string
  code: string
  name: string
  /** Schematic polygon points in map units — NOT official boundaries. */
  polygon: Point[]
  center: Point
  /** Assumed demo susceptibility 0–1 (not sourced from an official study). */
  susceptibility: number
}

export type RainfallObservation = {
  id: string
  wardId: string
  /** null means no observation available — never treat as zero. */
  mm: number | null
  windowHours: number
  observedAt: string
  source: string
  isSample: boolean
}

export type WardAssessment = {
  wardId: string
  level: RiskLevel
  score: number
  factors: string[]
  warnings: string[]
  rainfall: RainfallObservation | null
  waterloggingReports: number
  assessedAt: string
}

export type ReportCategory =
  | 'trapped'
  | 'water_entering'
  | 'medical'
  | 'shelter'
  | 'mobility'
  | 'waterlogging'

export type Skill = 'water_rescue' | 'first_aid' | 'mobility_assist' | 'transport' | 'general'

export type ReportStatus =
  | 'received'
  | 'reviewed'
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'completed'
  | 'closed'
  | 'rejected'

export type AppNotification = {
  id: string
  at: string
  /** 'volunteer:<id>' | 'officer' | 'report:<id>' */
  audience: string
  title: string
  body: string
  read: boolean
}

export type Priority = 'routine' | 'elevated' | 'urgent' | 'life_threatening'

export type Report = {
  id: string
  reference: string
  /** Unguessable tracking token for the citizen's private link. */
  token: string
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
  /** Stored privately; never returned from public endpoints. */
  contactPhone: string | null
  language: Lang
  priority: Priority
  requiredSkills: Skill[]
  classificationNotes: string[]
  status: ReportStatus
  history: Partial<Record<ReportStatus, string>>
  incidentId: string | null
  duplicateOf: string | null
  createdAt: string
  updatedAt: string
  isSeed: boolean
  rejectionReason?: string | null
  priorityOverride?: { by: string; at: string } | null
}

export type Incident = {
  id: string
  wardId: string
  category: ReportCategory
  reportIds: string[]
  center: Point
  createdAt: string
  status: 'open' | 'resolved'
}

export type DuplicateSuggestion = {
  reportId: string
  candidateId: string
  confidence: number
  reasons: string[]
}

export type Shelter = {
  id: string
  name: string
  wardId: string
  location: Point
  capacity: number
  occupied: number
  accessible: boolean
  drinkingWater: boolean
  medicalSupport: boolean
  open: boolean
  capacityUpdatedAt: string
}

export type ShelterReservation = {
  id: string
  shelterId: string
  reportId: string
  places: number
  status: 'active' | 'released' | 'checked_in'
  createdAt: string
}

export type Volunteer = {
  id: string
  displayName: string
  skills: Skill[]
  wardId: string
  location: Point
  available: boolean
  verified: boolean
  lastUpdateAt: string
  /** Private; never sent to citizens. */
  phone?: string | null
  selfRegistered?: boolean
}

export type AssignmentStatus =
  | 'approved'
  | 'accepted'
  | 'declined'
  | 'en_route'
  | 'arrived'
  | 'completed'

export type Assignment = {
  id: string
  reportId: string
  volunteerId: string
  approvedBy: string
  status: AssignmentStatus
  createdAt: string
  updatedAt: string
}

export type AlertChannel = 'in_app' | 'sms_simulated'
export type DeliveryStatus = 'draft' | 'queued' | 'provider_accepted' | 'delivered' | 'simulated'

export type Alert = {
  id: string
  wardId: string
  message: string
  channels: AlertChannel[]
  sender: string
  createdAt: string
  status: DeliveryStatus
  recipientCount: number
}

export type AlertDelivery = {
  id: string
  alertId: string
  contactId: string
  channel: AlertChannel
  status: DeliveryStatus
}

export type Contact = {
  id: string
  wardId: string
  label: string
  /** Masked — full numbers are never stored in demo data. */
  maskedPhone: string
}

export type Advisory = {
  id: string
  publisher: string
  title: string
  excerpt: string
  publishedAt: string
  location: string
  sourceUrl: string | null
  isDemo: boolean
  keywords: string[]
  /** Claim patterns this advisory supports or contradicts. */
  supports: string[][]
  contradicts: string[][]
}

export type Verdict = 'supported' | 'contradicted' | 'unverified'

export type TruthCheckResult = {
  verdict: Verdict
  explanation: string
  advisory: Advisory | null
  checkedAt: string
}

export type AuditEvent = {
  id: string
  at: string
  actor: string
  type: string
  message: string
  wardId?: string
}

export type Lang = 'en' | 'hi' | 'mr'

export type ShelterMatch = {
  shelter: Shelter
  available: number
  distanceKm: number
  reasons: string[]
  stale: boolean
}

export type VolunteerMatch = {
  volunteer: Volunteer
  distanceKm: number
  matchedSkills: Skill[]
  reasons: string[]
}

export type VolunteerExclusion = {
  volunteer: Volunteer
  reason: string
}

/** Public, privacy-safe shape of a report for the officer/volunteer views. */
export type ReportView = Omit<Report, 'token' | 'contactPhone'> & {
  hasContact: boolean
  shelterReservation: (ShelterReservation & { shelterName: string }) | null
  assignment: (Assignment & { volunteerName: string }) | null
}

export type CommandState = {
  mode: 'demo'
  storage: 'neon' | 'memory'
  generatedAt: string
  notifications: AppNotification[]
  wards: Ward[]
  assessments: WardAssessment[]
  reports: ReportView[]
  incidents: Incident[]
  duplicateSuggestions: DuplicateSuggestion[]
  shelters: (Shelter & { available: number; reserved: number })[]
  volunteers: (Volunteer & { busy: boolean })[]
  assignments: Assignment[]
  alerts: Alert[]
  audit: AuditEvent[]
  metrics: {
    wardsAttention: number
    openRequests: number
    shelterPlaces: number
    volunteersAvailable: number
    totalRequests: number
    pendingVerification: number
    verified: number
    critical: number
    volunteersDeployed: number
    sheltersOpen: number
    shelterOccupied: number
    shelterCapacity: number
    activeOperations: number
  }
}

export type TrackingView = {
  reference: string
  category: ReportCategory
  wardId: string
  wardName: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  partySize: number
  shelter: {
    name: string
    places: number
    accessible: boolean
    medicalSupport: boolean
    drinkingWater: boolean
    capacityUpdatedAt: string
  } | null
  volunteer: {
    displayName: string
    skills: Skill[]
    status: AssignmentStatus
    lastUpdateAt: string
  } | null
  timeline: { status: ReportStatus; at: string | null }[]
  alerts: Alert[]
  rejectionReason: string | null
  notifications: AppNotification[]
  storage: 'neon' | 'memory'
}
