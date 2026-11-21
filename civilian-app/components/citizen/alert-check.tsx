'use client'

import useSWR from 'swr'
import { BellRing } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { fetcher } from '@/lib/client'
import { DELIVERY_LABEL, timeAgo } from '@/lib/labels'
import type { Alert, Ward } from '@/lib/types'
import type { Lang } from './i18n'

export function AlertCheck({
  wards,
  wardId,
  setWardId,
}: {
  wards: Ward[]
  lang: Lang
  wardId: string
  setWardId: (id: string) => void
}) {
  const { data, error, isLoading } = useSWR<{ alerts: Alert[] }>(wardId ? `/api/alerts?ward=${wardId}` : null, fetcher, { refreshInterval: 4000 })
  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        Your ward
        <select value={wardId} onChange={(e) => setWardId(e.target.value)} className="h-12 rounded-lg border border-border bg-panel px-3 text-base">
          <option value="">Choose your ward…</option>
          {wards.map((w) => <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>)}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">You only see alerts the command centre sent to the ward you choose. This list refreshes automatically.</p>
      {error && <p role="alert" className="text-sm text-critical">{error.message}</p>}
      {wardId && isLoading && <p className="text-sm text-muted-foreground">Checking alerts…</p>}
      {wardId && data && (
        <section aria-live="polite" className="grid gap-3">
          {data.alerts.length === 0 ? (
            <p className="rounded-xl border border-border bg-panel p-4 text-sm text-muted-foreground">
              No alerts have been sent to this ward yet. No alert does not mean the area is safe — follow official channels and avoid floodwater.
            </p>
          ) : (
            data.alerts.map((a) => (
              <article key={a.id} className="rounded-xl border border-high/40 bg-high/10 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="flex items-center gap-2 text-sm font-semibold text-high">
                  <BellRing className="size-4" aria-hidden="true" /> Ward alert · {timeAgo(a.createdAt)}
                </p>
                <p className="mt-2 leading-relaxed">{a.message}</p>
                <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <Tag>From: {a.sender}</Tag>
                  <Tag>{DELIVERY_LABEL[a.status]}</Tag>
                </p>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  )
}
