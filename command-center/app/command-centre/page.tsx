import type { Metadata } from 'next'
import { CommandCentre } from '@/components/command/command-centre'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: 'Command centre' }

export default function CommandCentrePage() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main>
        <CommandCentre />
      </main>
    </div>
  )
}
