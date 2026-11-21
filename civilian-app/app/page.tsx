import type { Metadata } from 'next'
import { HomePage } from '@/components/home-page'

export const metadata: Metadata = {
  title: 'Jal Netra | Flood safety and community support',
  description: 'Find flood safety information, local alerts, open shelters and community support with Jal Netra.',
}

export default function Page() {
  return <HomePage />
}
