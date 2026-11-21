'use client'

import { useSyncExternalStore } from 'react'

/**
 * Remembers the private tracking links of requests made on this device only,
 * so a citizen can come back to them. The request data itself lives on the server.
 */
export type SavedRequest = { token: string; reference: string; createdAt: string }

const KEY = 'jalrakshak:my-requests'
const listeners = new Set<() => void>()
let cache: SavedRequest[] | null = null

function read(): SavedRequest[] {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.token === 'string') : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: SavedRequest[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  listeners.forEach((l) => l())
}

const EMPTY: SavedRequest[] = []

export function useMyRequests() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => EMPTY,
  )
  return {
    list,
    add: (r: SavedRequest) => write([r, ...read().filter((x) => x.token !== r.token)].slice(0, 20)),
    remove: (token: string) => write(read().filter((x) => x.token !== token)),
  }
}
