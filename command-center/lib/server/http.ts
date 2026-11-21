import 'server-only'
import { NextResponse } from 'next/server'
import { ActionError } from './store'

export const DEMO_OFFICER = 'Demo officer'

export function handle(fn: () => unknown | Promise<unknown>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => NextResponse.json(data ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } }))
    .catch((err: unknown) => {
      if (err instanceof ActionError) return NextResponse.json({ error: err.message }, { status: err.status })
      console.error('[jalrakshak] action failed', err)
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    })
}

export async function readJson(req: Request, maxBytes = 8000): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > maxBytes) throw new ActionError('Request too large', 413)
  try {
    const v = JSON.parse(text)
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error()
    return v
  } catch {
    throw new ActionError('Invalid JSON body')
  }
}

export function str(v: unknown, field: string, { max = 500, required = true } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ActionError(`${field} is required`)
    return ''
  }
  if (typeof v !== 'string') throw new ActionError(`${field} must be text`)
  const s = v.trim()
  if (s.length > max) throw new ActionError(`${field} is too long (max ${max} characters)`)
  return s
}

export function int(v: unknown, field: string, min: number, max: number) {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new ActionError(`${field} must be a whole number from ${min} to ${max}`)
  return n
}

export function oneOf<T extends string>(v: unknown, field: string, options: readonly T[]): T {
  if (typeof v !== 'string' || !options.includes(v as T)) throw new ActionError(`Invalid ${field}`)
  return v as T
}

export function clientKey(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}
