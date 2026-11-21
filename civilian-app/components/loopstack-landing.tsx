'use client'

import { useEffect, useRef } from 'react'

const HEADLINE_FIRST_LINE = ['Apply', 'Now', 'to', 'be', 'part']
const HEADLINE_SECOND_LINE = ['of', 'the', 'closed', 'beta']
const LOGO = 'Loopstack'

function Word({ children, index }: { children: string; index: number }) {
  return (
    <span className="loopstack-word-mask">
      <span className="loopstack-word" style={{ animationDelay: `${index * 0.1}s` }}>
        {children}
      </span>
    </span>
  )
}

export function LoopstackLanding({ assetBaseUrl }: { assetBaseUrl: string }) {
  const ringRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const ring = ringRef.current
    const card = cardRef.current
    const button = buttonRef.current
    if (!ring || !card || !button) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let cardX = mouseX
    let cardY = mouseY
    let ringX = mouseX
    let ringY = mouseY
    let scale = 0
    let targetScale = 0
    let hoveringButton = false
    let firstMove = true

    const onPointerMove = (event: PointerEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
      if (firstMove) {
        cardX = mouseX
        cardY = mouseY
        ringX = mouseX
        ringY = mouseY
        firstMove = false
        card.classList.add('is-active')
        ring.classList.add('is-active')
      }
      if (!hoveringButton) targetScale = 1
    }

    const onPointerLeave = () => {
      targetScale = 0
    }

    const onPointerEnter = () => {
      if (!hoveringButton) targetScale = 1
    }

    const onButtonEnter = () => {
      hoveringButton = true
      targetScale = 0
      ring.classList.add('is-expanded')
    }

    const onButtonLeave = () => {
      hoveringButton = false
      targetScale = 1
      ring.classList.remove('is-expanded')
    }

    let frame = 0
    const animate = () => {
      cardX += (mouseX - cardX) * 0.08
      cardY += (mouseY - cardY) * 0.08
      ringX = mouseX
      ringY = mouseY
      scale += (targetScale - scale) * 0.15
      const ringScale = ring.classList.contains('is-expanded') ? 1.6 * scale : scale
      card.style.transform = `translate3d(${cardX}px, ${cardY}px, 0) translate(-50%, -50%) scale(${scale})`
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`
      frame = window.requestAnimationFrame(animate)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('pointerenter', onPointerEnter)
    button.addEventListener('pointerenter', onButtonEnter)
    button.addEventListener('pointerleave', onButtonLeave)
    frame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('pointerenter', onPointerEnter)
      button.removeEventListener('pointerenter', onButtonEnter)
      button.removeEventListener('pointerleave', onButtonLeave)
    }
  }, [])

  const assetRoot = assetBaseUrl.replace(/\/$/, '')

  return (
    <div className="loopstack-page">
      <img className="loopstack-gradient" src={`${assetRoot}/black_gradient.svg`} alt="" aria-hidden="true" />

      <main className="loopstack-hero">
        <h1 className="loopstack-headline" aria-label="Apply Now to be part of the closed beta">
          <span className="loopstack-headline-line" aria-hidden="true">
            {HEADLINE_FIRST_LINE.map((word, index) => (
              <span className="loopstack-spaced-word" key={word}>
                {index > 0 && ' '}
                <Word index={index}>{word}</Word>
              </span>
            ))}
          </span>
          <br />
          <span className="loopstack-headline-line" aria-hidden="true">
            {HEADLINE_SECOND_LINE.map((word, index) => (
              <span className="loopstack-spaced-word" key={word}>
                {index > 0 && ' '}
                <Word index={index + HEADLINE_FIRST_LINE.length}>{word}</Word>
              </span>
            ))}
          </span>
        </h1>
        <button className="loopstack-demo-button" type="button" ref={buttonRef}>
          <span>Book a demo</span>
          <span className="loopstack-pulse-dot" aria-hidden="true" />
        </button>
      </main>

      <footer className="loopstack-footer">
        <div className="loopstack-footer-top">
          <h2>Stay in Touch</h2>
          <h2>Think. Build. Repeat.</h2>
        </div>
        <div className="loopstack-divider" />
        <div className="loopstack-footer-bottom">
          <div className="loopstack-socials">
            <a href="#" aria-label="LinkedIn" className="loopstack-social-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
            </a>
            <a href="#" aria-label="X" className="loopstack-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
            </a>
            <a href="#" aria-label="Instagram" className="loopstack-social-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
          </div>
          <nav aria-label="Footer" className="loopstack-footer-links">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </nav>
          <p className="loopstack-copyright">© 2026 Loopstack</p>
        </div>
      </footer>

      <div className="loopstack-wordmark" aria-label="Loopstack">
        <span className="loopstack-wordmark-text" aria-hidden="true">
          {Array.from(LOGO).map((letter, index) => (
            <span className="loopstack-letter-mask" key={`${letter}-${index}`}>
              <span className="loopstack-letter" style={{ animationDelay: `${index * 0.09}s` }}>{letter}</span>
            </span>
          ))}
        </span>
      </div>

      <div className="loopstack-video" aria-hidden="true">
        <video autoPlay muted playsInline loop>
          <source src={`${assetRoot}/flower.mp4`} type="video/mp4" />
        </video>
      </div>

      <div ref={ringRef} className="loopstack-cursor-ring" aria-hidden="true" />
      <div ref={cardRef} className="loopstack-cursor-card" aria-hidden="true">
        <span><span className="loopstack-cursor-white">Say</span> Hello!</span>
      </div>
    </div>
  )
}
