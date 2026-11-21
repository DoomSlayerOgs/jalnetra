'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, BellRing, LifeBuoy, MapPin, ShieldCheck, Waves } from 'lucide-react'

const LOGO_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jal%20netra%20Monogram-Z1NJIdcGSjPonCMuGdTjC1ANWKy0rw.png'

const features = [
  {
    icon: MapPin,
    number: '01',
    title: 'Find a safe place',
    description: 'Explore open shelters, available spaces and practical directions to reach them.',
  },
  {
    icon: BellRing,
    number: '02',
    title: 'Check local alerts',
    description: 'Review ward-level updates and understand what to do when conditions change.',
  },
  {
    icon: LifeBuoy,
    number: '03',
    title: 'Request assistance',
    description: 'Share what you need so responders can coordinate help for your area.',
  },
]

export function HomePage() {
  return (
    <main className="jn-home">
      <header className="jn-header">
        <div className="jn-nav-wrap">
          <Link href="/" className="jn-brand" aria-label="Jal Netra home">
            <Image src={LOGO_URL} alt="Jal Netra" width={176} height={176} priority unoptimized className="jn-logo" />
            <span className="sr-only">Jal Netra</span>
          </Link>
          <nav aria-label="Main menu" className="jn-menu">
            <Link href="/">Home</Link>
            <a href="#how-it-helps">How it helps</a>
            <Link href="/about">About</Link>
            <Link href="/citizen" className="jn-menu-cta">Open help portal <ArrowRight aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>

      <section className="jn-hero" aria-labelledby="hero-title">
        <div className="jn-hero-inner">
          <div className="jn-hero-copy">
            <p className="jn-eyebrow"><span aria-hidden="true" /> FLOOD SAFETY, TOGETHER</p>
            <h1 id="hero-title">When water rises,<br /><em>help should be closer.</em></h1>
            <p className="jn-lede">A clearer way to find shelter, check local alerts and request support when flooding affects your community.</p>
            <div className="jn-actions">
              <Link href="/citizen" className="jn-primary-action">Go to the help portal <ArrowRight aria-hidden="true" /></Link>
              <a href="#how-it-helps" className="jn-text-action">See how it works <ArrowDown aria-hidden="true" /></a>
            </div>
            <div className="jn-reassurance"><ShieldCheck aria-hidden="true" /><span>One place for practical flood-safety information</span></div>
          </div>
          <div className="jn-hero-art" aria-hidden="true">
            <div className="jn-orbit jn-orbit-one" />
            <div className="jn-orbit jn-orbit-two" />
            <div className="jn-waterline jn-waterline-one" />
            <div className="jn-waterline jn-waterline-two" />
            <div className="jn-waterline jn-waterline-three" />
            <div className="jn-hero-mark"><Waves /><span>JAL<br />NETRA</span></div>
            <div className="jn-coordinate">19°04&apos; N&nbsp; / &nbsp;72°52&apos; E</div>
            <div className="jn-art-caption">A safer next step,<br />when it matters most.</div>
          </div>
        </div>
        <div className="jn-hero-foot"><span>COMMUNITY FLOOD RESPONSE</span><span>INFORMATION · SHELTER · SUPPORT</span></div>
      </section>

      <section className="jn-how" id="how-it-helps" aria-labelledby="how-title">
        <div className="jn-section-heading">
          <div><p className="jn-eyebrow">A GOOD PLACE TO START</p><h2 id="how-title">Find your next step.</h2></div>
          <p>When you need information or support, start with the tools that help you act with confidence.</p>
        </div>
        <div className="jn-feature-grid">
          {features.map(({ icon: Icon, number, title, description }) => (
            <article className="jn-feature" key={number}>
              <div className="jn-feature-top"><span>{number}</span><Icon aria-hidden="true" /></div>
              <h3>{title}</h3><p>{description}</p>
              <Link href="/citizen" aria-label={`${title} in the help portal`}>Explore the portal <ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
        <div className="jn-callout"><div><span className="jn-callout-label">NEED HELP RIGHT NOW?</span><p>Open the portal to find support and report what is happening in your area.</p></div><Link href="/citizen">Get help <ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <footer className="jn-footer"><Link href="/" className="jn-footer-brand">Jal Netra</Link><span>Flood safety information for stronger communities.</span><Link href="/about">About &amp; sources</Link></footer>
    </main>
  )
}
