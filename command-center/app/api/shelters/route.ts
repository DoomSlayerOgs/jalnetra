import { handle, int, readJson } from '@/lib/server/http'
import { publicShelters, publicWards, suggestSheltersFor } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export function GET() {
  return handle(async () => ({ wards: await publicWards(), shelters: await publicShelters() }))
}

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req)
    const loc = (b.location ?? {}) as Record<string, unknown>
    return suggestSheltersFor({
      location: { x: int(Math.round(Number(loc.x)), 'x', 0, 400), y: int(Math.round(Number(loc.y)), 'y', 0, 640) },
      partySize: int(b.partySize, 'Number of people', 1, 30),
      needsMobility: b.needsMobility === true,
      needsMedical: b.needsMedical === true,
    })
  })
}
