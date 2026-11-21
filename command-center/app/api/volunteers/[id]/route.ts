import { NextResponse } from 'next/server'
import { DEMO_OFFICER, handle, oneOf, readJson } from '@/lib/server/http'
import { getVolunteerTasks, markNotificationsRead, setVolunteerAvailability, verifyVolunteer } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const data = await getVolunteerTasks(id)
  if (!data) return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

const ACTIONS = ['availability', 'verify', 'read_notifications'] as const

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(async () => {
    const b = await readJson(req)
    const action = oneOf(b.action ?? 'availability', 'action', ACTIONS)
    if (action === 'verify') return verifyVolunteer(id, DEMO_OFFICER)
    if (action === 'read_notifications') return markNotificationsRead(`volunteer:${id}`)
    return setVolunteerAvailability(id, b.available === true)
  })
}
