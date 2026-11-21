'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { WardMap, type MapMarker } from '@/components/map/ward-map-3d'
import { btn, postJson } from '@/lib/client'
import type { RiskLevel, ShelterMatch, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ShelterCard } from './shelter-card'
import type { Lang } from './i18n'

export function ShelterFinder({
  wards,
  defaultWardId = '',
  onWardChange,
  levels,
}: {
  wards: Ward[]
  lang: Lang
  defaultWardId?: string
  onWardChange: (wardId: string) => void
  levels: Record<string, RiskLevel>
}) {
  const [wardId, setWardId] = useState(defaultWardId)
  const [partySize, setPartySize] = useState(1)
  const [needsMobility, setNeedsMobility] = useState(false)
  const [needsMedical, setNeedsMedical] = useState(false)
  const [results, setResults] = useState<ShelterMatch[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({})

  async function runSearch(id = wardId) {
    const ward = wards.find((w) => w.id === id)
    if (!ward) return
    setLoading(true)
    setError(null)
    setResults(null)
    setSelected(null)
    try {
      const response = await postJson<{ matches?: ShelterMatch[] }>('/api/shelters', {
        location: ward.center,
        partySize,
        needsMobility,
        needsMedical,
      })
      if (!Array.isArray(response.matches)) {
        throw new Error('Shelter results could not be read. Please try again.')
      }
      setResults(response.matches)
      setSelected(response.matches[0]?.shelter.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shelter search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (defaultWardId) runSearch(defaultWardId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(id: string) {
    setSelected(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const ward = wards.find((w) => w.id === wardId)
  const safeResults = Array.isArray(results) ? results : []
  const hasResults = Array.isArray(results)
  const markers: MapMarker[] = [
    ...safeResults.map((m) => ({ id: m.shelter.id, kind: 'shelter' as const, point: m.shelter.location, label: `${m.shelter.name} · ${m.available} free · ${m.distanceKm.toFixed(1)} km`, selected: m.shelter.id === selected })),
    ...(ward ? [{ id: 'you', kind: 'pick' as const, point: ward.center, label: 'Your ward' }] : []),
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="grid content-start gap-4">
        <section aria-labelledby="shelter-guide-title" className="rounded-xl border border-sky-400/25 bg-sky-400/5 p-4">
          <h2 id="shelter-guide-title" className="font-semibold">How to find a shelter</h2>
          <ol className="mt-2 grid gap-1.5 pl-5 text-sm text-muted-foreground [list-style:decimal]">
            <li>Choose the ward closest to where you are now.</li>
            <li>Set your group size and any step-free or medical needs.</li>
            <li>Select <strong className="text-foreground">Find shelters</strong> to see open options with available places, nearest first.</li>
            <li>Open a shelter&apos;s map directions and confirm it is open before travelling.</li>
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This demo uses fictional shelter locations and straight-line distances. Map routes may not reflect flooding; verify with local authorities and never travel through floodwater. Call 112 for immediate danger.
          </p>
        </section>
        <form onSubmit={(e) => { e.preventDefault(); runSearch() }} className="grid gap-3 rounded-xl border border-border bg-panel p-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Your ward
            <select required value={wardId} onChange={(e) => { setWardId(e.target.value); onWardChange(e.target.value) }} className="h-12 rounded-lg border border-border bg-background px-3 text-base">
              <option value="">Choose your ward…</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>)}
            </select>
          </label>
          <div className="grid gap-1.5">
            <span id="ppl-label" className="text-sm font-medium">Number of people</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="ppl-label">
              <button type="button" aria-label="Fewer people" onClick={() => setPartySize((n) => Math.max(1, n - 1))} className={cn(btn.base, btn.outline, 'size-11 text-xl')}>−</button>
              <output aria-live="polite" className="w-10 text-center text-xl font-semibold tabular-nums">{partySize}</output>
              <button type="button" aria-label="More people" onClick={() => setPartySize((n) => Math.min(30, n + 1))} className={cn(btn.base, btn.outline, 'size-11 text-xl')}>+</button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={needsMobility} onChange={(e) => setNeedsMobility(e.target.checked)} /> Needs step-free access</label>
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={needsMedical} onChange={(e) => setNeedsMedical(e.target.checked)} /> Needs medical support</label>
          <button type="submit" disabled={!wardId || loading} className={cn(btn.base, btn.primary, btn.lg)}>
            {loading && <Loader2 className="size-5 animate-spin" aria-hidden="true" />} Find shelters
          </button>
        </form>
        {error && <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 p-3 text-sm">{error}</p>}
        {hasResults && (
          <section aria-live="polite" className="grid gap-3">
            <h2 className="text-sm text-muted-foreground">
              {safeResults.length ? `${safeResults.length} suitable open shelters, nearest first` : 'No open shelter currently has enough suitable places. Request help so an officer can arrange one.'}
            </h2>
            <ul className="grid gap-3">
              {safeResults.map((m) => (
                <li
                  key={m.shelter.id}
                  ref={(el) => { cardRefs.current[m.shelter.id] = el }}
                  onClick={() => setSelected(m.shelter.id)}
                  className={cn('rounded-xl ring-2 transition-shadow', m.shelter.id === selected ? 'ring-sky-400/70' : 'ring-transparent')}
                >
                  <ShelterCard match={m} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <section aria-label="Shelter map" className="h-[420px] overflow-hidden rounded-xl border border-border bg-panel lg:sticky lg:top-16 lg:h-[600px]">
        <WardMap
          wards={wards}
          levels={levels}
          markers={markers}
          selectedWardId={wardId || null}
          onSelectWard={(id) => { setWardId(id); onWardChange(id); runSearch(id) }}
          onMarker={pick}
          showLegend={false}
          label="3D map of shelters. Choose a ward to search from it."
        />
      </section>
    </div>
  )
}
