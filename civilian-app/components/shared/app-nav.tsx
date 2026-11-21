'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LOGO_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jal%20netra%20Monogram-Z1NJIdcGSjPonCMuGdTjC1ANWKy0rw.png'

const LINKS = [
  { href: '/citizen', label: 'Public help' },
  { href: '/about', label: 'About & sources' },
]

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/citizen" className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <Image src={LOGO_URL} alt="" aria-hidden="true" width={112} height={112} unoptimized className="h-8 w-8 rounded-full object-cover" />
      <span className="portal-brand-name">Jal Netra</span>
    </Link>
  )
}

export function AppNav({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-12 items-center gap-4 px-4">
        <Brand className="text-sm" />
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                  active && 'bg-panel-2 text-foreground',
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
      <nav aria-label="Main mobile" className="flex gap-1 overflow-x-auto border-t border-border px-2 py-1 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname.startsWith(l.href) ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground',
              pathname.startsWith(l.href) && 'bg-panel-2 text-foreground',
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
