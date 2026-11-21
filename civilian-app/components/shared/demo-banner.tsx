import { TriangleAlert } from 'lucide-react'

export function DemoBanner() {
  return (
    <div
      role="note"
      className="relative z-20 flex items-center justify-center gap-2 border-b border-high/30 bg-high/10 px-4 py-1.5 text-center text-xs font-medium text-high"
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Demo Mode — not for emergency use. In an emergency call <strong>112</strong>. All data is fictional.
      </span>
    </div>
  )
}
