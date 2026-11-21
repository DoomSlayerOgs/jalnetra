'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Eye, EyeOff, Layers, Map as MapIcon, Minus, Plus, RotateCcw, Rotate3d, Waves } from 'lucide-react'
import { RISK_LABEL } from '@/lib/labels'
import type { Point, RiskLevel, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MapLegend, WardMap2D, type MapMarker } from './ward-map'
import type { HoverInfo, MapScene } from './map-scene'

export type { MapMarker }

type LayerKey = 'reports' | 'shelters' | 'volunteers' | 'labels'

const LAYER_OF: Record<MapMarker['kind'], LayerKey | null> = {
  report: 'reports',
  critical: 'reports',
  shelter: 'shelters',
  volunteer: 'volunteers',
  pick: null,
}

const LAYER_META: { key: LayerKey; label: string; dot: string }[] = [
  { key: 'reports', label: 'Requests', dot: 'bg-high' },
  { key: 'shelters', label: 'Shelters', dot: 'bg-sky-400' },
  { key: 'volunteers', label: 'Volunteers', dot: 'bg-ok' },
  { key: 'labels', label: 'Labels', dot: 'bg-foreground' },
]

export function WardMap({
  wards,
  levels,
  markers = [],
  selectedWardId,
  onSelectWard,
  onPick,
  onMarker,
  showLegend = true,
  controls = true,
  autoFocus = true,
  className,
  label = '3D ward map of Mumbai',
}: {
  wards: Ward[]
  levels: Record<string, RiskLevel>
  markers?: MapMarker[]
  selectedWardId?: string | null
  onSelectWard?: (wardId: string) => void
  onPick?: (point: Point, wardId: string) => void
  onMarker?: (id: string) => void
  showLegend?: boolean
  controls?: boolean
  autoFocus?: boolean
  className?: string
  label?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MapScene | null>(null)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [hover, setHover] = useState<HoverInfo>(null)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ reports: true, shelters: true, volunteers: true, labels: true })
  const [water, setWater] = useState(0.25)
  const [autoRotate, setAutoRotate] = useState(false)
  const [view, setView] = useState<'3d' | 'top'>('3d')

  const handlers = useRef({ onSelectWard, onPick, onMarker, levels })
  handlers.current = { onSelectWard, onPick, onMarker, levels }

  const levelsKey = JSON.stringify(levels)
  const visibleMarkers = useMemo(
    () => markers.filter((m) => {
      const layer = LAYER_OF[m.kind]
      return layer === null || layers[layer]
    }),
    [markers, layers],
  )
  const markersKey = JSON.stringify(visibleMarkers)
  const presentLayers = useMemo(() => new Set(markers.map((m) => LAYER_OF[m.kind]).filter(Boolean)), [markers])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let instance: MapScene | null = null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    import('./map-scene')
      .then(({ MapScene }) => {
        if (cancelled) return
        try {
          instance = new MapScene(
            host,
            {
              onHover: setHover,
              onWard: (wardId, point) => {
                const h = handlers.current
                if (h.onPick) h.onPick(point, wardId)
                else h.onSelectWard?.(wardId)
              },
              onMarker: (id) => handlers.current.onMarker?.(id),
              wardSubtitle: (wardId) => RISK_LABEL[handlers.current.levels[wardId] ?? 'unknown'],
            },
            { reducedMotion, pickMode: Boolean(handlers.current.onPick) },
          )
          sceneRef.current = instance
          setReady(true)
        } catch (err) {
          console.log('[v0] 3D map unavailable, using 2D fallback:', (err as Error).message)
          setFallback(true)
        }
      })
      .catch(() => setFallback(true))
    return () => {
      cancelled = true
      instance?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    sceneRef.current?.setWards(wards, JSON.parse(levelsKey), selectedWardId ?? null)
    sceneRef.current?.setMarkers(JSON.parse(markersKey))
  }, [ready, wards, levelsKey, selectedWardId, markersKey])

  useEffect(() => {
    if (!ready || !autoFocus || onPick || !selectedWardId) return
    const w = wards.find((x) => x.id === selectedWardId)
    if (w) sceneRef.current?.focus(w.center)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedWardId])

  const selectedMarker = markers.find((m) => m.selected && m.kind !== 'pick')
  useEffect(() => {
    if (!ready || !autoFocus || !selectedMarker) return
    sceneRef.current?.focus(selectedMarker.point)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedMarker?.id])

  useEffect(() => sceneRef.current?.setWaterLevel(water), [ready, water])
  useEffect(() => sceneRef.current?.setLabels(layers.labels), [ready, layers.labels])
  useEffect(() => sceneRef.current?.setAutoRotate(autoRotate), [ready, autoRotate])

  if (fallback) {
    return (
      <WardMap2D
        wards={wards}
        levels={levels}
        markers={markers}
        selectedWardId={selectedWardId}
        onSelectWard={onSelectWard}
        onPick={onPick}
        onMarker={onMarker}
        showLegend={showLegend}
        className={className}
        label={label}
      />
    )
  }

  const iconBtn =
    'grid size-8 place-items-center rounded-md border border-white/10 bg-[#0b1220]/80 text-slate-200 backdrop-blur transition-colors hover:bg-white/10 hover:text-white aria-pressed:border-primary/60 aria-pressed:text-primary'

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden" role="application" aria-label={label} aria-roledescription="interactive 3D map">
        <div ref={hostRef} className="absolute inset-0" />

        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-[#060b16] text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Box className="size-4 animate-pulse text-primary" aria-hidden="true" /> Building 3D map…
            </span>
          </div>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-20 max-w-56 rounded-lg border border-white/10 bg-[#0b1220]/95 px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: hover.x + 14, top: hover.y + 14 }}
          >
            <p className="font-semibold text-foreground">{hover.title}</p>
            {hover.subtitle && <p className="text-muted-foreground">{hover.subtitle}</p>}
          </div>
        )}

        {controls && ready && (
          <>
            <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1.5">
              <span className="sr-only">Map layers</span>
              <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
              {LAYER_META.filter((l) => l.key === 'labels' || presentLayers.has(l.key)).map((l) => (
                <button
                  key={l.key}
                  type="button"
                  aria-pressed={layers[l.key]}
                  onClick={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium backdrop-blur transition-colors',
                    layers[l.key]
                      ? 'border-white/20 bg-white/10 text-foreground'
                      : 'border-white/10 bg-[#0b1220]/70 text-muted-foreground line-through',
                  )}
                >
                  <span className={cn('size-2 rounded-full', l.dot, !layers[l.key] && 'opacity-40')} aria-hidden="true" />
                  {l.label}
                  {layers[l.key] ? <Eye className="size-3" aria-hidden="true" /> : <EyeOff className="size-3" aria-hidden="true" />}
                </button>
              ))}
            </div>

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
              <button type="button" aria-label="Tilted 3D view" aria-pressed={view === '3d'} title="3D view" className={iconBtn} onClick={() => { setView('3d'); sceneRef.current?.resetView() }}>
                <Rotate3d className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Top-down view" aria-pressed={view === 'top'} title="Top view" className={iconBtn} onClick={() => { setView('top'); sceneRef.current?.topView() }}>
                <MapIcon className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Zoom in" title="Zoom in" className={iconBtn} onClick={() => sceneRef.current?.zoom(0.75)}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Zoom out" title="Zoom out" className={iconBtn} onClick={() => sceneRef.current?.zoom(1.33)}>
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Auto-rotate" aria-pressed={autoRotate} title="Auto-rotate" className={iconBtn} onClick={() => setAutoRotate((v) => !v)}>
                <RotateCcw className={cn('size-4', autoRotate && 'animate-spin [animation-duration:3s]')} aria-hidden="true" />
              </button>
            </div>

            <label className="absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1220]/80 px-2.5 py-1.5 text-[11px] text-slate-200 backdrop-blur">
              <Waves className="size-3.5 text-sky-400" aria-hidden="true" />
              <span>Water level</span>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={water}
                onChange={(e) => setWater(Number(e.target.value))}
                className="w-24 accent-sky-400"
                aria-valuetext={`${water.toFixed(1)} metres (simulation)`}
              />
              <span className="w-8 tabular-nums text-muted-foreground">{water.toFixed(1)}m</span>
            </label>
            <p className="pointer-events-none absolute right-2 bottom-2 z-10 hidden rounded-md bg-[#0b1220]/70 px-2 py-1 text-[10px] text-muted-foreground sm:block">
              Drag to rotate · Right-drag to pan · Scroll to zoom
            </p>
          </>
        )}

        <div className="sr-only">
          <p>{onPick ? 'Choose your ward:' : 'Wards:'}</p>
          <ul>
            {wards.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  aria-pressed={w.id === selectedWardId}
                  onClick={() => (onPick ? onPick(w.center, w.id) : onSelectWard?.(w.id))}
                >
                  {`Ward ${w.code} ${w.name}: ${RISK_LABEL[levels[w.id] ?? 'unknown']}`}
                </button>
              </li>
            ))}
          </ul>
          {onMarker && (
            <ul aria-label="Map markers">
              {visibleMarkers.filter((m) => m.kind !== 'pick').map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onMarker(m.id)}>{m.label}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {showLegend && <MapLegend />}
    </div>
  )
}
