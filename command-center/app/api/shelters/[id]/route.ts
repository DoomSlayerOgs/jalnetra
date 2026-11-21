import { DEMO_OFFICER, handle, int, readJson } from '@/lib/server/http'
import { updateShelter } from '@/lib/server/store'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(async () => {
    const b = await readJson(req)
    return updateShelter(
      id,
      {
        open: typeof b.open === 'boolean' ? b.open : undefined,
        capacity: b.capacity === undefined ? undefined : int(b.capacity, 'Capacity', 0, 5000),
        occupied: b.occupied === undefined ? undefined : int(b.occupied, 'Occupied', 0, 5000),
      },
      DEMO_OFFICER,
    )
  })
}
