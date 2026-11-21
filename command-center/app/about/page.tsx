import type { Metadata } from 'next'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: 'Sources and limitations' }

const SOURCES = [
  ['India Meteorological Department (IMD)', 'Rainfall intensity categories used for the risk thresholds.', 'https://mausam.imd.gov.in/'],
  ['Brihanmumbai Municipal Corporation — Disaster Management', 'Ward structure and the role of ward-level emergency operations.', 'https://dm.mcgm.gov.in/'],
  ['Fact Finding Committee on Mumbai Floods (2006)', 'Account of the 26 July 2005 flood used in the replay.', null],
] as const

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 leading-relaxed">
        <header>
          <h1 className="text-3xl font-semibold">Sources and limitations</h1>
          <p className="mt-3 text-muted-foreground">
            JalRakshak is a hackathon prototype for the CIV-02 Flood Command Centre problem. It is not an official BMC, IMD or government service.
          </p>
        </header>
        <section aria-labelledby="src-h">
          <h2 id="src-h" className="text-xl font-semibold">Sources</h2>
          <ul className="mt-3 grid gap-3">
            {SOURCES.map(([name, use, url]) => (
              <li key={name} className="rounded-xl border border-border bg-panel p-4">
                <p className="font-medium">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{name}</a> : name}</p>
                <p className="text-sm text-muted-foreground">{use}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="limitations" aria-labelledby="lim-h">
          <h2 id="lim-h" className="text-xl font-semibold">Limitations</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
            <li>All rainfall readings, help requests, shelters, volunteers and contacts are fictional sample data.</li>
            <li>Ward shapes are schematic and do not match official boundaries. Ward susceptibility values are assumed.</li>
            <li>Risk levels are indicative rules, not forecasts. Missing rainfall data is shown as “unknown”, never as safe.</li>
            <li>Distances are straight-line estimates. Routes are not checked for flooding.</li>
            <li>Alert delivery is simulated; no SMS is sent. Data is stored in server memory and resets on restart.</li>
            <li>Submitting a request does not guarantee rescue. In an emergency, call 112.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
