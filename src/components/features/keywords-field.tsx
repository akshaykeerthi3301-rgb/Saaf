'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

/**
 * The candidate's own words for what they care about — "payments", "B2B SaaS",
 * "Kubernetes" — as removable chips.
 *
 * ⚠️ THE COPY BELOW SAYS "BOOST", NOT "FILTER", AND THAT IS THE FEATURE. Every
 * other product in this category treats keywords as a narrowing control, and a
 * candidate who has used one will assume the same here. Saying it plainly is
 * the difference between a candidate adding three keywords and a candidate
 * adding none because they are afraid of hiding something.
 *
 * It matters most for exactly the people the index serves worst: an HR
 * candidate matches 15 roles in total, and a keyword filter would leave them
 * with two. Ranking hides nothing — that is the Stage A lock applied to a
 * feature that would otherwise be a gate.
 *
 * Deliberately the same interaction as SkillsField rather than a new pattern:
 * a candidate has already learned it two screens earlier.
 */
export function KeywordsField({
  keywords,
  onChange,
}: {
  keywords: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (!keywords.some((k) => k.toLowerCase() === v.toLowerCase())) onChange([...keywords, v])
    setDraft('')
  }

  return (
    <div>
      <label htmlFor="keywords" className="text-sm font-medium text-primary">
        What do you care about?{' '}
        <span className="font-normal text-muted-foreground">— optional</span>
      </label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Words that matter to you: a product area, an industry, a technology. A role
        naming them <strong className="font-semibold text-primary">ranks higher</strong> —
        nothing is hidden, and a role matching none of them still appears.
      </p>

      {keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-primary"
            >
              {k}
              <button
                type="button"
                onClick={() => onChange(keywords.filter((x) => x !== k))}
                aria-label={`Remove ${k}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          id="keywords"
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
          placeholder="payments, fintech, B2B SaaS…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // A word typed and left behind (the next click is Save) used to vanish: it was never added.
          onBlur={add}
          onKeyDown={(e) => {
            // Enter must not submit the surrounding form — this is one field in
            // a longer profile, and losing the rest to a stray keystroke is a
            // far worse outcome than an unadded keyword.
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-foreground/30 hover:bg-secondary/60 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
