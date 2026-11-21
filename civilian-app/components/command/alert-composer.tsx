'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, Loader2 } from 'lucide-react'
import { Tag } from '@/components/shared/badges'
import { btn, postJson } from '@/lib/client'
import { DELIVERY_LABEL, timeAgo } from '@/lib/labels'
import type { Alert, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

const TEMPLATE = (ward: Ward) =>
  `Flood alert for ${ward.name} (${ward.code}): heavy rain and waterlogging reported. Avoid low-lying roads and subways. Move to higher floors if water enters. Request help at the citizen app or call 112.`

export function AlertComposer({ wards, defaultWardId, alerts, onSent }: { wards: Ward[]; defaultWardId: string; alerts: Alert[]; onSent: () => void }) {
  const [wardId, setWardId] = useState(defaultWardId)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ward = wards.find((w) => w.id === wardId)

  useEffect(() => {
    if (defaultWardId) setWardId(defaultWardId)
  }, [defaultWardId])

  async function send() {
    setSending(true)
    setError(null)
    try {
      const res = await postJson<{ recipients: unknown[] }>('/api/alerts', { wardId, message, confirm: true })
      setPreview(false)
      setMessage('')
      onSent()
      toast.success(`Alert sent to ${ward?.code} ${ward?.name}`, { description: `${res.recipients?.length ?? 0} demo recipients · simulated SMS` })
    } catch (e) {
      setError((e as Error).message)
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const recent = alerts.slice(0, 3)

  return (
    <section aria-labelledby="alert-h" className="rounded-xl border border-border bg-panel p-4">
      <h2 id="alert-h" className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-high" aria-hidden="true" /> Targeted ward alert</h2>
      {!preview ? (
        <div className="mt-3 grid gap-3 text-sm">
          <label className="grid gap-1">
            Ward
            <select value={wardId} onChange={(e) => setWardId(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2">
              <option value="">Choose ward…</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{`${w.code} — ${w.name}`}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="flex justify-between">Message <span className="text-muted-foreground">{message.length}/320</span></span>
            <textarea value={message} maxLength={320} rows={4} onChange={(e) => setMessage(e.target.value)} className="rounded-lg border border-border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!ward} onClick={() => ward && setMessage(TEMPLATE(ward))} className={cn(btn.base, btn.ghost, btn.sm)}>Use template</button>
            <button type="button" disabled={!ward || message.trim().length < 10} onClick={() => setPreview(true)} className={cn(btn.base, btn.outline, btn.sm, 'ml-auto')}>Preview</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 text-sm">
          <div className="rounded-lg border border-high/40 bg-high/10 p-3">
            <p className="text-xs text-muted-foreground">To: residents and contacts in {ward?.code} {ward?.name} only</p>
            <p className="mt-1 leading-relaxed">{message}</p>
          </div>
          <p className="text-xs text-muted-foreground">Delivery is simulated in demo mode — no real SMS is sent.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreview(false)} className={cn(btn.base, btn.ghost, btn.sm)}>Edit</button>
            <button type="button" disabled={sending} onClick={send} className={cn(btn.base, btn.primary, btn.sm, 'ml-auto')}>
              {sending && <Loader2 className="size-3 animate-spin" aria-hidden="true" />} Confirm and send
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-critical">{error}</p>}
      {recent.length > 0 && (
        <ul className="mt-4 grid gap-2 border-t border-border pt-3 text-xs">
          {recent.map((a) => (
            <li key={a.id}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{wards.find((w) => w.id === a.wardId)?.code}</span>
                <Tag>{DELIVERY_LABEL[a.status]}</Tag>
                <span className="text-muted-foreground">{a.recipientCount} recipients · {timeAgo(a.createdAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-muted-foreground">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
