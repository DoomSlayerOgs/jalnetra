'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { BellRing, BookOpenCheck, LayoutDashboard, LifeBuoy, ListChecks, MessageSquareWarning, Tent } from 'lucide-react'
import { fetcher } from '@/lib/client'
import { useMyRequests } from '@/lib/my-requests'
import type { Alert, Shelter, Ward, WardAssessment } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ReportFlow } from './report-flow'
import { ShelterFinder } from './shelter-finder'
import { AlertCheck } from './alert-check'
import { TruthCheck } from './truth-check'
import { CitizenHome } from './citizen-home'
import { MyRequests } from './my-requests'
import { SafetyGuide } from './safety-guide'
import { T, type Lang, type TKey, useT } from './i18n'

export type CitizenTab = 'home' | 'help' | 'shelter' | 'alert' | 'truth' | 'mine' | 'safety'

export type PublicOverview = {
  generatedAt: string
  wards: Ward[]
  assessments: WardAssessment[]
  shelters: (Shelter & { available: number })[]
  alerts: Alert[]
  openByWard: Record<string, number>
}

/** Kept for components that only need wards and shelters. */
export type PublicData = Pick<PublicOverview, 'wards' | 'shelters'>

const NAV: { id: CitizenTab; icon: typeof LifeBuoy; key: TKey }[] = [
  { id: 'home', icon: LayoutDashboard, key: 'home' },
  { id: 'help', icon: LifeBuoy, key: 'needHelp' },
  { id: 'shelter', icon: Tent, key: 'findShelter' },
  { id: 'alert', icon: BellRing, key: 'checkAlert' },
  { id: 'truth', icon: MessageSquareWarning, key: 'checkMessage' },
  { id: 'mine', icon: ListChecks, key: 'myRequests' },
  { id: 'safety', icon: BookOpenCheck, key: 'safety' },
]

export function CitizenApp() {
  const [tab, setTab] = useState<CitizenTab>('home')
  const [lang, setLang] = useState<Lang>('en')
  const [wardId, setWardId] = useState('')
  const t = useT(lang)
  const { list: mine } = useMyRequests()
  const { data, error } = useSWR<PublicOverview>('/api/public', fetcher, { refreshInterval: 5000 })

  function go(next: CitizenTab) {
    setTab(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const wardAlerts = data && wardId ? data.alerts.filter((a) => a.wardId === wardId).length : 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6" lang={lang}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="citizen-kicker text-xs font-semibold tracking-[0.16em] text-primary uppercase">Citizen portal</p>
          <h1 className="citizen-page-title text-2xl font-semibold text-balance">{tab === 'home' ? t('title') : t(NAV.find((n) => n.id === tab)!.key)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data && tab !== 'shelter' && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('myArea')}</span>
              <select
                value={wardId}
                onChange={(e) => setWardId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-panel px-2 text-foreground"
              >
                <option value="">{t('chooseArea')}</option>
                {data.wards.map((w) => <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">Language</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-9 rounded-lg border border-border bg-panel px-2 text-foreground"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
        </div>
      </div>

      <nav aria-label="Citizen sections" className="sticky top-0 z-30 -mx-4 mb-5 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
        <ul className="flex gap-1.5 overflow-x-auto">
          {NAV.map((n) => {
            const badge = n.id === 'mine' ? mine.length : n.id === 'alert' ? wardAlerts : 0
            return (
              <li key={n.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={tab === n.id ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                    tab === n.id
                      ? n.id === 'help'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-foreground/20 bg-panel-2 text-foreground'
                      : n.id === 'help'
                        ? 'border-primary/50 text-primary hover:bg-primary/10'
                        : 'border-border text-muted-foreground hover:bg-panel-2 hover:text-foreground',
                  )}
                >
                  <n.icon className="size-4" aria-hidden="true" />
                  {t(n.key)}
                  {badge > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-high px-1 text-[10px] font-bold text-[#1a1103]">{badge}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {error && <p role="alert" className="mb-4 rounded-lg border border-critical/40 bg-critical/10 p-3 text-sm">{t('loadError')}</p>}

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <div className="h-64 animate-pulse rounded-xl bg-panel" />
          <div className="h-64 animate-pulse rounded-xl bg-panel" />
        </div>
      ) : (
        <div key={tab} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          {tab === 'home' && <CitizenHome data={data} lang={lang} wardId={wardId} setWardId={setWardId} go={go} />}
          {tab === 'help' && (
            <div className="mx-auto max-w-xl">
              <ReportFlow wards={data.wards} lang={lang} defaultWardId={wardId} onSubmitted={(w) => setWardId(w)} />
            </div>
          )}
          {tab === 'shelter' && <ShelterFinder wards={data.wards} lang={lang} defaultWardId={wardId} onWardChange={setWardId} levels={Object.fromEntries(data.assessments.map((a) => [a.wardId, a.level]))} />}
          {tab === 'alert' && (
            <div className="mx-auto max-w-xl">
              <AlertCheck wards={data.wards} lang={lang} wardId={wardId} setWardId={setWardId} />
            </div>
          )}
          {tab === 'truth' && (
            <div className="mx-auto max-w-xl">
              <TruthCheck lang={lang} />
            </div>
          )}
          {tab === 'mine' && (
            <div className="mx-auto max-w-2xl">
              <MyRequests onNew={() => go('help')} />
            </div>
          )}
          {tab === 'safety' && <SafetyGuide lang={lang} />}
        </div>
      )}

      <p className="mx-auto mt-8 max-w-2xl rounded-lg border border-critical/30 bg-critical/10 p-3 text-center text-sm">{t('emergency')}</p>
    </div>
  )
}

export { T }
