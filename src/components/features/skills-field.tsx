'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  skills: string[]
  onChange: (skills: string[]) => void
  /** True when a model read these, so provenance can be stated honestly. */
  fromResume?: boolean
}

/**
 * Skills, shown as removable chips.
 *
 * This screen is the containment for the model that read them. A skill the
 * model invented has to be visible and one tap from gone, or "the candidate
 * confirms every field" is a claim rather than a mechanism — and the skills
 * here go straight into the match score, so a wrong one moves real rankings.
 */
export function SkillsField({ skills, onChange, fromResume }: Props) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (!skills.some((s) => s.toLowerCase() === v.toLowerCase())) onChange([...skills, v])
    setDraft('')
  }

  return (
    <div className="mb-6">
      <label htmlFor="skill-add" className="mb-2 block text-sm font-semibold text-primary">
        Skills
        {fromResume ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            from your résumé — remove anything that isn&apos;t yours
          </span>
        ) : null}
      </label>

      {skills.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(skills.filter((x) => x !== s))}
                aria-label={`Remove ${s}`}
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          id="skill-add"
          value={draft}
          placeholder="Add a skill"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className="min-w-0 flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-primary transition-colors hover:border-foreground/30 hover:bg-secondary/60"
        >
          Add
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Roles naming these score higher.</p>
    </div>
  )
}
