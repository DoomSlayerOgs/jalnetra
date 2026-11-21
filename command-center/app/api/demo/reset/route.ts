import { handle } from '@/lib/server/http'
import { resetDemo } from '@/lib/server/store'

export function POST() {
  return handle(async () => {
    await resetDemo()
  })
}
