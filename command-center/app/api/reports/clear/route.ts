import { DEMO_OFFICER, handle } from '@/lib/server/http'
import { clearReports } from '@/lib/server/store'

export function POST() {
  return handle(() => clearReports(DEMO_OFFICER))
}
