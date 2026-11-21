import { DEMO_OFFICER, handle, oneOf, readJson, str } from '@/lib/server/http'
import {
  assignVolunteer,
  completeReport,
  getMatches,
  rejectReport,
  reserveShelter,
  resolveDuplicate,
  reviewReport,
  setPriority,
} from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(() => getMatches(id))
}

const ACTIONS = [
  'review',
  'reject',
  'set_priority',
  'reserve_shelter',
  'assign_volunteer',
  'complete',
  'link_duplicate',
  'dismiss_duplicate',
] as const
const PRIORITIES = ['life_threatening', 'urgent', 'elevated', 'routine'] as const

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(async () => {
    const b = await readJson(req)
    const action = oneOf(b.action, 'action', ACTIONS)
    switch (action) {
      case 'review':
        return reviewReport(id, DEMO_OFFICER)
      case 'reject':
        return rejectReport(id, str(b.reason, 'Reason', { max: 200 }), DEMO_OFFICER)
      case 'set_priority':
        return setPriority(id, oneOf(b.priority, 'priority', PRIORITIES), DEMO_OFFICER)
      case 'reserve_shelter':
        return reserveShelter(id, str(b.shelterId, 'Shelter', { max: 20 }), DEMO_OFFICER)
      case 'assign_volunteer':
        return assignVolunteer(id, str(b.volunteerId, 'Volunteer', { max: 40 }), DEMO_OFFICER)
      case 'complete':
        return completeReport(id, DEMO_OFFICER)
      case 'link_duplicate':
        return resolveDuplicate(id, str(b.candidateId, 'Candidate', { max: 30 }), true, DEMO_OFFICER)
      case 'dismiss_duplicate':
        return resolveDuplicate(id, str(b.candidateId, 'Candidate', { max: 30 }), false, DEMO_OFFICER)
    }
  })
}
