'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Accessibility, Baby, HeartPulse, Loader2, MapPin } from 'lucide-react'
import { PriorityBadge, Tag } from '@/components/shared/badges'
import { btn, fetcher, postJson, useCommandState } from '@/lib/client'
import { ASSIGNMENT_LABEL, CATEGORY_LABEL, SKILL_LABEL, timeAgo } from '@/lib/labels'
import type { Assignment, AssignmentStatus, Priority, ReportCategory, Skill, Volunteer } from '@/lib/types'
import { cn } from '@/lib/utils'

type Task = {
  assignment: Assignment
  report: {
    reference: string
    category: ReportCategory
    priority: Priority
    wardId: string
    landmark: string
    partySize: number
    needsMobility: boolean
    needsMedical: boolean
    hasChildren: boolean
    description: string
    requiredSkills: Skill[]
    shelterName: string | null
  }
}
type Data = { volunteer: Volunteer & { busy: boolean }; tasks: Task[] }

const NEXT: Partial<Record<AssignmentStatus, { action: string; label: string; tone: string }[]>> = {
  approved: [
    { action: 'accept', label: 'Accept task', tone: btn.primary },
    { action: 'decline', label: 'Decline', tone: btn.outline },
  ],
  accepted: [{ action: 'en_route', label: 'I am on my way', tone: btn.primary }],
  en_route: [{ action: 'arrived', label: 'I have arrived', tone: btn.primary }],
  arrived: [{ action: 'completed', label: 'Assistance completed', tone: btn.ok }],
}

export function VolunteerApp() {
  const { data: state } = useCommandState()
  const [volId, setVolId] = useState('vol-1')
  const { data, mutate, error } = useSWR<Data>(`/api/volunteers/${volId}`, fetcher, { refreshInterval: 2500 })
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run(key: string, url: string, body: unknown, success: string) {
    setBusy(key)
    setErr(null)
    try {
      await postJson(url, body)
      mutate()
      toast.success(success)
    } catch (e) {
      setErr((e as Error).message)
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const wardName = (id: string) => {
    const w = state?.wards.find((x) => x.id === id)
    return w ? `${w.code} ${w.name}` : id
  }
  const active = data?.tasks.filter((t) => !['completed', 'declined'].includes(t.assignment.status)) ?? []
  const past = data?.tasks.filter((t) => ['completed', 'declined'].includes(t.assignment.status)) ?? []

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Volunteer tasks</h1>
        <label className="mt-3 grid gap-1.5 text-sm">
          <span className="text-muted-foreground">Demo: view as volunteer</span>
          <select value={volId} onChange={(e) => setVolId(e.target.value)} className="h-11 rounded-lg border border-border bg-panel px-3">
            {state?.volunteers.map((v) => <option key={v.id} value={v.id}>{v.displayName} — {wardName(v.wardId)}</option>) ?? <option value="vol-1">Loading…</option>}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="text-critical">{error.message}</p>}
      {data && (
        <section className="rounded-xl border border-border bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{data.volunteer.displayName}</p>
              <p className="text-sm text-muted-foreground">{wardName(data.volunteer.wardId)} · {data.volunteer.verified ? 'Verified' : 'Not verified'}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                role="switch"
                checked={data.volunteer.available}
                disabled={busy === 'avail'}
                onChange={(e) => run('avail', `/api/volunteers/${volId}`, { available: e.target.checked }, e.target.checked ? 'You are now available' : 'You are now unavailable')}
                className="size-5 accent-ok"
              />
              {data.volunteer.available ? 'Available' : 'Unavailable'}
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{data.volunteer.skills.map((s) => <Tag key={s}>{SKILL_LABEL[s]}</Tag>)}</div>
        </section>
      )}

      <section aria-labelledby="active-h" className="grid gap-3">
        <h2 id="active-h" className="font-semibold">Assigned to you</h2>
        {data && active.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No active tasks. The ward officer will approve a task for you when there is a match.
          </p>
        )}
        {active.map(({ assignment: a, report: r }) => (
          <article key={a.id} className="rounded-xl border border-primary/40 bg-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
              <PriorityBadge priority={r.priority} />
            </div>
            <h3 className="mt-1 text-lg font-semibold">{CATEGORY_LABEL[r.category]}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{wardName(r.wardId)}{r.landmark && ` · ${r.landmark}`}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag>{r.partySize} people</Tag>
              {r.needsMobility && <Tag tone="info"><Accessibility className="size-3" aria-hidden="true" />Mobility</Tag>}
              {r.needsMedical && <Tag tone="bad"><HeartPulse className="size-3" aria-hidden="true" />Medical</Tag>}
              {r.hasChildren && <Tag><Baby className="size-3" aria-hidden="true" />Children</Tag>}
              <Tag tone="warn">{ASSIGNMENT_LABEL[a.status]}</Tag>
            </div>
            {r.description && <p className="mt-2 text-sm">“{r.description}”</p>}
            {r.shelterName && <p className="mt-2 text-sm text-sky-300">Take to: {r.shelterName}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Approved by {a.approvedBy} · {timeAgo(a.createdAt)}. Do not enter deep or moving water.</p>
            <div className="mt-3 flex gap-2">
              {(NEXT[a.status] ?? []).map((n) => (
                <button
                  key={n.action}
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(`${a.id}-${n.action}`, `/api/assignments/${a.id}`, { action: n.action, volunteerId: volId }, `${r.reference}: ${n.label}`)}
                  className={cn(btn.base, n.tone, btn.lg, 'flex-1')}
                >
                  {busy === `${a.id}-${n.action}` && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {n.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>
      {err && <p role="alert" className="text-critical">{err}</p>}

      {past.length > 0 && (
        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-2 font-semibold">History</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-panel text-sm">
            {past.map(({ assignment: a, report: r }) => (
              <li key={a.id} className="flex justify-between gap-2 px-4 py-2.5">
                <span>{r.reference} · {CATEGORY_LABEL[r.category]}</span>
                <span className="text-muted-foreground">{ASSIGNMENT_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
