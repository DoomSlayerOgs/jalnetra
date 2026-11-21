'use client'

import { useMemo, useState } from 'react'
import {
  Accessibility,
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CloudRain,
  Droplet,
  LifeBuoy,
  ListChecks,
  MapPin,
  MessageSquareWarning,
  Phone,
  Stethoscope,
  Tent,
  X,
} from 'lucide-react'
import { WardMap, type MapMarker } from '@/components/map/ward-map-3d'
import { RiskBadge, Tag } from '@/components/shared/badges'
import { btn } from '@/lib/client'
import { distanceKm } from '@/lib/geo'
import { RISK_COLOR, timeAgo } from '@/lib/labels'
import type { RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMyRequests } from '@/lib/my-requests'
import type { CitizenTab, PublicOverview } from './citizen-app'
import { type Lang, useT } from './i18n'

const ADVICE: Record<RiskLevel, string> = {
  critical: 'Severe flooding is likely. Move to a higher floor now, avoid all low-lying roads and subways, and request help if you cannot reach safety.',
  high: 'Flooding is possible in low-lying areas. Keep phones charged, move valuables up, and plan your route to the nearest shelter.',
  watch: 'Heavy rain is being watched. Avoid unnecessary travel and keep an eye on alerts for your ward.',
  lower: 'Lower assessed risk right now. Conditions can change quickly in heavy rain — stay alert.',
  unknown: 'There is not enough data to assess this ward. No data does not mean it is safe — follow official channels.',
}

