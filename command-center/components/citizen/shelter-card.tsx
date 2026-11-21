import { Accessibility, Clock, Droplet, Navigation, Stethoscope } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { timeAgo } from '@/lib/labels'
import type { ShelterMatch } from '@/lib/types'

export function ShelterCard({ match }: { match: ShelterMatch }) {
  const { shelter: s, available, distanceKm, stale, reasons } = match
  return (
    <article className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{s.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{distanceKm.toFixed(1)} km straight-line distance</p>
        </div>
        {s.open ? <Tag tone="ok">Open</Tag> : <Tag tone="bad">Closed</Tag>}
      </div>
      <p className="mt-3 text-2xl font-semibold">
        {available} <span className="text-sm font-normal text-muted-foreground">places available of {s.capacity}</span>
      </p>
      <p className={`mt-1 flex items-center gap-1.5 text-xs ${stale ? 'text-high' : 'text-muted-foreground'}`}>
        <Clock className="size-3.5" aria-hidden="true" />
        Capacity updated {timeAgo(s.capacityUpdatedAt)}
        {stale && ' — may be out of date'}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Facilities">
        <li><Tag tone={s.accessible ? 'info' : 'default'}><Accessibility className="size-3" aria-hidden="true" />{s.accessible ? 'Step-free access' : 'Not step-free'}</Tag></li>
        <li><Tag tone={s.drinkingWater ? 'info' : 'default'}><Droplet className="size-3" aria-hidden="true" />{s.drinkingWater ? 'Drinking water' : 'No drinking water'}</Tag></li>
        <li><Tag tone={s.medicalSupport ? 'info' : 'default'}><Stethoscope className="size-3" aria-hidden="true" />{s.medicalSupport ? 'Medical support' : 'No medical support'}</Tag></li>
      </ul>
      {reasons.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{reasons.join(' · ')}</p>}
      <div className="mt-3 flex flex-col gap-1.5">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} Mumbai`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-panel-2 text-sm font-medium hover:bg-panel-2/70"
        >
          <Navigation className="size-4" aria-hidden="true" />
          Directions
        </a>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Routes are not checked for flooding. Never walk or drive through moving or deep water.
        </p>
      </div>
    </article>
  )
}
