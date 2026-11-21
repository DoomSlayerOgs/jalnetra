import type {
  AssignmentStatus,
  DeliveryStatus,
  Priority,
  ReportCategory,
  ReportStatus,
  RiskLevel,
  Skill,
} from './types'

export const RISK_LABEL: Record<RiskLevel, string> = {
  lower: 'Lower assessed risk',
  watch: 'Watch',
  high: 'High',
  critical: 'Critical',
  unknown: 'Unknown / insufficient data',
}

export const RISK_SHORT: Record<RiskLevel, string> = {
  lower: 'Lower',
  watch: 'Watch',
  high: 'High',
  critical: 'Critical',
  unknown: 'Unknown',
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  lower: '#22c55e',
  watch: '#eab308',
  high: '#f59e0b',
  critical: '#ef4444',
  unknown: '#64748b',
}

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  trapped: 'Trapped',
  water_entering: 'Water entering home',
  medical: 'Medical help',
  shelter: 'Needs shelter',
  mobility: 'Help moving someone',
  waterlogging: 'Waterlogging report',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  routine: 'Routine',
  elevated: 'Elevated',
  urgent: 'Urgent',
  life_threatening: 'Life-threatening',
}

export const SKILL_LABEL: Record<Skill, string> = {
  water_rescue: 'Trained water rescue',
  first_aid: 'First aid',
  mobility_assist: 'Mobility assistance',
  transport: 'Transport',
  general: 'General support',
}

export const STATUS_LABEL: Record<ReportStatus, string> = {
  received: 'Request received',
  reviewed: 'Officer reviewed',
  assigned: 'Volunteer assigned',
  accepted: 'Volunteer accepted',
  en_route: 'Volunteer en route',
  arrived: 'Volunteer arrived',
  completed: 'Assistance completed',
  closed: 'Closed',
  rejected: 'Not actioned',
}

export const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  approved: 'Awaiting volunteer',
  accepted: 'Accepted',
  declined: 'Declined',
  en_route: 'En route',
  arrived: 'Arrived',
  completed: 'Completed',
}

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  provider_accepted: 'Provider accepted',
  delivered: 'Delivered',
  simulated: 'Simulated delivery',
}

export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ${m % 60} min ago`
  return `${Math.floor(h / 24)} d ago`
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
