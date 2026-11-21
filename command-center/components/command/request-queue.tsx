'use client'

import { useState } from 'react'
import { Accessibility, Baby, HeartPulse, Link2, Search } from 'lucide-react'
import { PriorityBadge, Tag } from '@/components/shared/badges'
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, timeAgo } from '@/lib/labels'
import type { Priority, ReportView, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
  { id: 'done', label: 'Completed' },
] as const

const PRIORITIES: Priority[] = ['life_threatening', 'urgent', 'elevated', 'routine']

export function RequestQueue({
  reports,
  wards,
  selectedId,
  onSelect,
}: {
  reports: ReportView[]
  wards: Ward[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('open')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [wardId, setWardId] = useState('')
  const done = (r: ReportView) => ['completed', 'closed'].includes(r.status)
  const q = query.trim().toLowerCase()
  const list = reports.filter((r) => {
    if (filter === 'done' ? !done(r) : filter === 'open' ? done(r) : false) return false
    if (priority && r.priority !== priority) return false
    if (wardId && r.wardId !== wardId) return false
    if (!q) return true
    const w = wards.find((x) => x.id === r.wardId)
    return [r.reference, CATEGORY_LABEL[r.category], r.landmark, r.description, w?.name, w?.code].some((s) => s?.toLowerCase().includes(q))
  })

  return (
    <section aria-labelledby="queue-h" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="queue-h" className="text-sm font-semibold">Help requests <span className="text-muted-foreground">({list.length})</span></h2>
        <div role="tablist" aria-label="Filter requests" className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn('rounded-md px-2.5 py-1 text-xs transition-colors', filter === f.id ? 'bg-panel-2 text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <label className="relative">
          <span className="sr-only">Search requests</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, ward, landmark…"
            className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Ward</span>
            <select value={wardId} onChange={(e) => setWardId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">
              <option value="">All wards</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>)}
            </select>
          </label>
        </div>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No requests match these filters.</li>}
        {list.map((r) => {
          const w = wards.find((x) => x.id === r.wardId)
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-current={r.id === selectedId}
                className={cn('block w-full px-3 py-3 text-left transition-colors hover:bg-panel-2', r.id === selectedId && 'bg-panel-2 shadow-[inset_3px_0_0] shadow-primary')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                  <PriorityBadge priority={r.priority} />
                </div>
                <p className="mt-1 font-medium">{CATEGORY_LABEL[r.category]}</p>
                <p className="text-sm text-muted-foreground">
                  {w?.code} {w?.name} · {r.partySize} {r.partySize === 1 ? 'person' : 'people'} · {timeAgo(r.createdAt)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Tag>{STATUS_LABEL[r.status]}</Tag>
                  {r.needsMobility && <Tag tone="info"><Accessibility className="size-3" aria-hidden="true" />Mobility</Tag>}
                  {r.needsMedical && <Tag tone="bad"><HeartPulse className="size-3" aria-hidden="true" />Medical</Tag>}
                  {r.hasChildren && <Tag><Baby className="size-3" aria-hidden="true" />Children</Tag>}
                  {r.duplicateOf && <Tag tone="warn"><Link2 className="size-3" aria-hidden="true" />Linked</Tag>}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
