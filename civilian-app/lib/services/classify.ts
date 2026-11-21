import type { Priority, ReportCategory, Skill } from '../types'

const PRIORITY_ORDER: Priority[] = ['routine', 'elevated', 'urgent', 'life_threatening']

const BASE: Record<ReportCategory, { priority: Priority; skills: Skill[] }> = {
  trapped: { priority: 'life_threatening', skills: ['water_rescue'] },
  medical: { priority: 'urgent', skills: ['first_aid'] },
  mobility: { priority: 'urgent', skills: ['mobility_assist'] },
  water_entering: { priority: 'elevated', skills: ['general'] },
  shelter: { priority: 'elevated', skills: ['transport'] },
  waterlogging: { priority: 'routine', skills: [] },
}

const KEYWORD_RULES: { words: string[]; priority: Priority; skill?: Skill; note: string }[] = [
  { words: ['trapped', 'stuck', 'drowning', 'roof', 'neck deep', 'chest deep'], priority: 'life_threatening', skill: 'water_rescue', note: 'Text suggests people may be trapped by water' },
  { words: ['unconscious', 'bleeding', 'not breathing', 'heart', 'chest pain', 'dialysis', 'pregnant', 'labour', 'labor'], priority: 'urgent', skill: 'first_aid', note: 'Text mentions a medical need' },
  { words: ['cannot walk', "can't walk", 'wheelchair', 'bedridden', 'elderly', 'disabled', 'old father', 'old mother'], priority: 'urgent', skill: 'mobility_assist', note: 'Text mentions someone who needs help moving' },
  { words: ['baby', 'infant', 'children', 'kids'], priority: 'elevated', note: 'Children are present' },
]

const maxPriority = (a: Priority, b: Priority) =>
  PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b

export type ClassificationInput = {
  category: ReportCategory
  description: string
  needsMobility: boolean
  needsMedical: boolean
  hasChildren: boolean
  partySize: number
}

/**
 * Deterministic rule-based classifier. Works with no AI key. Rules can only raise
 * priority, never lower what the citizen explicitly selected.
 */
export function classifyReport(input: ClassificationInput) {
  const base = BASE[input.category]
  let priority = base.priority
  const skills = new Set<Skill>(base.skills)
  const notes: string[] = [`Category selected by citizen: ${input.category.replace('_', ' ')}`]
  const text = input.description.toLowerCase()

  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => text.includes(w))) {
      priority = maxPriority(priority, rule.priority)
      if (rule.skill) skills.add(rule.skill)
      notes.push(rule.note)
    }
  }
  if (input.needsMobility) {
    priority = maxPriority(priority, 'urgent')
    skills.add('mobility_assist')
    notes.push('Citizen indicated mobility assistance is needed')
  }
  if (input.needsMedical) {
    priority = maxPriority(priority, 'urgent')
    skills.add('first_aid')
    notes.push('Citizen indicated medical assistance is needed')
  }
  if (input.hasChildren) priority = maxPriority(priority, 'elevated')
  if (input.partySize >= 5 && input.category !== 'waterlogging') {
    priority = maxPriority(priority, 'elevated')
    notes.push(`Large party (${input.partySize} people)`)
  }
  if (skills.size > 1) skills.delete('general')

  return { priority, requiredSkills: [...skills], notes }
}

export function priorityRank(p: Priority) {
  return PRIORITY_ORDER.indexOf(p)
}
