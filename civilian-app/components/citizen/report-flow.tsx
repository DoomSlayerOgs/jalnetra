'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Accessibility, Baby, CheckCircle2, Copy, Crosshair, Droplets, HeartPulse, Home, Loader2, LocateFixed, Tent, Waves } from 'lucide-react'
import { toast } from 'sonner'
import { useMyRequests } from '@/lib/my-requests'
import { btn, postJson } from '@/lib/client'
import { latLngToSchematic, pointInPolygon } from '@/lib/geo'
import { LocationPicker, type GeoCoordinates } from '@/components/map/location-picker'
import { CATEGORY_LABEL } from '@/lib/labels'
import type { Point, ReportCategory, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'
import { type Lang, useT } from './i18n'

const CATEGORIES: { id: ReportCategory; icon: typeof Waves; label: string }[] = [
  { id: 'trapped', icon: Waves, label: 'I am trapped' },
  { id: 'water_entering', icon: Home, label: 'Water is entering my home' },
  { id: 'medical', icon: HeartPulse, label: 'I need medical help' },
  { id: 'shelter', icon: Tent, label: 'I need shelter' },
  { id: 'mobility', icon: Accessibility, label: 'Someone needs help moving' },
  { id: 'waterlogging', icon: Droplets, label: 'Report waterlogging' },
]

type Form = {
  category: ReportCategory | null
  wardId: string
  location: Point | null
  landmark: string
  partySize: number
  needsMobility: boolean
  needsMedical: boolean
  hasChildren: boolean
  otherNeeds: string
  contactName: string
  contactPhone: string
  description: string
}

type Result = { reference: string; token: string; createdAt: string }

const STEP_TITLES = ['What is happening?', 'Where are you?', 'Who needs assistance?', 'Review and submit']

export function ReportFlow({
  wards,
  lang,
  defaultWardId = '',
  onSubmitted,
}: {
  wards: Ward[]
  lang: Lang
  defaultWardId?: string
  onSubmitted?: (wardId: string) => void
}) {
  const t = useT(lang)
  const { add } = useMyRequests()
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>({
    category: null,
    wardId: defaultWardId,
    location: null,
    landmark: '',
    partySize: 1,
    needsMobility: false,
    needsMedical: false,
    hasChildren: false,
    otherNeeds: '',
    contactName: '',
    contactPhone: '',
    description: '',
  })
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [searchingLocation, setSearchingLocation] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const ward = wards.find((w) => w.id === form.wardId)

  function selectCoordinates(next: GeoCoordinates, source: 'device' | 'map' | 'search', accuracy?: number) {
    const point = latLngToSchematic(next.lat, next.lng)
    const match = point && wards.find((candidate) => pointInPolygon(point, candidate.polygon))
    if (!point || !match) {
      setGeoMsg('This location is outside the Mumbai demo wards. Choose a point inside a mapped ward to submit a request.')
      return false
    }
    setCoordinates(next)
    setForm((current) => ({ ...current, location: point, wardId: match.id }))
    setGeoMsg(source === 'device' && accuracy !== undefined
      ? `GPS pin set in ${match.code} — ${match.name} (±${Math.round(accuracy)} m). Adjust it on the map if needed.`
      : `Pin set in ${match.code} — ${match.name}. Exact coordinates are shown on the map.`)
    return true
  }

  function useDeviceLocation() {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Location is not available on this device. Search for a place or tap the map instead.')
      return
    }
    setLocating(true)
    setGeoMsg(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        selectCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'device', pos.coords.accuracy)
      },
      () => {
        setLocating(false)
        setGeoMsg('Location permission was denied or unavailable. Search for a place or tap the map instead.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  async function searchLocation() {
    const query = locationQuery.trim()
    if (!query) {
      setGeoMsg('Enter an address, landmark, or coordinates to find the location.')
      return
    }
    setSearchingLocation(true)
    setGeoMsg(null)
    try {
      const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/)
      let result: GeoCoordinates | null = null
      if (coordinateMatch) {
        result = { lat: Number(coordinateMatch[1]), lng: Number(coordinateMatch[2]) }
      } else {
        const params = new URLSearchParams({ q: `${query}, Mumbai, India`, format: 'jsonv2', limit: '1', countrycodes: 'in' })
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('Place search is temporarily unavailable. Try coordinates or tap the map.')
        const places = (await response.json()) as { lat: string; lon: string; display_name: string }[]
        if (places.length) {
          result = { lat: Number(places[0].lat), lng: Number(places[0].lon) }
          setLocationQuery(places[0].display_name)
        }
      }
      if (!result) setGeoMsg('No matching place found. Try a more specific address or enter latitude, longitude.')
      else selectCoordinates(result, 'search')
    } catch (searchError) {
      setGeoMsg((searchError as Error).message || 'Place search failed. Try tapping the map.')
    } finally {
      setSearchingLocation(false)
    }
  }

  const canNext = [
    form.category !== null,
    Boolean(form.wardId),
    form.partySize >= 1 && form.partySize <= 30,
    true,
  ][step]

  async function submit() {
    if (!form.category || !ward) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await postJson<Result>('/api/reports', {
        ...form,
        location: form.location ?? ward.center,
        language: lang,
      })
      setResult(r)
      add({ token: r.token, reference: r.reference, createdAt: r.createdAt })
      onSubmitted?.(ward.id)
      toast.success('Request received', { description: `Reference ${r.reference}` })
    } catch (e) {
      setError((e as Error).message)
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const link = `/citizen/requests/${result.token}`
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/10 p-5" role="status">
        <CheckCircle2 className="size-8 text-ok" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold">Your request has been received</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-mono text-base font-semibold">{result.reference}</dd>
          <dt className="text-muted-foreground">Received</dt>
          <dd>{new Date(result.createdAt).toLocaleString('en-IN')}</dd>
        </dl>
        <p className="mt-4 text-sm leading-relaxed">
          <strong>What happens next:</strong> a ward officer will review your request and, where it is safe and possible, match you with a shelter or a trained volunteer. Submitting does not guarantee a rescue. If anyone&apos;s life is in danger, call <strong>112</strong> now.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">This request is saved under My requests on this device. Anyone with the private link can see its status.</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Link href={link} className={cn(btn.base, btn.primary, btn.lg, 'flex-1')}>
            Track my request
          </Link>
          <button
            type="button"
            className={cn(btn.base, btn.outline, btn.lg)}
            onClick={async () => {
              const url = `${window.location.origin}${link}`
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                toast.success('Tracking link copied')
                setTimeout(() => setCopied(false), 2000)
              } catch {
                toast.message('Copy this link', { description: url })
              }
            }}
          >
            {copied ? <CheckCircle2 className="size-4 text-ok" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ol className="mb-5 flex gap-1.5" aria-label="Progress">
        {STEP_TITLES.map((s, i) => (
          <li key={s} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-panel-2')}>
            <span className="sr-only">{`Step ${i + 1}: ${s}${i === step ? ' (current)' : ''}`}</span>
          </li>
        ))}
      </ol>
      <h2 className="mb-4 text-lg font-semibold">
        <span className="text-muted-foreground">Step {step + 1} of 4 · </span>
        {STEP_TITLES[step]}
      </h2>

      {step === 0 && (
        <fieldset className="grid gap-2.5">
          <legend className="sr-only">What is happening?</legend>
          {CATEGORIES.map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-base font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                form.category === c.id ? 'border-primary bg-primary/15' : 'border-border bg-panel hover:bg-panel-2',
              )}
            >
              <input type="radio" name="category" value={c.id} checked={form.category === c.id} onChange={() => set('category', c.id)} className="sr-only" />
              <c.icon className={cn('size-6 shrink-0', form.category === c.id ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
              {c.label}
            </label>
          ))}
        </fieldset>
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <button type="button" onClick={useDeviceLocation} disabled={locating} className={cn(btn.base, btn.outline, btn.lg)}>
            {locating ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="size-5" aria-hidden="true" />}
            Use my device location
          </button>
          {geoMsg && <p className="text-sm text-muted-foreground" role="status">{geoMsg}</p>}
          <div className="grid gap-2">
            <label htmlFor="location-search" className="text-sm font-medium">Search an address, landmark, or GPS coordinates</label>
            <div className="flex gap-2">
              <input
                id="location-search"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                    event.preventDefault()
                    void searchLocation()
                  }
                }}
                placeholder="e.g. Dadar station or 19.0176, 72.8562"
                className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-panel px-3 text-base"
                autoComplete="street-address"
              />
              <button type="button" onClick={() => void searchLocation()} disabled={searchingLocation} className={cn(btn.base, btn.outline, 'shrink-0')}>
                {searchingLocation ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Find'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Place search uses OpenStreetMap. The map pin shows the selected GPS coordinates; only Mumbai demo wards accept SOS requests.</p>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Crosshair className="size-4" aria-hidden="true" /> Or tap the map to set the exact pin
            </p>
            <div className="h-96 overflow-hidden rounded-xl border border-border bg-panel-2">
              <LocationPicker coordinates={coordinates} onPick={(next) => selectCoordinates(next, 'map')} />
            </div>
            {coordinates && <p className="mt-2 font-mono text-xs text-muted-foreground">{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>}
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Ward
            <select
              value={form.wardId}
              onChange={(e) => {
                setCoordinates(null)
                setGeoMsg(null)
                setForm((f) => ({ ...f, wardId: e.target.value, location: null }))
              }}
              className="h-12 rounded-lg border border-border bg-panel px-3 text-base"
            >
              <option value="">Choose your ward…</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Nearby landmark <span className="font-normal text-muted-foreground">(optional)</span>
            <input
              value={form.landmark}
              maxLength={140}
              onChange={(e) => set('landmark', e.target.value)}
              placeholder="e.g. behind the railway station, near the temple"
              className="h-12 rounded-lg border border-border bg-panel px-3 text-base"
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium" id="party-label">How many people need help?</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="party-label">
              <button type="button" aria-label="Fewer people" className={cn(btn.base, btn.outline, 'size-12 text-xl')} onClick={() => set('partySize', Math.max(1, form.partySize - 1))}>−</button>
              <output aria-live="polite" className="w-12 text-center text-2xl font-semibold">{form.partySize}</output>
              <button type="button" aria-label="More people" className={cn(btn.base, btn.outline, 'size-12 text-xl')} onClick={() => set('partySize', Math.min(30, form.partySize + 1))}>+</button>
            </div>
          </div>
          {([
            ['needsMobility', Accessibility, 'Someone needs mobility assistance (wheelchair, elderly, injured)'],
            ['needsMedical', HeartPulse, 'Someone needs medical assistance'],
            ['hasChildren', Baby, 'Children or infants are present'],
          ] as const).map(([k, Icon, label]) => (
            <label key={k} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-panel p-3.5">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="size-5 accent-primary" />
              <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <span>{label}</span>
            </label>
          ))}
          <label className="grid gap-1.5 text-sm font-medium">
            Other needs <span className="font-normal text-muted-foreground">(optional)</span>
            <input value={form.otherNeeds} maxLength={200} onChange={(e) => set('otherNeeds', e.target.value)} placeholder="e.g. pregnant, oxygen supply, pets" className="h-12 rounded-lg border border-border bg-panel px-3 text-base" />
          </label>
          <fieldset className="grid gap-3 rounded-xl border border-border p-3.5">
            <legend className="px-1 text-sm font-medium">Contact <span className="font-normal text-muted-foreground">(optional, kept private)</span></legend>
            <label className="grid gap-1.5 text-sm">
              Name
              <input value={form.contactName} maxLength={60} autoComplete="name" onChange={(e) => set('contactName', e.target.value)} className="h-12 rounded-lg border border-border bg-panel px-3 text-base" />
            </label>
            <label className="grid gap-1.5 text-sm">
              Phone
              <input value={form.contactPhone} maxLength={20} type="tel" inputMode="tel" autoComplete="tel" onChange={(e) => set('contactPhone', e.target.value)} className="h-12 rounded-lg border border-border bg-panel px-3 text-base" />
            </label>
            <p className="text-xs text-muted-foreground">Only the ward officer sees your phone number. Use fictional details in this demo.</p>
          </fieldset>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Short description <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea value={form.description} maxLength={500} rows={3} onChange={(e) => set('description', e.target.value)} placeholder="e.g. water at knee level and rising, we are on the first floor" className="rounded-lg border border-border bg-panel p-3 text-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Photo <span className="font-normal text-muted-foreground">(optional)</span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)} className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-panel-2 file:px-3 file:text-foreground" />
            {photoName && <span className="text-xs text-muted-foreground">Photo uploads are not stored in demo mode ({photoName} stays on your device).</span>}
          </label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-panel p-4 text-sm">
            <dt className="text-muted-foreground">What</dt><dd>{form.category && CATEGORY_LABEL[form.category]}</dd>
            <dt className="text-muted-foreground">Where</dt><dd>{ward ? `${ward.code} ${ward.name}` : '—'}{form.landmark && ` · ${form.landmark}`}{form.location ? ' · map point set' : ' · ward centre'}</dd>
            <dt className="text-muted-foreground">People</dt><dd>{form.partySize}{form.needsMobility && ' · mobility'}{form.needsMedical && ' · medical'}{form.hasChildren && ' · children'}</dd>
            <dt className="text-muted-foreground">Contact</dt><dd>{form.contactPhone ? 'Provided (private)' : 'Not provided'}</dd>
          </dl>
          {error && <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 p-3 text-sm">{error}</p>}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className={cn(btn.base, btn.outline, btn.lg)}>
            {t('back')}
          </button>
        )}
        {step < 3 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className={cn(btn.base, btn.primary, btn.lg, 'flex-1')}>
            {t('next')}
          </button>
        ) : (
          <button type="button" disabled={submitting} onClick={submit} className={cn(btn.base, btn.primary, btn.lg, 'flex-1')}>
            {submitting && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
            {t('submit')}
          </button>
        )}
      </div>
    </div>
  )
}
