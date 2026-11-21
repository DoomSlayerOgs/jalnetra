import 'server-only'
import { neon } from '@neondatabase/serverless'

/**
 * Whole-state document persistence with optimistic concurrency.
 * Every write loads the current version, applies a synchronous mutation, and saves
 * with `WHERE version = expected`. A concurrent write makes the save fail and the
 * caller retries on fresh data, so capacity and assignment checks never race.
 */

export type StorageMode = 'neon' | 'memory'

const url = process.env.DATABASE_URL
export const storageMode: StorageMode = url ? 'neon' : 'memory'

const sql = url ? neon(url) : null

type Snapshot<T> = { data: T; version: number }

const mem = globalThis as unknown as { __jrMem?: Snapshot<unknown> }

let ready: Promise<void> | null = null
function ensureTable() {
  if (!sql) return Promise.resolve()
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS jr_state (
      id integer PRIMARY KEY,
      version integer NOT NULL,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    .then(() => undefined)
    .catch((err) => {
      ready = null
      throw err
    })
  return ready
}

export async function loadSnapshot<T>(seed: () => T): Promise<Snapshot<T>> {
  if (!sql) {
    mem.__jrMem ??= { data: seed(), version: 1 }
    return structuredClone(mem.__jrMem) as Snapshot<T>
  }
  await ensureTable()
  let rows = (await sql`SELECT data, version FROM jr_state WHERE id = 1`) as { data: T; version: number }[]
  if (rows.length === 0) {
    await sql`INSERT INTO jr_state (id, version, data) VALUES (1, 1, ${JSON.stringify(seed())}::jsonb) ON CONFLICT (id) DO NOTHING`
    rows = (await sql`SELECT data, version FROM jr_state WHERE id = 1`) as { data: T; version: number }[]
  }
  return { data: rows[0].data, version: rows[0].version }
}

/** Returns false when another writer saved first (caller should retry). */
export async function saveSnapshot<T>(data: T, expectedVersion: number): Promise<boolean> {
  if (!sql) {
    if (!mem.__jrMem || mem.__jrMem.version !== expectedVersion) return false
    mem.__jrMem = { data: structuredClone(data), version: expectedVersion + 1 }
    return true
  }
  const rows = await sql`
    UPDATE jr_state SET data = ${JSON.stringify(data)}::jsonb, version = version + 1, updated_at = now()
    WHERE id = 1 AND version = ${expectedVersion}
    RETURNING version`
  return rows.length === 1
}

export async function replaceSnapshot<T>(data: T) {
  if (!sql) {
    mem.__jrMem = { data: structuredClone(data), version: (mem.__jrMem?.version ?? 0) + 1 }
    return
  }
  await ensureTable()
  await sql`
    INSERT INTO jr_state (id, version, data) VALUES (1, 1, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = jr_state.version + 1, updated_at = now()`
}
