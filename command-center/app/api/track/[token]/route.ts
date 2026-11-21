import { NextResponse } from 'next/server'
import { getTracking } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const view = await getTracking(token)
  if (!view) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  return NextResponse.json(view, { headers: { 'Cache-Control': 'no-store' } })
}
