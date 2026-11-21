import { handle } from '@/lib/server/http'
import { getCommandState } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export function GET() {
  return handle(() => getCommandState())
}
