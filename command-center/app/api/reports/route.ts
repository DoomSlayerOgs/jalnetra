import { clientKey, handle, int, oneOf, readJson, str } from '@/lib/server/http'
import { ActionError, createReport, rateLimit } from '@/lib/server/store'

const CATEGORIES = ['trapped', 'water_entering', 'medical', 'shelter', 'mobility', 'waterlogging'] as const
const LANGS = ['en', 'hi', 'mr'] as const

export function POST(req: Request) {
  return handle(async () => {
    rateLimit(`report:${clientKey(req)}`)
    const b = await readJson(req)
    const loc = (b.location ?? {}) as Record<string, unknown>
    const phone = str(b.contactPhone, 'Phone', { max: 20, required: false })
    if (phone && !/^[+\d\s-]{6,20}$/.test(phone)) throw new ActionError('Please enter a valid phone number')
    return createReport({
      category: oneOf(b.category, 'category', CATEGORIES),
      wardId: str(b.wardId, 'Ward', { max: 10 }),
      location: { x: int(Math.round(Number(loc.x)), 'x', 0, 400), y: int(Math.round(Number(loc.y)), 'y', 0, 640) },
      landmark: str(b.landmark, 'Landmark', { max: 140, required: false }),
      partySize: int(b.partySize, 'Number of people', 1, 30),
      needsMobility: b.needsMobility === true,
      needsMedical: b.needsMedical === true,
      hasChildren: b.hasChildren === true,
      otherNeeds: str(b.otherNeeds, 'Other needs', { max: 200, required: false }),
      description: str(b.description, 'Description', { max: 500, required: false }),
      contactName: str(b.contactName, 'Name', { max: 60, required: false }) || null,
      contactPhone: phone || null,
      language: oneOf(b.language ?? 'en', 'language', LANGS),
    })
  })
}
