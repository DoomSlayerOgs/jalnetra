'use client'

import useSWR from 'swr'
import { Accessibility, BellRing, Check, Droplet, Stethoscope, Truck, UserRound } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { fetcher } from '@/lib/client'
import { ASSIGNMENT_LABEL, CATEGORY_LABEL, SKILL_LABEL, STATUS_LABEL, clockTime, timeAgo } from '@/lib/labels'
import type { TrackingView as TV } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TrackingView({ token }: { token: string }) {
  const { data, error } = useSWR<TV>(`/api/track/${encodeURIComponent(token)}`, fetcher, { refreshInterval: 3000 })

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-critical/40 bg-critical/10 p-4">
        We could not find this request. Check that the link is complete. Demo data resets when the server restarts.
      </p>
    )
  }
  if (!data) return <p className="text-muted-foreground">Loading your request…</p>

  const onTheWay = data.volunteer && ['en_route', 'arrived'].includes(data.volunteer.status)
  const done = data.status === 'completed' || data.status === 'closed'
  const currentIdx = data.timeline.reduce((acc, s, i) => (s.at ? i : acc), 0)

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm text-muted-foreground">Request {data.reference}</p>
        <h1 className="mt-1 text-2xl font-semibold">{CATEGORY_LABEL[data.category]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.wardName} · {data.partySize} {data.partySize === 1 ? 'person' : 'people'} · updated {timeAgo(data.updatedAt)}
        </p>
      </header>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'rounded-xl border p-4',
          done ? 'border-ok/40 bg-ok/10' : onTheWay ? 'border-ok/40 bg-ok/10' : 'border-border bg-panel',
        )}
      >
        <p className="text-lg font-semibold">
          {done ? 'Assistance completed' : onTheWay ? 'Help is on the way' : STATUS_LABEL[data.status]}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {done
            ? 'Thank you. If you still need help, submit a new request or call 112.'
            : onTheWay
              ? 'A volunteer has accepted and is travelling to you. Stay somewhere safe and visible. No arrival time is estimated.'
              : 'Your request is in the queue. A ward officer decides what can safely be done. If life is in danger, call 112.'}
        </p>
      </div>

      <section aria-labelledby="tl-h" className="rounded-xl border border-border bg-panel p-4">
        <h2 id="tl-h" className="mb-3 font-semibold">Progress</h2>
        <ol className="grid gap-0">
          {data.timeline.map((s, i) => {
            const reached = Boolean(s.at)
            return (
              <li key={s.status} className="relative flex gap-3 pb-4 last:pb-0">
                {i < data.timeline.length - 1 && (
                  <span className={cn('absolute top-6 left-[11px] h-[calc(100%-1rem)] w-0.5', reached && data.timeline[i + 1].at ? 'bg-ok' : 'bg-panel-2')} aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'relative grid size-6 shrink-0 place-items-center rounded-full border-2',
                    reached ? 'border-ok bg-ok text-[#04210f]' : 'border-panel-2 bg-background',
                    i === currentIdx && !done && 'ring-4 ring-ok/25',
                  )}
                >
                  {reached && <Check className="size-3.5" aria-hidden="true" />}
                </span>
                <div className={cn(!reached && 'text-muted-foreground')}>
                  <p className="text-sm font-medium">{STATUS_LABEL[s.status]}</p>
                  <p className="text-xs text-muted-foreground">{s.at ? clockTime(s.at) : 'Not yet'}</p>
                </div>
                <span className="sr-only">{reached ? 'done' : 'pending'}</span>
              </li>
            )
          })}
        </ol>
      </section>

      {data.shelter && (
        <section aria-labelledby="sh-h" className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-4">
          <h2 id="sh-h" className="font-semibold">Shelter places reserved</h2>
          <p className="mt-1 text-lg">{data.shelter.name}</p>
          <p className="text-sm text-muted-foreground">{data.shelter.places} places held for you · capacity updated {timeAgo(data.shelter.capacityUpdatedAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.shelter.accessible && <Tag tone="info"><Accessibility className="size-3" aria-hidden="true" />Step-free</Tag>}
            {data.shelter.drinkingWater && <Tag tone="info"><Droplet className="size-3" aria-hidden="true" />Drinking water</Tag>}
            {data.shelter.medicalSupport && <Tag tone="info"><Stethoscope className="size-3" aria-hidden="true" />Medical support</Tag>}
          </div>
        </section>
      )}

      {data.volunteer && (
        <section aria-labelledby="vo-h" className="rounded-xl border border-border bg-panel p-4">
          <h2 id="vo-h" className="font-semibold">Your volunteer</h2>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-panel-2"><UserRound className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="font-medium">{data.volunteer.displayName}</p>
              <p className="text-sm text-muted-foreground">
                <Truck className="mr-1 inline size-3.5" aria-hidden="true" />
                {ASSIGNMENT_LABEL[data.volunteer.status]} · last update {timeAgo(data.volunteer.lastUpdateAt)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.volunteer.skills.map((s) => <Tag key={s}>{SKILL_LABEL[s]}</Tag>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Contact is relayed through the ward officer — volunteer numbers are not shared in demo mode.</p>
        </section>
      )}

      {data.alerts.length > 0 && (
        <section aria-labelledby="al-h" className="rounded-xl border border-high/40 bg-high/10 p-4">
          <h2 id="al-h" className="flex items-center gap-2 font-semibold text-high"><BellRing className="size-4" aria-hidden="true" /> Alerts for your ward</h2>
          <ul className="mt-2 grid gap-2">
            {data.alerts.slice(0, 3).map((a) => (
              <li key={a.id} className="text-sm"><span className="text-muted-foreground">{clockTime(a.createdAt)} · </span>{a.message}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
