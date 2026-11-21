import type { Metadata } from 'next'
import { CitizenApp } from '@/components/citizen/citizen-app'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: 'Report danger and request help' }

export default function CitizenPage() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main>
        <CitizenApp />
      </main>
    </div>
  )
}
