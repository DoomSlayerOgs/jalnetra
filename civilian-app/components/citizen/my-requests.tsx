'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, Inbox, Plus, Trash2 } from 'lucide-react'
import { btn, fetcher } from '@/lib/client'
import { CATEGORY_LABEL, STATUS_LABEL, timeAgo } from '@/lib/labels'
import { type SavedRequest, useMyRequests } from '@/lib/my-requests'
import type { TrackingView } from '@/lib/types'
import { cn } from '@/lib/utils'

export function MyRequests({ onNew }: { onNew: () => void }) {
  const { list, remove } = useMyRequests()

  if (list.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">No requests saved on this device yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">When you request help, the private tracking link is kept here so you can follow updates.</p>
        <button type="button" onClick={onNew} className={cn(btn.base, btn.primary, btn.md)}>
          <Plus className="size-4" aria-hidden="true" /> Request help
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Saved only on this device. Status updates every few seconds.</p>
      <ul className="grid gap-3">
        {list.map((r) => <RequestRow key={r.token} saved={r} onRemove={() => remove(r.token)} />)}
      </ul>
    </div>
  )
}

function RequestRow({ saved, onRemove }: { saved: SavedRequest; onRemove: () => void }) {
  const { data, error } = useSWR<TrackingView>(`/api/track/${encodeURIComponent(saved.token)}`, fetcher, { refreshInterval: 4000 })
  const reached = data ? data.timeline.filter((s) => s.at).length : 0
  const total = data?.timeline.length ?? 7
  const pct = Math.round((reached / total) * 100)
  const done = data && ['completed', 'closed'].includes(data.status)

  return (
    <li className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{saved.reference}</p>
          <p className="mt-0.5 font-semibold">{data ? CATEGORY_LABEL[data.category] : error ? 'Request not found' : 'Loading…'}</p>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.wardName} · ${STATUS_LABEL[data.status]}` : error ? 'Demo data may have been reset.' : ''} · {timeAgo(saved.createdAt)}
          </p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Remove ${saved.reference} from this device`} className={cn(btn.base, btn.ghost, 'size-8')}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      {data && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-panel-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
            <div className={cn('h-full rounded-full transition-all duration-700', done ? 'bg-ok' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          {data.volunteer && <p className="mt-2 text-sm text-ok">Volunteer: {data.volunteer.displayName}</p>}
          {data.shelter && <p className="mt-1 text-sm text-sky-300">Shelter: {data.shelter.name} ({data.shelter.places} places)</p>}
        </div>
      )}
      {!error && (
        <Link href={`/citizen/requests/${saved.token}`} className={cn(btn.base, btn.outline, btn.md, 'mt-3 w-full')}>
          Open tracking page <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}
