import { CircleAlert, CircleCheck, CircleHelp, OctagonAlert, TriangleAlert } from 'lucide-react'
import { PRIORITY_LABEL, RISK_LABEL, RISK_SHORT } from '@/lib/labels'
import type { Priority, RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

const RISK_STYLE: Record<RiskLevel, string> = {
  lower: 'border-ok/40 bg-ok/10 text-ok',
  watch: 'border-watch/40 bg-watch/10 text-watch',
  high: 'border-high/40 bg-high/10 text-high',
  critical: 'border-critical/50 bg-critical/15 text-critical',
  unknown: 'border-unknown/50 bg-unknown/15 text-slate-300',
}

const RISK_ICON: Record<RiskLevel, typeof CircleCheck> = {
  lower: CircleCheck,
  watch: CircleAlert,
  high: TriangleAlert,
  critical: OctagonAlert,
  unknown: CircleHelp,
}

export function RiskBadge({ level, long = false, className }: { level: RiskLevel; long?: boolean; className?: string }) {
  const Icon = RISK_ICON[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        RISK_STYLE[level],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {long ? RISK_LABEL[level] : RISK_SHORT[level]}
    </span>
  )
}

const PRIORITY_STYLE: Record<Priority, string> = {
  routine: 'border-border bg-panel-2 text-muted-foreground',
  elevated: 'border-watch/40 bg-watch/10 text-watch',
  urgent: 'border-high/40 bg-high/10 text-high',
  life_threatening: 'border-critical/50 bg-critical/15 text-critical',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', PRIORITY_STYLE[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

export function Tag({ children, tone = 'default', className }: { children: React.ReactNode; tone?: 'default' | 'ok' | 'warn' | 'bad' | 'info'; className?: string }) {
  const tones = {
    default: 'border-border bg-panel-2 text-muted-foreground',
    ok: 'border-ok/40 bg-ok/10 text-ok',
    warn: 'border-high/40 bg-high/10 text-high',
    bad: 'border-critical/40 bg-critical/10 text-critical',
    info: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}
