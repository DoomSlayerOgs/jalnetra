import type { Metadata } from 'next'
import { VolunteerApp } from '@/components/volunteer/volunteer-app'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: 'Volunteer tasks' }

export default function VolunteerPage() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main>
        <VolunteerApp />
      </main>
    </div>
  )
}
