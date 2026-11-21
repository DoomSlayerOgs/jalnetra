import { clientKey, handle, readJson, str } from '@/lib/server/http'
import { rateLimit, truthCheck } from '@/lib/server/store'

export function POST(req: Request) {
  return handle(async () => {
    rateLimit(`truth:${clientKey(req)}`, 20)
    const b = await readJson(req)
    return truthCheck(str(b.text, 'Message', { max: 1000 }))
  })
}
