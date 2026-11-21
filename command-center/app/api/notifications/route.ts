import { handle } from '@/lib/server/http'
import { markNotificationsRead } from '@/lib/server/store'

export function POST() {
  return handle(() => markNotificationsRead('officer'))
}
