'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { PriorityBadge, Tag } from '@/components/shared/badges'
import { btn, fetcher, postJson } from '@/lib/client'
import { ASSIGNMENT_LABEL, CATEGORY_LABEL, SKILL_LABEL, STATUS_LABEL, timeAgo } from '@/lib/labels'
import type { CommandState, ReportView, ShelterMatch, VolunteerExclusion, VolunteerMatch } from '@/lib/types'
import { cn } from '@/lib/utils'

type Matches = { shelters: ShelterMatch[]; volunteers: { matches: VolunteerMatch[]; excluded: VolunteerExclusion[] } | VolunteerMatch[] }

export function RequestDetail({
  report: r,
  state,
  onChanged,
  onClose,
}: {
  report: ReportView
  state: CommandState
  onChanged: () => void
  onClose: () => void
}) {
  const { data: matches, mutate } = useSWR<Matches>(`/api/reports/${r.id}?v=${r.updatedAt}`, fetcher)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ward = state.wards.find((w) => w.id === r.wardId)
  const dupes = state.duplicateSuggestions.filter((d) => d.reportId === r.id)
  const done = ['completed', 'closed'].includes(r.status)

  const vMatches = matches ? (Array.isArray(matches.volunteers) ? matches.volunteers : matches.volunteers.matches) : []
  const vExcluded = matches && !Array.isArray(matches.volunteers) ? matches.volunteers.excluded : []

  async function act(key: string, body: Record<string, unknown>, success: string) {
    setBusy(key)
    setError(null)
    try {
      await postJson(`/api/reports/${r.id}`, body)
      onChanged()
      mutate()
      toast.success(success, { description: r.reference })
    } catch (e) {
      setError((e as Error).message)
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="detail-h" className="animate-in fade-in slide-in-from-right-2 rounded-xl border border-border bg-panel duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{r.reference}</p>
          <h2 id="detail-h" className="font-semibold">{CATEGORY_LABEL[r.category]}</h2>
          <p className="text-sm text-muted-foreground">{ward?.code} {ward?.name}{r.landmark && ` · ${r.landmark}`}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close request" className={cn(btn.base, btn.ghost, 'size-8')}><X className="size-4" aria-hidden="true" /></button>
      </div>

      <div className="grid gap-4 p-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge priority={r.priority} />
          <Tag>{STATUS_LABEL[r.status]}</Tag>
          <Tag>{r.partySize} people</Tag>
          <Tag>{timeAgo(r.createdAt)}</Tag>
          <Tag>{r.hasContact ? 'Contact on file' : 'No contact'}</Tag>
        </div>
        {r.description && <p className="leading-relaxed">“{r.description}”</p>}
        {r.classificationNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Why this priority</h3>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">{r.classificationNotes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}

        {dupes.map((d) => {
          const other = state.reports.find((x) => x.id === d.candidateId)
          return (
            <div key={d.candidateId} className="rounded-lg border border-high/40 bg-high/10 p-3">
              <p className="font-medium">Possible duplicate of {other?.reference} ({Math.round(d.confidence * 100)}% match)</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.reasons.join(' · ')}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!!busy} onClick={() => act('dup', { action: 'link_duplicate', candidateId: d.candidateId }, 'Linked as the same incident')} className={cn(btn.base, btn.outline, btn.sm)}>Link as same incident</button>
                <button type="button" disabled={!!busy} onClick={() => act('dup', { action: 'dismiss_duplicate', candidateId: d.candidateId }, 'Marked as separate incidents')} className={cn(btn.base, btn.ghost, btn.sm)}>Not a duplicate</button>
              </div>
            </div>
          )
        })}

        {r.status === 'received' && (
          <button type="button" disabled={!!busy} onClick={() => act('review', { action: 'review' }, 'Request marked as reviewed')} className={cn(btn.base, btn.primary, btn.md)}>
            {busy === 'review' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Mark as reviewed
          </button>
        )}

        <div>
          <h3 className="mb-2 font-semibold">Shelter</h3>
          {r.shelterReservation ? (
            <p className="flex items-center gap-2 text-ok"><CheckCircle2 className="size-4" aria-hidden="true" />{r.shelterReservation.places} places reserved at {r.shelterReservation.shelterName}</p>
          ) : !matches ? (
            <p className="text-muted-foreground">Finding shelters…</p>
          ) : matches.shelters.length === 0 ? (
            <p className="text-muted-foreground">No open shelter has enough suitable places.</p>
          ) : (
            <ul className="grid gap-2">
              {matches.shelters.slice(0, 3).map((m) => (
                <li key={m.shelter.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <div>
                    <p className="font-medium">{m.shelter.name}</p>
                    <p className="text-xs text-muted-foreground">{m.available} free · {m.distanceKm.toFixed(1)} km{m.stale && ' · capacity may be stale'}</p>
                  </div>
                  <button type="button" disabled={!!busy || done} onClick={() => act(`sh-${m.shelter.id}`, { action: 'reserve_shelter', shelterId: m.shelter.id }, `${r.partySize} places reserved at ${m.shelter.name}`)} className={cn(btn.base, btn.outline, btn.sm)}>
                    {busy === `sh-${m.shelter.id}` && <Loader2 className="size-3 animate-spin" aria-hidden="true" />} Reserve {r.partySize}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-semibold">Volunteer</h3>
          {r.assignment && r.assignment.status !== 'declined' ? (
            <p className="flex items-center gap-2 text-ok"><CheckCircle2 className="size-4" aria-hidden="true" />{r.assignment.volunteerName} — {ASSIGNMENT_LABEL[r.assignment.status]}</p>
          ) : (
            <>
              {r.assignment?.status === 'declined' && <p className="mb-2 text-high">{r.assignment.volunteerName} declined. Choose another volunteer.</p>}
              {r.requiredSkills.length > 0 && (
                <p className="mb-2 text-xs text-muted-foreground">Needs: {r.requiredSkills.map((s) => SKILL_LABEL[s]).join(', ')}</p>
              )}
              {!matches ? (
                <p className="text-muted-foreground">Finding volunteers…</p>
              ) : vMatches.length === 0 ? (
                <p className="text-muted-foreground">No available volunteer matches right now.</p>
              ) : (
                <ul className="grid gap-2">
                  {vMatches.slice(0, 3).map((m) => (
                    <li key={m.volunteer.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                      <div>
                        <p className="font-medium">{m.volunteer.displayName}</p>
                        <p className="text-xs text-muted-foreground">{m.distanceKm.toFixed(1)} km · {m.reasons.join(' · ')}</p>
                      </div>
                      <button type="button" disabled={!!busy || done} onClick={() => act(`v-${m.volunteer.id}`, { action: 'assign_volunteer', volunteerId: m.volunteer.id }, `${m.volunteer.displayName} assigned`)} className={cn(btn.base, btn.primary, btn.sm)}>
                        {busy === `v-${m.volunteer.id}` && <Loader2 className="size-3 animate-spin" aria-hidden="true" />} Approve
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {vExcluded.length > 0 && (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Why other volunteers are not shown ({vExcluded.length})</summary>
                  <ul className="mt-1 grid gap-0.5">{vExcluded.map((x) => <li key={x.volunteer.id}>{x.volunteer.displayName}: {x.reason}</li>)}</ul>
                </details>
              )}
            </>
          )}
        </div>

        {!done && (r.assignment || r.shelterReservation) && (
          <button type="button" disabled={!!busy} onClick={() => act('complete', { action: 'complete' }, 'Assistance marked completed')} className={cn(btn.base, btn.ok, btn.md)}>
            Mark assistance completed
          </button>
        )}
        {error && <p role="alert" className="text-critical">{error}</p>}
      </div>
    </section>
  )
}
