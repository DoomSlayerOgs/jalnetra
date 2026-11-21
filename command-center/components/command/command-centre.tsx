'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, BellRing, Boxes, ClipboardList, Info, RotateCcw, Tent, Trash2, Users } from 'lucide-react'
import { WardMap, type MapMarker } from '@/components/map/ward-map-3d'
import { RiskBadge } from '@/components/shared/badges'
import { btn, postJson, useCommandState } from '@/lib/client'
import { timeAgo } from '@/lib/labels'
import type { RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { RequestQueue } from './request-queue'
import { RequestDetail } from './request-detail'
import { AlertComposer } from './alert-composer'
import { WardPanel } from './ward-panel'
import { ResourceList, ShelterPanel, VolunteerPanel } from './resource-panels'

type Selection = { type: 'report' | 'shelter' | 'volunteer' | 'ward'; id: string } | null
type Tab = 'queue' | 'detail' | 'resources' | 'alert'

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'queue', label: 'Queue', icon: ClipboardList },
  { id: 'detail', label: 'Details', icon: Info },
  { id: 'resources', label: 'Resources', icon: Boxes },
  { id: 'alert', label: 'Alert', icon: BellRing },
]

export function CommandCentre() {
  const { data, error, mutate } = useCommandState()
  const [selection, setSelection] = useState<Selection>(null)
  const [tab, setTab] = useState<Tab>('queue')
  const [alertWard, setAlertWard] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 4000)
    return () => clearTimeout(t)
  }, [confirmReset])

  useEffect(() => {
    if (!confirmClear) return
    const t = setTimeout(() => setConfirmClear(false), 4000)
    return () => clearTimeout(t)
  }, [confirmClear])

  // Alert officers the moment a new request (e.g. an SOS from the civilian app) arrives.
  const seenIds = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!data) return
    const known = seenIds.current
    seenIds.current = new Set(data.reports.map((r) => r.id))
    if (!known) return // first load / after reset: just set the baseline
    for (const r of data.reports) {
      if (known.has(r.id) || r.duplicateOf) continue
      toast.error(`New SOS ${r.reference} · ${r.category.replace('_', ' ')}`, {
        description: `${r.priority.replace('_', ' ')} · ${r.landmark || r.wardId} · ${r.partySize} people`,
        duration: 20000,
        action: { label: 'Open', onClick: () => { setSelection({ type: 'report', id: r.id }); setTab('detail') } },
      })
    }
  }, [data])

  const levels = useMemo(() => {
    const out: Record<string, RiskLevel> = {}
    data?.assessments.forEach((a) => (out[a.wardId] = a.level))
    return out
  }, [data])

  if (error) return <p role="alert" className="p-6 text-critical">Could not load command state: {error.message}</p>
  if (!data) return <CommandSkeleton />

  function select(next: Selection) {
    setSelection(next)
    if (next) {
      setTab('detail')
      if (window.innerWidth < 1024) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function selectMarker(id: string) {
    if (!data) return
    if (data.reports.some((r) => r.id === id)) select({ type: 'report', id })
    else if (data.shelters.some((s) => s.id === id)) select({ type: 'shelter', id })
    else if (data.volunteers.some((v) => v.id === id)) select({ type: 'volunteer', id })
  }

  async function clearSos() {
    if (!confirmClear) return setConfirmClear(true)
    setConfirmClear(false)
    try {
      await postJson('/api/reports/clear', {})
      setSelection(null)
      setTab('queue')
      seenIds.current = null
      await mutate()
      toast.success('All SOS requests cleared')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function resetDemo() {
    if (!confirmReset) return setConfirmReset(true)
    setConfirmReset(false)
    try {
      await postJson('/api/demo/reset', {})
      setSelection(null)
      setTab('queue')
      seenIds.current = null
      await mutate()
      toast.success('Demo data reset to the starting scenario')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const selectedId = selection?.id ?? null
  const markers: MapMarker[] = [
    ...data.reports
      .filter((r) => !['completed', 'closed'].includes(r.status) && !r.duplicateOf)
      .map((r) => ({
        id: r.id,
        kind: (r.priority === 'life_threatening' ? 'critical' : 'report') as MapMarker['kind'],
        point: r.location,
        label: `${r.reference} · ${r.category.replace('_', ' ')}`,
        selected: r.id === selectedId,
      })),
    ...data.shelters
      .filter((s) => s.open)
      .map((s) => ({ id: s.id, kind: 'shelter' as const, point: s.location, label: `${s.name} · ${s.available} free`, selected: s.id === selectedId })),
    ...data.volunteers
      .filter((v) => v.available && !v.busy)
      .map((v) => ({ id: v.id, kind: 'volunteer' as const, point: v.location, label: `${v.displayName} · available`, selected: v.id === selectedId })),
  ]

  const metrics = [
    { icon: AlertTriangle, label: 'Wards needing attention', value: data.metrics.wardsAttention, tone: 'text-high', ring: 'hover:border-high/50', onClick: () => { const top = ranked[0]; if (top) select({ type: 'ward', id: top.wardId }) } },
    { icon: ClipboardList, label: 'Open help requests', value: data.metrics.openRequests, tone: 'text-primary', ring: 'hover:border-primary/50', onClick: () => setTab('queue') },
    { icon: Tent, label: 'Shelter places available', value: data.metrics.shelterPlaces, tone: 'text-sky-300', ring: 'hover:border-sky-400/50', onClick: () => setTab('resources') },
    { icon: Users, label: 'Volunteers available', value: data.metrics.volunteersAvailable, tone: 'text-ok', ring: 'hover:border-ok/50', onClick: () => setTab('resources') },
  ]

  const report = selection?.type === 'report' ? data.reports.find((r) => r.id === selection.id) ?? null : null
  const shelter = selection?.type === 'shelter' ? data.shelters.find((s) => s.id === selection.id) ?? null : null
  const volunteer = selection?.type === 'volunteer' ? data.volunteers.find((v) => v.id === selection.id) ?? null : null
  const wardSelectedId = selection?.type === 'ward' ? selection.id : report?.wardId ?? shelter?.wardId ?? volunteer?.wardId ?? null
  const ward = selection?.type === 'ward' ? data.wards.find((w) => w.id === selection.id) ?? null : null
  const ranked = [...data.assessments].sort((a, b) => b.score - a.score)
  const wardName = (id: string) => {
    const w = data.wards.find((x) => x.id === id)
    return w ? `${w.code} ${w.name}` : id
  }
  const close = () => setSelection(null)

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Command centre</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            Live · demo officer · refreshed {timeAgo(data.generatedAt)} · sample rainfall data
          </p>
        </div>
        <div className="flex gap-2">
        <button
          type="button"
          className={cn(btn.base, btn.sm, confirmClear ? btn.danger : btn.outline)}
          onClick={clearSos}
          aria-live="polite"
        >
          <Trash2 className="size-3.5" aria-hidden="true" /> {confirmClear ? 'Click again to clear all SOS' : 'Clear all SOS'}
        </button>
        <button
          type="button"
          className={cn(btn.base, btn.sm, confirmReset ? btn.danger : btn.ghost)}
          onClick={resetDemo}
          aria-live="polite"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> {confirmReset ? 'Click again to confirm reset' : 'Reset demo'}
        </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <li key={m.label}>
            <button
              type="button"
              onClick={m.onClick}
              className={cn('group w-full rounded-xl border border-border bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-panel-2', m.ring)}
            >
              <m.icon className={cn('size-5 transition-transform group-hover:scale-110', m.tone)} aria-hidden="true" />
              <p className="mt-2 text-3xl font-semibold tabular-nums">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
            </button>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-labelledby="map-h" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 id="map-h" className="text-sm font-semibold">3D ward map</h2>
            <p className="text-xs text-muted-foreground">Click a ward or marker for details</p>
          </div>
          <div className="h-[560px] lg:h-[640px]">
            <WardMap
              wards={data.wards}
              levels={levels}
              markers={markers}
              selectedWardId={wardSelectedId}
              onSelectWard={(id) => select({ type: 'ward', id })}
              onMarker={selectMarker}
            />
          </div>
        </section>

        <aside ref={panelRef} aria-label="Operations panel" className="flex min-h-0 scroll-mt-4 flex-col rounded-xl border border-border bg-panel lg:max-h-[713px]">
          <div role="tablist" aria-label="Panel" className="grid grid-cols-4 gap-1 border-b border-border p-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  tab === t.id ? 'bg-panel-2 text-foreground' : 'text-muted-foreground hover:bg-panel-2/60 hover:text-foreground',
                )}
              >
                <t.icon className="size-3.5" aria-hidden="true" />
                {t.label}
                {t.id === 'detail' && selection && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === 'queue' && (
              <RequestQueue reports={data.reports} wards={data.wards} selectedId={report?.id ?? null} onSelect={(id) => select({ type: 'report', id })} />
            )}
            {tab === 'detail' &&
              (report ? (
                <RequestDetail key={report.id} report={report} state={data} onChanged={() => mutate()} onClose={close} />
              ) : shelter ? (
                <ShelterPanel shelter={shelter} wardName={wardName(shelter.wardId)} onClose={close} />
              ) : volunteer ? (
                <VolunteerPanel volunteer={volunteer} wardName={wardName(volunteer.wardId)} onClose={close} />
              ) : ward ? (
                <WardPanel
                  ward={ward}
                  assessment={data.assessments.find((a) => a.wardId === ward.id)!}
                  openRequests={data.reports.filter((r) => r.wardId === ward.id && !['completed', 'closed'].includes(r.status)).length}
                  onClose={close}
                  onAlert={() => { setAlertWard(ward.id); setTab('alert') }}
                />
              ) : (
                <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Info className="size-5" aria-hidden="true" />
                  Select a request, shelter, volunteer or ward — on the map or from the queue.
                </div>
              ))}
            {tab === 'resources' && (
              <ResourceList state={data} selectedId={selectedId} onSelect={(type, id) => select({ type, id })} />
            )}
            {tab === 'alert' && (
              <AlertComposer
                wards={data.wards}
                defaultWardId={alertWard || wardSelectedId || ''}
                alerts={data.alerts}
                onSent={() => mutate()}
              />
            )}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-labelledby="audit-h" className="rounded-xl border border-border bg-panel">
          <h2 id="audit-h" className="border-b border-border px-4 py-3 text-sm font-semibold">Audit log</h2>
          <ol className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
            {data.audit.map((e) => (
              <li key={e.id} className="flex gap-3 px-4 py-2 animate-in fade-in duration-300">
                <time className="w-24 shrink-0 text-muted-foreground tabular-nums" dateTime={e.at}>{timeAgo(e.at)}</time>
                <span className="w-28 shrink-0 truncate text-muted-foreground">{e.actor}</span>
                {e.wardId ? (
                  <button type="button" onClick={() => select({ type: 'ward', id: e.wardId! })} className="text-left hover:text-primary">
                    {e.message}
                  </button>
                ) : (
                  <span>{e.message}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="rank-h" className="rounded-xl border border-border bg-panel">
          <h2 id="rank-h" className="border-b border-border px-4 py-3 text-sm font-semibold">Wards by assessed risk</h2>
          <ul className="max-h-72 overflow-y-auto p-2 text-sm">
            {ranked.map((a) => {
              const w = data.wards.find((x) => x.id === a.wardId)!
              return (
                <li key={a.wardId}>
                  <button
                    type="button"
                    onClick={() => select({ type: 'ward', id: a.wardId })}
                    aria-current={wardSelectedId === a.wardId}
                    className={cn('flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-panel-2', wardSelectedId === a.wardId && 'bg-panel-2')}
                  >
                    <span>{w.code} {w.name}</span>
                    <RiskBadge level={a.level} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

function CommandSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 p-4" aria-busy="true" aria-label="Loading command centre">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-panel" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-panel" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="h-[560px] animate-pulse rounded-xl bg-panel" />
        <div className="h-[560px] animate-pulse rounded-xl bg-panel" />
      </div>
    </div>
  )
}
