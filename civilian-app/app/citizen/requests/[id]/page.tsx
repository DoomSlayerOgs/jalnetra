import type { Metadata } from 'next'
import { TrackingView } from '@/components/citizen/tracking-view'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: 'Track your request', robots: { index: false, follow: false } }

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <TrackingView token={id} />
      </main>
    </div>
  )
}
