'use client'

import { MAP_HEIGHT, MAP_WIDTH, pointInPolygon } from '@/lib/geo'
import { RISK_COLOR, RISK_LABEL } from '@/lib/labels'
import type { Point, RiskLevel, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

export type MapMarker = {
  id: string
  kind: 'report' | 'critical' | 'shelter' | 'volunteer' | 'pick'
  point: Point
  label: string
  selected?: boolean
}

const poly = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')

export function WardMap2D({
  wards,
  levels,
  markers = [],
  selectedWardId,
  onSelectWard,
  onPick,
  onMarker,
  showLegend = true,
  className,
  label = 'Schematic ward map of Mumbai',
}: {
  wards: Ward[]
  levels: Record<string, RiskLevel>
  markers?: MapMarker[]
  selectedWardId?: string | null
  onSelectWard?: (wardId: string) => void
  onPick?: (point: Point, wardId: string) => void
  onMarker?: (id: string) => void
  showLegend?: boolean
  className?: string
  label?: string
}) {
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    const point = { x: Math.round(p.x), y: Math.round(p.y) }
    const ward = wards.find((w) => pointInPolygon(point, w.polygon))
    if (ward) onPick(point, ward.id)
  }

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className={cn('h-full w-full', onPick && 'cursor-crosshair')}
        role="img"
        aria-label={label}
        onClick={handleClick}
      >
        <defs>
          <pattern id="sea" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 Q3 3 6 6 T12 6" fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
          </pattern>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.45" />
          </pattern>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#08101d" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sea)" opacity="0.6" />
        {wards.map((w) => {
          const level = levels[w.id] ?? 'unknown'
          const selected = w.id === selectedWardId
          return (
            <g
              key={w.id}
              role={onSelectWard ? 'button' : undefined}
              tabIndex={onSelectWard ? 0 : undefined}
              aria-label={onSelectWard ? `Ward ${w.code} ${w.name}: ${RISK_LABEL[level]}` : undefined}
              aria-pressed={onSelectWard ? selected : undefined}
              onClick={(e) => {
                if (onSelectWard && !onPick) {
                  e.stopPropagation()
                  onSelectWard(w.id)
                }
              }}
              onKeyDown={(e) => {
                if (onSelectWard && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelectWard(w.id)
                }
              }}
              className={cn(onSelectWard && !onPick && 'cursor-pointer', 'outline-none [&:focus-visible>polygon:last-of-type]:stroke-white')}
            >
              <polygon points={poly(w.polygon)} fill={RISK_COLOR[level]} fillOpacity={level === 'unknown' ? 0.18 : 0.32} />
              {level === 'unknown' && <polygon points={poly(w.polygon)} fill="url(#hatch)" />}
              <polygon
                points={poly(w.polygon)}
                fill="none"
                stroke={selected ? '#f8fafc' : RISK_COLOR[level]}
                strokeOpacity={selected ? 1 : 0.7}
                strokeWidth={selected ? 3 : 1.2}
              />
              <text
                x={w.center.x}
                y={w.center.y}
                textAnchor="middle"
                className="pointer-events-none select-none fill-foreground text-[11px] font-semibold"
              >
                {w.code}
              </text>
              <text
                x={w.center.x}
                y={w.center.y + 12}
                textAnchor="middle"
                className="pointer-events-none select-none fill-slate-300 text-[8px]"
              >
                {w.name}
              </text>
            </g>
          )
        })}
        {markers.map((m) => (
          <MarkerShape key={m.id} m={m} onMarker={onMarker} />
        ))}
      </svg>
      {showLegend && <MapLegend />}
    </div>
  )
}

function MarkerShape({ m, onMarker }: { m: MapMarker; onMarker?: (id: string) => void }) {
  const { x, y } = m.point
  const interactive = Boolean(onMarker) && m.kind !== 'pick'
  const common = {
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
    'aria-label': m.label,
    onClick: interactive
      ? (e: React.MouseEvent) => {
          e.stopPropagation()
          onMarker!(m.id)
        }
      : undefined,
    onKeyDown: interactive
      ? (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onMarker!(m.id)
          }
        }
      : undefined,
    className: cn(interactive && 'cursor-pointer outline-none'),
  }
  const ring = m.selected ? <circle cx={x} cy={y} r={11} fill="none" stroke="#f8fafc" strokeWidth={2} /> : null
  switch (m.kind) {
    case 'critical':
      return (
        <g {...common}>
          <title>{m.label}</title>
          <circle cx={x} cy={y} r={9} fill="#ef4444" fillOpacity={0.25}>
            <animate attributeName="r" values="6;12;6" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r={5.5} fill="#ef4444" stroke="#0b1220" strokeWidth={1.5} />
          {ring}
        </g>
      )
    case 'report':
      return (
        <g {...common}>
          <title>{m.label}</title>
          <circle cx={x} cy={y} r={5} fill="#f59e0b" stroke="#0b1220" strokeWidth={1.5} />
          {ring}
        </g>
      )
    case 'shelter':
      return (
        <g {...common}>
          <title>{m.label}</title>
          <rect x={x - 5.5} y={y - 5.5} width={11} height={11} rx={2} fill="#38bdf8" stroke="#0b1220" strokeWidth={1.5} />
          <path d={`M${x - 3} ${y + 0.5} L${x} ${y - 2.5} L${x + 3} ${y + 0.5} M${x - 2} ${y} V${y + 3} H${x + 2} V${y}`} stroke="#0b1220" strokeWidth={1.2} fill="none" />
          {ring}
        </g>
      )
    case 'volunteer':
      return (
        <g {...common}>
          <title>{m.label}</title>
          <path d={`M${x} ${y - 6} L${x + 6} ${y + 5} H${x - 6} Z`} fill="#22c55e" stroke="#0b1220" strokeWidth={1.5} />
          {ring}
        </g>
      )
    case 'pick':
      return (
        <g aria-label={m.label}>
          <circle cx={x} cy={y} r={10} fill="#f59e0b" fillOpacity={0.2} stroke="#f59e0b" strokeWidth={1.5} />
          <circle cx={x} cy={y} r={3.5} fill="#f8fafc" />
        </g>
      )
  }
}

export function MapLegend() {
  const levels: RiskLevel[] = ['critical', 'high', 'watch', 'lower', 'unknown']
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border bg-panel/80 px-3 py-2 text-[11px] text-muted-foreground">
      {levels.map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm border"
            style={{
              background: l === 'unknown' ? 'repeating-linear-gradient(45deg,#64748b55 0 2px,transparent 2px 4px)' : `${RISK_COLOR[l]}66`,
              borderColor: RISK_COLOR[l],
            }}
            aria-hidden="true"
          />
          {RISK_LABEL[l]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-critical" aria-hidden="true" /> Life-threatening
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-high" aria-hidden="true" /> Report
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-sky-400" aria-hidden="true" /> Shelter
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-ok" aria-hidden="true" /> Volunteer
      </span>
      <span className="w-full text-[10px] text-muted-foreground/80">
        Schematic ward shapes — not official boundaries. Tile height shows assessed risk. No reports does not mean an area is safe.
      </span>
    </div>
  )
}
