'use client'

import { useState } from 'react'

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
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <label htmlFor="skill-add" style={{
        display: 'block', fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
        letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
        color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-xs)',
      }}>
        Skills
        {fromResume ? (
          <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400, marginLeft: 8 }}>
            read from your résumé — remove anything that isn&apos;t yours
          </span>
        ) : null}
      </label>

      {skills.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
          {skills.map((s) => (
            <span key={s} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid var(--color-outline)', padding: '3px 6px 3px 10px',
              fontSize: 'var(--type-body-sm-size)',
            }}>
              {s}
              <button
                type="button"
                onClick={() => onChange(skills.filter((x) => x !== s))}
                aria-label={`Remove ${s}`}
                style={{
                  font: 'inherit', lineHeight: 1, cursor: 'pointer', padding: '2px 4px',
                  background: 'transparent', color: 'var(--color-on-surface-variant)',
                  border: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--space-xs)', maxWidth: 420 }}>
        <input
          id="skill-add"
          value={draft}
          placeholder="Add a skill"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          style={{
            flex: 1, height: 44, padding: '12px 14px',
            background: 'var(--color-surface)', color: 'var(--color-on-surface)',
            font: 'inherit', fontSize: 'var(--type-body-md-size)',
            border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-none)',
          }}
        />
        <button type="button" onClick={add} style={{
          font: 'inherit', fontSize: 'var(--type-body-md-size)', cursor: 'pointer',
          padding: '0 16px', background: 'transparent', color: 'var(--color-on-surface)',
          border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-none)',
        }}>
          Add
        </button>
      </div>

      <p style={{
        color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)',
        margin: 'var(--space-xs) 0 0',
      }}>
        Roles naming these score higher on your list.
      </p>
    </div>
  )
}
