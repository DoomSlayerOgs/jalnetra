import type { Metadata } from 'next'
import { ReplayView } from '@/components/replay/replay-view'
import { AppNav } from '@/components/shared/app-nav'
import { DemoBanner } from '@/components/shared/demo-banner'

export const metadata: Metadata = { title: '26 July 2005 flood replay' }

export default function ReplayPage() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <AppNav />
      <main>
        <ReplayView />
      </main>
    </div>
  )
}
