'use client'

import { useEffect, useRef } from 'react'

export function PlanetBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    import('./planet-scene')
      .then(({ mountPlanet }) => {
        if (cancelled) return
        try {
          cleanup = mountPlanet(canvas, { reducedMotion })
        } catch (err) {
          console.log('[v0] Planet background unavailable:', (err as Error).message)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 block h-screen w-screen bg-[#040a1e]"
    />
  )
}
