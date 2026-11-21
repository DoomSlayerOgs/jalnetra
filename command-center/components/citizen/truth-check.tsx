'use client'

import { useState } from 'react'
import { CircleCheck, CircleHelp, CircleX, Loader2 } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { btn, postJson } from '@/lib/client'
import type { TruthCheckResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Lang } from './i18n'

const EXAMPLES = [
  'Powai lake dam has burst, everyone in Kurla must evacuate immediately!!',
  'Shelter open at Andheri sports complex with drinking water',
  'Local trains on the Harbour line are suspended due to waterlogging',
]

const VERDICT = {
  supported: { icon: CircleCheck, title: 'Matches a published advisory', cls: 'border-ok/40 bg-ok/10 text-ok' },
  contradicted: { icon: CircleX, title: 'Contradicted by a published advisory', cls: 'border-critical/40 bg-critical/10 text-critical' },
  unverified: { icon: CircleHelp, title: 'Could not verify', cls: 'border-unknown/50 bg-unknown/15 text-slate-300' },
}

export function TruthCheck(_: { lang: Lang }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<TruthCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResult(await postJson<TruthCheckResult>('/api/truth-check', { text }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const v = result ? VERDICT[result.verdict] : null
  return (
    <div className="grid gap-4">
      <form onSubmit={check} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Paste the message you received
          <textarea required value={text} maxLength={1000} rows={4} onChange={(e) => setText(e.target.value)} className="rounded-lg border border-border bg-panel p-3 text-base" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-xs text-muted-foreground">Try a fictional example:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-md border border-border bg-panel px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground">
              {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
            </button>
          ))}
        </div>
        <button type="submit" disabled={!text.trim() || loading} className={cn(btn.base, btn.primary, btn.lg)}>
          {loading && <Loader2 className="size-5 animate-spin" aria-hidden="true" />} Check message
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-critical">{error}</p>}
      {result && v && (
        <section aria-live="polite" className={cn('rounded-xl border p-4', v.cls)}>
          <h2 className="flex items-center gap-2 font-semibold">
            <v.icon className="size-5" aria-hidden="true" /> {v.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{result.explanation}</p>
          {result.advisory && (
            <blockquote className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground">
              <p className="font-medium">{result.advisory.title}</p>
              <p className="mt-1 text-muted-foreground">{result.advisory.excerpt}</p>
              <footer className="mt-2 flex flex-wrap gap-1.5">
                <Tag>{result.advisory.publisher}</Tag>
                <Tag>{new Date(result.advisory.publishedAt).toLocaleString('en-IN')}</Tag>
                {result.advisory.isDemo && <Tag tone="warn">Fictional demo advisory</Tag>}
              </footer>
            </blockquote>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            This check compares wording with a small set of advisories. It is not proof. Do not forward unverified messages.
          </p>
        </section>
      )}
    </div>
  )
}
