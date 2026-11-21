import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  HandHeart,
  Languages,
  LifeBuoy,
  MapPinned,
  MessageSquareWarning,
  Send,
  ShieldCheck,
  Tent,
} from 'lucide-react'
import { PlanetBackground } from '@/components/home/planet-background'
import { RevealObserver } from '@/components/home/reveal'
import { DemoBanner } from '@/components/shared/demo-banner'
import { Brand } from '@/components/shared/app-nav'

const rd = (ms: number) => ({ '--rd': `${ms}ms` }) as React.CSSProperties

const FEATURES = [
  {
    icon: MapPinned,
    title: 'Ward risk at a glance',
    body: 'Rainfall observations and citizen waterlogging reports combine into an explainable ward assessment — with “unknown” shown honestly when data is missing.',
  },
  {
    icon: HandHeart,
    title: 'Help requests to real help',
    body: 'Citizens report without logging in. Officers match each request to an open, accessible shelter and a nearby volunteer with the right skills.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Targeted alerts, fewer rumours',
    body: 'Alerts reach only the selected ward. A truth check compares forwarded messages against published advisories before people act on them.',
  },
]

const STEPS = [
  { icon: Send, title: 'Citizen reports', body: 'Choose what is happening, share a location or landmark, and who needs assistance.' },
  { icon: ClipboardCheck, title: 'Officer reviews', body: 'Priority, duplicates and ward context are surfaced. A human approves every dispatch.' },
  { icon: Tent, title: 'Shelter & volunteer matched', body: 'Places are reserved without overbooking; volunteers are matched by distance and skill.' },
  { icon: LifeBuoy, title: 'Status flows back', body: 'The citizen sees each update on a private tracking link — accepted, en route, arrived.' },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#04060f] text-[#f3f6ff]">
      <PlanetBackground />
      <RevealObserver />
      <div className="relative z-10">
        <DemoBanner />
        <header
          className="flex min-h-[calc(100vh-30px)] flex-col"
          style={{
            background:
              'radial-gradient(125% 62% at 50% -10%, rgba(4,6,15,.85) 0%, rgba(4,6,15,.3) 44%, transparent 68%)',
          }}
        >
          <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
            <Brand className="text-lg" />
            <div className="hidden items-center gap-7 text-sm text-[#9aa6c4] md:flex">
              <Link href="/command-centre" className="hover:text-white">Command centre</Link>
              <Link href="/volunteer" className="hover:text-white">Volunteers</Link>
              <Link href="/replay" className="hover:text-white">2005 replay</Link>
              <Link href="/about" className="hover:text-white">Sources</Link>
            </div>
            <Link
              href="/citizen"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Citizen view
            </Link>
          </nav>

          <div className="flex flex-1 -translate-y-[8vh] flex-col items-center justify-center px-5 text-center">
            <p data-reveal style={rd(0)} className="mb-5 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Flood command centre · Mumbai prototype
            </p>
            <h1
              data-reveal
              style={{ ...rd(60), textShadow: '0 2px 50px rgba(0,0,0,.6)' }}
              className="max-w-[16ch] text-[clamp(34px,5.4vw,64px)] leading-[1.04] font-extrabold tracking-tight text-balance"
            >
              Flood warnings should lead to{' '}
              <span className="bg-gradient-to-b from-[#ffd27a] to-primary bg-clip-text text-transparent">real help.</span>
            </h1>
            <p
              data-reveal
              style={rd(180)}
              className="mt-6 max-w-xl text-[clamp(16px,2vw,19px)] leading-relaxed text-pretty text-[#c3cbe0]"
            >
              Report danger, find shelter, and coordinate local help—all in one place.
            </p>
            <div data-reveal style={rd(300)} className="mt-9 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href="/citizen"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffc04d] to-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_rgba(245,158,11,.6)] transition-transform hover:-translate-y-0.5"
              >
                <LifeBuoy className="size-5" aria-hidden="true" />
                I need help
              </Link>
              <Link
                href="/command-centre"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 font-semibold backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-white/10"
              >
                Open command centre
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div data-reveal style={rd(420)} className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#9aa6c4]">
              <Link href="/volunteer" className="underline-offset-4 hover:text-white hover:underline">
                Volunteer view
              </Link>
              <Link href="/replay" className="underline-offset-4 hover:text-white hover:underline">
                Explore the 26 July 2005 flood replay
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-5 py-24 md:py-36" aria-labelledby="features-h">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p data-reveal className="mb-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">One shared picture</p>
            <h2 id="features-h" data-reveal style={rd(80)} className="text-[clamp(28px,4.2vw,46px)] leading-tight font-extrabold tracking-tight text-balance">
              From a rainfall reading to a volunteer at the door
            </h2>
            <p data-reveal style={rd(160)} className="mt-4 text-lg leading-relaxed text-[#9aa6c4]">
              Citizens, ward officers and volunteers work from the same live state — no spreadsheets, no lost requests.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                data-reveal
                style={rd(i * 90)}
                className="rounded-2xl border border-white/10 bg-[rgba(12,18,38,.6)] p-7 backdrop-blur-md transition-colors hover:border-white/20"
              >
                <div className="mb-5 grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <f.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-[#9aa6c4]">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24 md:py-36" aria-labelledby="how-h">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p data-reveal className="mb-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">How it works</p>
              <h2 id="how-h" data-reveal style={rd(80)} className="text-[clamp(28px,4.2vw,46px)] leading-tight font-extrabold tracking-tight text-balance">
                Every request has a human in the loop
              </h2>
              <p data-reveal style={rd(160)} className="mt-4 text-lg leading-relaxed text-[#9aa6c4]">
                Submitting a request does not guarantee a rescue. It puts your need in front of the ward team, who decide what can safely be done.
              </p>
            </div>
            <ol className="flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  data-reveal
                  style={rd(i * 90)}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-[rgba(16,24,48,.65)] p-5 backdrop-blur-md"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <s.icon className="size-4 text-primary" aria-hidden="true" />
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#9aa6c4]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24 md:py-32" aria-labelledby="access-h">
          <div
            data-reveal
            className="mx-auto max-w-3xl rounded-3xl border border-white/15 p-8 text-center backdrop-blur-lg md:p-14"
            style={{ background: 'radial-gradient(120% 140% at 50% 0%, rgba(245,158,11,.14), transparent 55%), rgba(16,24,48,.7)' }}
          >
            <div className="mx-auto mb-5 flex w-fit gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-white/10"><Languages className="size-5" aria-hidden="true" /></span>
              <span className="grid size-10 place-items-center rounded-full bg-white/10"><ShieldCheck className="size-5" aria-hidden="true" /></span>
              <span className="grid size-10 place-items-center rounded-full bg-white/10"><BellRing className="size-5" aria-hidden="true" /></span>
            </div>
            <h2 id="access-h" className="text-[clamp(24px,3.6vw,38px)] leading-tight font-extrabold tracking-tight text-balance">
              Built for low battery, poor signal and every language
            </h2>
            <p className="mt-4 leading-relaxed text-[#c3cbe0]">
              Large touch targets, keyboard access and plain words. Citizen screens are available in English, हिन्दी and मराठी. No login is needed to ask for help.
            </p>
            <p lang="hi" className="mt-3 text-[#9aa6c4]">मदद माँगने के लिए लॉगिन की ज़रूरत नहीं है।</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/citizen" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
                I need help <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/about" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10">
                Sources & limitations
              </Link>
            </div>
          </div>

          <footer className="mt-24 border-t border-white/10 pt-10 text-sm text-[#9aa6c4]">
            <div className="flex flex-col justify-between gap-8 md:flex-row">
              <div className="max-w-sm">
                <Brand className="text-base text-white" />
                <p className="mt-3 leading-relaxed">
                  A hackathon prototype (CIV-02 Flood Command Centre). Demo mode — not an official BMC or government service. In an emergency call 112.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-xs tracking-widest text-[#6b7796] uppercase">Use</h3>
                  <ul className="space-y-2">
                    <li><Link href="/citizen" className="hover:text-white">Citizen</Link></li>
                    <li><Link href="/command-centre" className="hover:text-white">Command centre</Link></li>
                    <li><Link href="/volunteer" className="hover:text-white">Volunteer</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-xs tracking-widest text-[#6b7796] uppercase">Learn</h3>
                  <ul className="space-y-2">
                    <li><Link href="/replay" className="hover:text-white">2005 replay</Link></li>
                    <li><Link href="/about" className="hover:text-white">Sources</Link></li>
                    <li><Link href="/about#limitations" className="hover:text-white">Limitations</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-xs tracking-widest text-[#6b7796] uppercase">Data</h3>
                  <p className="leading-relaxed">All rainfall, reports, shelters and volunteers are fictional sample data. Ward shapes are schematic.</p>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
