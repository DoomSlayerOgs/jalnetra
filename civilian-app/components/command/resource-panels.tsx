'use client'

import { Accessibility, Droplet, Stethoscope, Tent, UserRound, X } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { btn } from '@/lib/client'
import { SKILL_LABEL, timeAgo } from '@/lib/labels'
import type { CommandState } from '@/lib/types'
import { cn } from '@/lib/utils'

type ShelterRow = CommandState['shelters'][number]
type VolunteerRow = CommandState['volunteers'][number]

function Occupancy({ s }: { s: ShelterRow }) {
  const used = s.occupied + s.reserved
  const pct = Math.min(100, Math.round((used / Math.max(1, s.capacity)) * 100))
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-all duration-500', pct > 90 ? 'bg-critical' : pct > 70 ? 'bg-high' : 'bg-sky-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {s.available} free of {s.capacity} · {s.occupied} checked in · {s.reserved} reserved
      </p>
    </div>
  )
}

export function ShelterPanel({ shelter: s, wardName, onClose }: { shelter: ShelterRow; wardName: string; onClose: () => void }) {
  return (
    <section aria-labelledby="sh-detail-h" className="animate-in fade-in slide-in-from-right-2 rounded-xl border border-sky-400/30 bg-panel duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-sky-300"><Tent className="size-3.5" aria-hidden="true" /> Shelter</p>
          <h2 id="sh-detail-h" className="font-semibold">{s.name}</h2>
          <p className="text-sm text-muted-foreground">{wardName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close shelter" className={cn(btn.base, btn.ghost, 'size-8')}><X className="size-4" aria-hidden="true" /></button>
      </div>
      <div className="grid gap-3 p-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={s.open ? 'info' : 'bad'}>{s.open ? 'Open' : 'Closed'}</Tag>
          {s.accessible && <Tag tone="info"><Accessibility className="size-3" aria-hidden="true" />Step-free</Tag>}
          {s.drinkingWater && <Tag tone="info"><Droplet className="size-3" aria-hidden="true" />Drinking water</Tag>}
          {s.medicalSupport && <Tag tone="info"><Stethoscope className="size-3" aria-hidden="true" />Medical</Tag>}
        </div>
        <Occupancy s={s} />
        <p className="text-xs text-muted-foreground">Capacity updated {timeAgo(s.capacityUpdatedAt)}. Reserve places from a help request to avoid overbooking.</p>
      </div>
    </section>
  )
}

export function VolunteerPanel({ volunteer: v, wardName, onClose }: { volunteer: VolunteerRow; wardName: string; onClose: () => void }) {
  return (
    <section aria-labelledby="vo-detail-h" className="animate-in fade-in slide-in-from-right-2 rounded-xl border border-ok/30 bg-panel duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-ok"><UserRound className="size-3.5" aria-hidden="true" /> Volunteer</p>
          <h2 id="vo-detail-h" className="font-semibold">{v.displayName}</h2>
          <p className="text-sm text-muted-foreground">{wardName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close volunteer" className={cn(btn.base, btn.ghost, 'size-8')}><X className="size-4" aria-hidden="true" /></button>
      </div>
      <div className="grid gap-3 p-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={v.busy ? 'warn' : v.available ? 'info' : 'bad'}>{v.busy ? 'On a task' : v.available ? 'Available' : 'Unavailable'}</Tag>
          <Tag>{v.verified ? 'Verified' : 'Not verified'}</Tag>
        </div>
        <div className="flex flex-wrap gap-1.5">{v.skills.map((s) => <Tag key={s}>{SKILL_LABEL[s]}</Tag>)}</div>
        <p className="text-xs text-muted-foreground">Last update {timeAgo(v.lastUpdateAt)}. Assign volunteers from a help request so skills and distance are checked.</p>
      </div>
    </section>
  )
}

export function ResourceList({
  state,
  selectedId,
  onSelect,
}: {
  state: CommandState
  selectedId: string | null
  onSelect: (kind: 'shelter' | 'volunteer', id: string) => void
}) {
  const wardCode = (id: string) => state.wards.find((w) => w.id === id)?.code ?? id
  const shelters = [...state.shelters].sort((a, b) => b.available - a.available)
  const volunteers = [...state.volunteers].sort((a, b) => Number(b.available && !b.busy) - Number(a.available && !a.busy))
  return (
    <div className="grid gap-4">
      <section aria-labelledby="res-sh-h">
        <h3 id="res-sh-h" className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Shelters ({shelters.length})</h3>
        <ul className="grid gap-1.5">
          {shelters.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect('shelter', s.id)}
                aria-current={s.id === selectedId}
                className={cn('w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-panel-2', s.id === selectedId ? 'border-sky-400/60 bg-panel-2' : 'border-border')}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{wardCode(s.wardId)}</span>
                </span>
                <span className="mt-1.5 block"><Occupancy s={s} /></span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="res-vo-h">
        <h3 id="res-vo-h" className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Volunteers ({volunteers.length})</h3>
        <ul className="grid gap-1.5">
          {volunteers.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelect('volunteer', v.id)}
                aria-current={v.id === selectedId}
                className={cn('flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-panel-2', v.id === selectedId ? 'border-ok/60 bg-panel-2' : 'border-border')}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', v.busy ? 'bg-high' : v.available ? 'bg-ok' : 'bg-unknown')} aria-hidden="true" />
                  {v.displayName}
                </span>
                <span className="text-xs text-muted-foreground">{wardCode(v.wardId)} · {v.busy ? 'On task' : v.available ? 'Free' : 'Off'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
