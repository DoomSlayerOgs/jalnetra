import { DEMO_OFFICER, handle, readJson, str } from '@/lib/server/http'
import { ActionError, alertsForWard, sendAlert } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  const ward = new URL(req.url).searchParams.get('ward') ?? ''
  return handle(async () => ({ alerts: await alertsForWard(ward) }))
}

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req)
    if (b.confirm !== true) throw new ActionError('Alert must be confirmed after preview')
    return sendAlert(str(b.wardId, 'Ward', { max: 10 }), str(b.message, 'Message', { max: 320 }), DEMO_OFFICER)
  })
}
