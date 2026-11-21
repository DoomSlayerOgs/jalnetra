import useSWR from 'swr'
import type { CommandState } from './types'

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

/** Shared operational state, polled so citizen, officer and volunteer tabs stay in sync. */
export function useCommandState() {
  return useSWR<CommandState>('/api/state', fetcher, { refreshInterval: 2500, revalidateOnFocus: true })
}

export const btn = {
  base: 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-border bg-panel-2/60 text-foreground hover:bg-panel-2',
  ghost: 'text-muted-foreground hover:bg-panel-2 hover:text-foreground',
  danger: 'bg-critical text-white hover:bg-critical/90',
  ok: 'bg-ok text-[#04210f] hover:bg-ok/90',
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
}
