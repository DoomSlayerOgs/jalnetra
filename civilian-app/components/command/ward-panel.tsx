import { BellRing, X } from 'lucide-react'
import { RiskBadge } from '@/components/shared/badges'
import { btn } from '@/lib/client'
import { timeAgo } from '@/lib/labels'
import type { Ward, WardAssessment } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WardPanel({
  ward,
  assessment: a,
  openRequests,
  onClose,
  onAlert,
}: {
  ward: Ward
  assessment: WardAssessment
  openRequests: number
  onClose: () => void
  onAlert: () => void
}) {
  const scorePct = Math.round(Math.min(1, a.score) * 100)
  return (
    <section aria-labelledby="ward-h" className="animate-in fade-in slide-in-from-right-2 rounded-xl border border-border bg-panel duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Ward {ward.code}</p>
          <h2 id="ward-h" className="font-semibold">{ward.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close ward" className={cn(btn.base, btn.ghost, 'size-8')}><X className="size-4" aria-hidden="true" /></button>
      </div>
      <div className="grid gap-3 p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <RiskBadge level={a.level} long />
          <span className="text-xs text-muted-foreground">{openRequests} open requests</span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Risk score</span><span className="tabular-nums">{a.score.toFixed(2)}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-watch via-high to-critical transition-all duration-700" style={{ width: `${scorePct}%` }} />
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-muted-foreground">Rainfall</dt>
          <dd>{a.rainfall?.mm == null ? 'No observation available' : `${a.rainfall.mm} mm in ${a.rainfall.windowHours} h`}</dd>
          <dt className="text-muted-foreground">Source</dt>
          <dd>{a.rainfall ? `${a.rainfall.source}${a.rainfall.isSample ? ' (sample)' : ''}` : '—'}</dd>
          <dt className="text-muted-foreground">Observed</dt>
          <dd>{a.rainfall ? timeAgo(a.rainfall.observedAt) : '—'}</dd>
          <dt className="text-muted-foreground">Waterlogging reports</dt>
          <dd>{a.waterloggingReports} in last 3 h</dd>
        </dl>
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Why this assessment</h3>
          <ul className="mt-1 list-inside list-disc">{a.factors.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        {a.warnings.length > 0 && (
          <ul className="rounded-lg border border-high/40 bg-high/10 p-3 text-high">{a.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        )}
        <button type="button" onClick={onAlert} className={cn(btn.base, btn.primary, btn.md)}>
          <BellRing className="size-4" aria-hidden="true" /> Send alert to {ward.code}
        </button>
        <p className="text-xs text-muted-foreground">Indicative only — not an official forecast. Ward shapes are schematic.</p>
      </div>
    </section>
  )
}
