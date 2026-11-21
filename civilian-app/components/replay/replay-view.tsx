'use client'

import { useState } from 'react'
import { RiskBadge } from '@/components/shared/badges'
import { RISK_RULES } from '@/lib/services/risk'
import type { RiskLevel } from '@/lib/types'

// Illustrative cumulative profile scaled to the widely reported ~944 mm 24-hour total at Santacruz.
const FRAMES = [
  { t: '26 Jul, 08:00', mm: 0, note: 'Monsoon day begins. Normal heavy-rain advisories in place.' },
  { t: '26 Jul, 11:00', mm: 60, note: 'Steady heavy rain over the western suburbs.' },
  { t: '26 Jul, 14:00', mm: 290, note: 'Extreme intensity begins. Low-lying roads and subways start to flood.' },
  { t: '26 Jul, 17:00', mm: 640, note: 'Suburban rail halts. Hundreds of thousands are stranded on roads and at stations.' },
  { t: '26 Jul, 20:00', mm: 860, note: 'Mithi river overflows; Kurla, Kalina, Saki Naka severely affected. Phone networks overloaded.' },
  { t: '27 Jul, 08:00', mm: 944, note: 'About 944 mm recorded at Santacruz in 24 hours — among the highest daily totals recorded in India.' },
]

function level(mm: number): RiskLevel {
  const r = RISK_RULES as unknown as { rainfall?: { watch: number; high: number; critical: number } }
  const th = r.rainfall ?? { watch: 30, high: 65, critical: 115 }
  if (mm >= th.critical) return 'critical'
  if (mm >= th.high) return 'high'
  if (mm >= th.watch) return 'watch'
  return 'lower'
}

export function ReplayView() {
  const [i, setI] = useState(0)
  const f = FRAMES[i]
  const pct = (f.mm / 944) * 100
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <header>
        <p className="text-sm text-primary">Historical replay · illustrative</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">26 July 2005: what a command centre could have changed</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Move through the day to see how cumulative rainfall would have pushed western-suburb wards through this prototype&apos;s risk levels — and where targeted alerts, shelter matching and volunteer coordination could have helped.
        </p>
      </header>

      <section aria-labelledby="rp-h" className="rounded-xl border border-border bg-panel p-5">
        <h2 id="rp-h" className="sr-only">Timeline</h2>
        <label className="grid gap-2 text-sm">
          <span className="flex justify-between"><span className="font-medium">{f.t}</span><span className="text-muted-foreground">Step {i + 1} of {FRAMES.length}</span></span>
          <input type="range" min={0} max={FRAMES.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="accent-primary" aria-valuetext={f.t} />
        </label>
        <div className="mt-5 flex items-end gap-5">
          <div className="relative h-48 w-16 overflow-hidden rounded-lg border border-border bg-background" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 bg-sky-500/70 transition-all duration-500" style={{ height: `${pct}%` }} />
          </div>
          <div aria-live="polite">
            <p className="text-4xl font-semibold tabular-nums">{f.mm} mm</p>
            <p className="text-sm text-muted-foreground">cumulative since 08:00 (Santacruz, illustrative profile)</p>
            <div className="mt-3"><RiskBadge level={level(f.mm)} long /></div>
            <p className="mt-3 max-w-md leading-relaxed">{f.note}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ['Targeted alerts', 'Ward-specific messages from mid-afternoon could have told commuters to stay put before the rail network halted.'],
          ['Shelter matching', 'Schools and halls on higher ground could have been opened and capacity shown live, instead of by word of mouth.'],
          ['Rumour control', 'False reports — such as a dam burst — spread widely. A truth check against official advisories could have reduced panic.'],
        ].map(([h, p]) => (
          <article key={h} className="rounded-xl border border-border bg-panel p-4">
            <h3 className="font-semibold">{h}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p}</p>
          </article>
        ))}
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Hourly values are an illustrative interpolation, not measured hourly data. The 24-hour total (~944 mm at Santacruz) and the events described are drawn from public reporting, including the Fact Finding Committee on Mumbai Floods (2006). See Sources for details.
      </p>
    </div>
  )
}
