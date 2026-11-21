import { handle, oneOf, readJson, str } from '@/lib/server/http'
import { updateAssignment } from '@/lib/server/store'

const ACTIONS = ['accept', 'decline', 'en_route', 'arrived', 'completed'] as const

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(async () => {
    const b = await readJson(req)
    await updateAssignment(id, oneOf(b.action, 'action', ACTIONS), str(b.volunteerId, 'Volunteer', { max: 40 }))
  })
}