export function CitizenHome({
  data,
  lang,
  wardId,
  setWardId,
  go,
}: {
  data: PublicOverview
  lang: Lang
  wardId: string
  setWardId: (id: string) => void
  go: (tab: CitizenTab) => void
}) {
  const t = useT(lang)
  const { list: mine } = useMyRequests()
  const [shelterId, setShelterId] = useState<string | null>(null)
  const ward = data.wards.find((w) => w.id === wardId) ?? null
  const assessment = data.assessments.find((a) => a.wardId === wardId) ?? null
  const levels = useMemo(() => Object.fromEntries(data.assessments.map((a) => [a.wardId, a.level])) as Record<string, RiskLevel>, [data.assessments])
  const wardAlerts = data.alerts.filter((a) => a.wardId === wardId)

  const nearest = useMemo(() => {
    const origin = ward?.center
    return data.shelters
      .filter((s) => s.open && s.available > 0)
      .map((s) => ({ s, km: origin ? distanceKm(origin, s.location) : null }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || b.s.available - a.s.available)
      .slice(0, 3)
  }, [data.shelters, ward])

  const markers: MapMarker[] = data.shelters
    .filter((s) => s.open)
    .map((s) => ({ id: s.id, kind: 'shelter', point: s.location, label: `${s.name} · ${s.available} places free`, selected: s.id === shelterId }))

  const shelter = data.shelters.find((s) => s.id === shelterId) ?? null
  const counts = { critical: 0, high: 0, watch: 0, lower: 0, unknown: 0 } as Record<RiskLevel, number>
  data.assessments.forEach((a) => counts[a.level]++)

  return (
    <div className="grid gap-5">
      <section
        aria-label="Get help now"
        className="flex flex-col gap-4 rounded-2xl border border-primary/40 p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'radial-gradient(120% 160% at 0% 0%, rgba(57,255,20,.12), transparent 60%), var(--panel)' }}
      >
        <div>
          <h2 className="text-lg font-semibold">{t('needHelpHint')}</h2>
          <p className="text-sm text-muted-foreground">{t('intro')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => go('help')} className={cn(btn.base, btn.primary, btn.lg, 'rounded-full')}>
            <LifeBuoy className="size-5" aria-hidden="true" /> {t('needHelp')}
          </button>
          <a href="tel:112" className={cn(btn.base, btn.danger, btn.lg, 'rounded-full')}>
            <Phone className="size-5" aria-hidden="true" /> Call 112
          </a>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid content-start gap-5">
          <section aria-labelledby="risk-h" className="rounded-xl border border-border bg-panel p-4">
            <h2 id="risk-h" className="flex items-center gap-2 text-sm font-semibold"><CloudRain className="size-4 text-sky-400" aria-hidden="true" /> {t('floodRisk')}</h2>
            {!ward || !assessment ? (
              <div className="mt-3 grid gap-3">
                <p className="text-sm text-muted-foreground">Choose your ward above, or tap it on the 3D map, to see the local flood risk, alerts and nearest shelters.</p>
                <ul className="grid grid-cols-5 gap-1.5 text-center text-[11px]" aria-label="City-wide summary">
                  {(['critical', 'high', 'watch', 'lower', 'unknown'] as RiskLevel[]).map((l) => (
                    <li key={l} className="rounded-lg border border-border p-2">
                      <span className="block text-lg font-semibold tabular-nums" style={{ color: RISK_COLOR[l] }}>{counts[l]}</span>
                      <span className="text-muted-foreground capitalize">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xl font-semibold"><MapPin className="mr-1 inline size-4 text-primary" aria-hidden="true" />{ward.code} {ward.name}</p>
                  <RiskBadge level={assessment.level} long />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(Math.min(1, assessment.score) * 100)}%`, background: RISK_COLOR[assessment.level] }} />
                </div>
                <p className="text-sm leading-relaxed">{ADVICE[assessment.level]}</p>
                <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-panel-2 p-2">
                    <dt className="text-muted-foreground">Rainfall (3 h)</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums">{assessment.rainfall?.mm == null ? '—' : `${assessment.rainfall.mm} mm`}</dd>
                  </div>
                  <div className="rounded-lg bg-panel-2 p-2">
                    <dt className="text-muted-foreground">Waterlogging</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums">{assessment.waterloggingReports}</dd>
                  </div>
                  <div className="rounded-lg bg-panel-2 p-2">
                    <dt className="text-muted-foreground">Open requests</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums">{data.openByWard[ward.id] ?? 0}</dd>
                  </div>
                </dl>
                <p className="text-[11px] text-muted-foreground">Sample data · assessed {timeAgo(assessment.assessedAt)} · indicative only, not an official forecast.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="alerts-h" className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="alerts-h" className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-high" aria-hidden="true" /> {t('liveAlerts')}</h2>
              <button type="button" onClick={() => go('alert')} className="text-xs text-muted-foreground hover:text-foreground">View all</button>
            </div>
            <div aria-live="polite" className="mt-3 grid gap-2">
              {!ward ? (
                <p className="text-sm text-muted-foreground">Choose your ward to see alerts sent to it.</p>
              ) : wardAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts for {ward.code} yet. No alert does not mean the area is safe.</p>
              ) : (
                wardAlerts.slice(0, 2).map((a) => (
                  <article key={a.id} className="rounded-lg border border-high/40 bg-high/10 p-3 text-sm animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-xs font-semibold text-high">{timeAgo(a.createdAt)} · {a.sender}</p>
                    <p className="mt-1 leading-relaxed">{a.message}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="near-h" className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="near-h" className="flex items-center gap-2 text-sm font-semibold"><Tent className="size-4 text-sky-400" aria-hidden="true" /> {t('nearestShelters')}</h2>
              <button type="button" onClick={() => go('shelter')} className="text-xs text-muted-foreground hover:text-foreground">Search shelters</button>
            </div>
            <ul className="mt-3 grid gap-2">
              {nearest.map(({ s, km }) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setShelterId(s.id)}
                    aria-pressed={s.id === shelterId}
                    className={cn('flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-panel-2', s.id === shelterId ? 'border-sky-400/60 bg-panel-2' : 'border-border')}
                  >
                    <span>
                      <span className="block font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{km != null ? `${km.toFixed(1)} km · ` : ''}{s.accessible ? 'Step-free' : 'Not step-free'}{s.medicalSupport ? ' · Medical' : ''}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-lg font-semibold tabular-nums text-sky-300">{s.available}</span>
                      <span className="text-[10px] text-muted-foreground">places</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid content-start gap-3">
          <section aria-labelledby="cmap-h" className="overflow-hidden rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 id="cmap-h" className="text-sm font-semibold">{t('mapTitle')}</h2>
              <p className="text-xs text-muted-foreground">Tap a ward to set your area</p>
            </div>
            <div className="h-[460px] lg:h-[560px]">
              <WardMap
                wards={data.wards}
                levels={levels}
                markers={markers}
                selectedWardId={wardId || null}
                onSelectWard={setWardId}
                onMarker={setShelterId}
                label="3D flood risk map. Choose a ward to set your area, or a shelter for details."
              />
            </div>
          </section>
          {shelter && (
            <section aria-labelledby="csh-h" className="rounded-xl border border-sky-400/30 bg-panel p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 id="csh-h" className="font-semibold">{shelter.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.wards.find((w) => w.id === shelter.wardId)?.name} · {shelter.available} of {shelter.capacity} places free
                    {ward && ` · ${distanceKm(ward.center, shelter.location).toFixed(1)} km from ${ward.code}`}
                  </p>
                </div>
                <button type="button" onClick={() => setShelterId(null)} aria-label="Close shelter details" className={cn(btn.base, btn.ghost, 'size-8')}><X className="size-4" aria-hidden="true" /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shelter.accessible && <Tag tone="info"><Accessibility className="size-3" aria-hidden="true" />Step-free</Tag>}
                {shelter.drinkingWater && <Tag tone="info"><Droplet className="size-3" aria-hidden="true" />Drinking water</Tag>}
                {shelter.medicalSupport && <Tag tone="info"><Stethoscope className="size-3" aria-hidden="true" />Medical support</Tag>}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => go('help')} className={cn(btn.base, btn.primary, btn.md, 'flex-1')}>Request a place <ArrowRight className="size-4" aria-hidden="true" /></button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shelter.name.replace(' (demo)', '')} Mumbai`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(btn.base, btn.outline, btn.md, 'flex-1')}
                >
                  <MapPin className="size-4" aria-hidden="true" /> Directions
                </a>
              </div>
            </section>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="More tools">
        {([
          { tab: 'shelter', icon: Tent, title: t('findShelter'), hint: t('findShelterHint'), tone: 'text-sky-300' },
          { tab: 'truth', icon: MessageSquareWarning, title: t('checkMessage'), hint: t('checkMessageHint'), tone: 'text-watch' },
          { tab: 'mine', icon: ListChecks, title: t('myRequests'), hint: mine.length ? `${mine.length} saved on this device` : 'Track requests you made', tone: 'text-ok' },
          { tab: 'safety', icon: BookOpenCheck, title: t('safety'), hint: 'Before, during and after a flood', tone: 'text-primary' },
        ] as const).map((a) => (
          <li key={a.tab}>
            <button
              type="button"
              onClick={() => go(a.tab)}
              className="group flex h-full w-full flex-col gap-2 rounded-xl border border-border bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-panel-2"
            >
              <a.icon className={cn('size-6 transition-transform group-hover:scale-110', a.tone)} aria-hidden="true" />
              <span className="font-semibold">{a.title}</span>
              <span className="text-xs text-muted-foreground">{a.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
