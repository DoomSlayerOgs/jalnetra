import { clientKey, handle, readJson, str } from '@/lib/server/http'
import { ActionError, rateLimit, registerVolunteer } from '@/lib/server/store'
import type { Skill } from '@/lib/types'

const SKILLS: Skill[] = ['water_rescue', 'first_aid', 'mobility_assist', 'transport', 'general']

export function POST(req: Request) {
  return handle(async () => {
    rateLimit(`vreg:${clientKey(req)}`, 4)
    const b = await readJson(req)
    const phone = str(b.phone, 'Phone', { max: 20 })
    if (!/^[+\d\s-]{6,20}$/.test(phone)) throw new ActionError('Please enter a valid phone number')
    const raw = Array.isArray(b.skills) ? b.skills : []
    const skills = SKILLS.filter((s) => raw.includes(s))
    if (skills.length === 0) throw new ActionError('Select at least one skill')
    return registerVolunteer({
      displayName: str(b.displayName, 'Name', { max: 60 }),
      phone,
      wardId: str(b.wardId, 'Ward', { max: 10 }),
      skills,
    })
  })
}
