import { handle } from '@/lib/server/http'
import { listVolunteers } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export function GET() {
  return handle(async () => ({ volunteers: await listVolunteers() }))
}
