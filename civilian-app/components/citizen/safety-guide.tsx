'use client'

import { useState } from 'react'
import { Ambulance, Check, Flame, Phone, ShieldAlert, Siren } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Lang, useT } from './i18n'

const PHASES = {
  before: {
    label: 'Before',
    items: [
      'Charge your phone and a power bank',
      'Keep drinking water, dry food and medicines for 3 days',
      'Put ID documents in a waterproof bag',
      'Know the route to your nearest shelter on higher ground',
      'Move valuables and electrical items to a higher shelf',
      'Save emergency numbers and share your plan with family',
    ],
  },
  during: {
    label: 'During',
    items: [
      'Move to a higher floor if water enters your home',
      'Switch off electricity at the main switch if it is safe',
      'Never walk or drive through moving or deep water',
      'Stay away from open drains, manholes and power lines',
      'Check messages against official advisories before forwarding',
      'Request help in the app or call 112 if life is in danger',
    ],
  },
  after: {
    label: 'After',
    items: [
      'Return home only when officials say it is safe',
      'Do not use electrical appliances until they are checked',
      'Boil or purify drinking water',
      'Watch for fever, diarrhoea or skin infections and seek care',
      'Photograph damage for relief claims',
      'Check on elderly neighbours and people living alone',
    ],
  },
} as const

type Phase = keyof typeof PHASES

const NUMBERS = [
  { n: '112', label: 'National emergency', icon: Siren },
  { n: '1916', label: 'BMC disaster control', icon: ShieldAlert },
  { n: '108', label: 'Ambulance', icon: Ambulance },
  { n: '101', label: 'Fire brigade', icon: Flame },
]

export function SafetyGuide({ lang }: { lang: Lang }) {
  const t = useT(lang)
  const [phase, setPhase] = useState<Phase>('during')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const items = PHASES[phase].items
  const count = items.filter((i) => done[`${phase}:${i}`]).length

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section aria-labelledby="sg-h" className="rounded-xl border border-border bg-panel p-4">
        <h2 id="sg-h" className="sr-only">Flood safety checklist</h2>
        <div role="tablist" aria-label="Flood phase" className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1">
          {(Object.keys(PHASES) as Phase[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={phase === p}
              onClick={() => setPhase(p)}
              className={cn('rounded-md py-2 text-sm font-medium transition-colors', phase === p ? 'bg-panel-2 text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {PHASES[p].label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{count} of {items.length} done</span>
          <button type="button" onClick={() => setDone({})} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
          <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${(count / items.length) * 100}%` }} />
        </div>
        <ul key={phase} className="mt-4 grid gap-2 animate-in fade-in duration-300">
          {items.map((i) => {
            const k = `${phase}:${i}`
            return (
              <li key={k}>
                <label className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary', done[k] ? 'border-ok/40 bg-ok/10' : 'border-border hover:bg-panel-2')}>
                  <input type="checkbox" className="sr-only" checked={!!done[k]} onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))} />
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded border-2 transition-colors', done[k] ? 'border-ok bg-ok text-[#04210f]' : 'border-muted-foreground')} aria-hidden="true">
                    {done[k] && <Check className="size-3.5" />}
                  </span>
                  <span className={cn('text-sm', done[k] && 'text-muted-foreground line-through')}>{i}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="en-h" className="grid content-start gap-3">
        <h2 id="en-h" className="text-sm font-semibold">{t('emergencyNumbers')}</h2>
        <ul className="grid grid-cols-2 gap-3">
          {NUMBERS.map((x) => (
            <li key={x.n}>
              <a href={`tel:${x.n}`} className="flex flex-col gap-1 rounded-xl border border-border bg-panel p-4 transition-colors hover:border-critical/50 hover:bg-critical/10">
                <x.icon className="size-5 text-critical" aria-hidden="true" />
                <span className="text-2xl font-semibold tabular-nums">{x.n}</span>
                <span className="text-xs text-muted-foreground">{x.label}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-critical"><Phone className="size-3" aria-hidden="true" /> Tap to call</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">General guidance only. Always follow instructions from BMC, police and disaster response teams.</p>
      </section>
    </div>
  )
}
