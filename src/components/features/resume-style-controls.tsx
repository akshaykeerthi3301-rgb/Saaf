'use client'

import { useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  ACCENT_SWATCHES, DEFAULT_INK_HEX, FONT_FAMILIES, PAGE, PRESETS, presetStyle, withPreset,
  type AccentScope, type DateFormat, type PageSize, type ResumeStyle,
} from '@/lib/resume-style'

/**
 * Every control of the export drawer, as one panel — the reference product's "Export Resume" controls, in the order it
 * lays them out: template, accent colour, font, content style, layout, spacing & margin, reset.
 *
 * Controlled: it takes a ResumeStyle and returns the next one. It owns no state, so the same panel can sit in the
 * export drawer and, later, in the tailor result's own Style tab.
 *
 * What is not here, on purpose: the reference's "Structured" template (section names in a left sidebar) and its
 * two-column skills grid. Both are layouts our own ATS checker marks down, and this panel's badge says ATS-friendly.
 */

const box = 'rounded-2xl border border-border bg-card p-4'
const label = 'text-xs font-semibold text-muted-foreground'
const select = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={box}>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}

function Field({ name, children }: { name: string; children: ReactNode }) {
  return <label className="block"><span className={label}>{name}</span><span className="mt-1.5 block">{children}</span></label>
}

function Seg<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { id: T; name: ReactNode }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="group" aria-label={ariaLabel} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${value === o.id ? 'bg-card text-primary shadow-sm ring-1 ring-accent' : 'text-muted-foreground hover:text-primary'}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  )
}

function Switch({ checked, onChange, name }: { checked: boolean; onChange: (v: boolean) => void; name: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium text-primary">{name}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-secondary'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </label>
  )
}


/** The hex box keeps what is being typed and commits only a whole colour (six digits) or an empty box. */
function HexField({ value, onCommit }: { value: string; onCommit: (hex: string) => void }) {
  const [text, setText] = useState(value ? `#${value}` : '')
  return (
    <input
      aria-label="Hex colour"
      value={text}
      placeholder="Hex colour"
      maxLength={7}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const v = raw.replace('#', '')
        if (v === '') onCommit('')
        else if (/^[0-9a-fA-F]{6}$/.test(v)) onCommit(v.toUpperCase())
      }}
      className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none"
    />
  )
}

const SIZES = {
  name: [16, 17, 18, 19, 20, 22, 24, 26, 28],
  section: [9, 10, 10.5, 11, 11.5, 12, 13, 14],
  sub: [9, 9.5, 10, 10.5, 11, 12],
  body: [8, 8.5, 9, 9.5, 10, 10.5, 11, 12],
}

const SLIDERS: { key: keyof ResumeStyle['spacing']; name: string }[] = [
  { key: 'section', name: 'Section spacing' },
  { key: 'entry', name: 'Entry spacing' },
  { key: 'line', name: 'Line spacing' },
  { key: 'marginY', name: 'Top & bottom margin' },
  { key: 'marginX', name: 'Side margins' },
]

/** A little drawing of what the template does, so the card is a choice rather than a word. */
function Thumb({ centered, compact }: { centered: boolean; compact: boolean }) {
  const bar = 'h-[3px] rounded-full bg-border'
  return (
    <div className="flex h-24 w-full flex-col gap-1.5 rounded-lg border border-border bg-paper p-2" aria-hidden="true">
      <div className={`${bar} h-1 w-2/5 bg-paper-ink/60 ${centered ? 'self-center' : ''}`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}>
          <div className={`${bar} w-1/3 bg-paper-ink/40 ${centered ? 'self-center' : ''}`} />
          <div className={`${bar} w-full`} />
          <div className={`${bar} w-5/6`} />
        </div>
      ))}
    </div>
  )
}

export function ResumeStyleControls({ style, onChange }: { style: ResumeStyle; onChange: (s: ResumeStyle) => void }) {
  const set = (patch: Partial<ResumeStyle>) => onChange({ ...style, ...patch })
  const size = (k: keyof ResumeStyle['sizes'], v: number) => onChange({ ...style, sizes: { ...style.sizes, [k]: v } })

  return (
    <div className="space-y-3">
      <Section title="ATS-friendly résumé template">
        <Field name="Page size">
          <select className={select} value={style.page} onChange={(e) => set({ page: e.target.value as PageSize })}>
            {(Object.keys(PAGE) as PageSize[]).map((k) => <option key={k} value={k}>{PAGE[k].label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Template">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={style.preset === p.id}
              title={p.note}
              onClick={() => onChange(withPreset(style, p.id))}
              className={`rounded-xl border p-1.5 text-center transition-colors ${style.preset === p.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
            >
              <Thumb centered={p.id === 'centered'} compact={p.id === 'compact'} />
              <span className="mt-1.5 block text-xs font-semibold text-primary">{p.name}</span>
              {p.id === 'standard' ? <span className="block text-[10px] font-semibold text-accent">Recommended</span> : null}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Accent colour">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Accent colour">
          {ACCENT_SWATCHES.map((c) => (
            <button
              key={c.name}
              type="button"
              aria-label={c.name}
              aria-pressed={style.accent.toLowerCase() === c.hex.toLowerCase()}
              title={c.name}
              onClick={() => set({ accent: c.hex })}
              style={{ backgroundColor: c.hex ? `#${c.hex}` : 'var(--color-paper-ink)' }}
              className={`size-7 rounded-full border-2 transition ${style.accent.toLowerCase() === c.hex.toLowerCase() ? 'border-accent ring-2 ring-accent/40' : 'border-border'}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field name="Colour">
            <span className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
              <input
                type="color"
                aria-label="Pick a colour"
                value={`#${style.accent || DEFAULT_INK_HEX}`}
                onChange={(e) => set({ accent: e.target.value.replace('#', '').toUpperCase() })}
                className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <HexField key={style.accent} value={style.accent} onCommit={(v) => set({ accent: v })} />
            </span>
          </Field>
          <Field name="Applies to">
            <select className={select} value={style.accentScope} onChange={(e) => set({ accentScope: e.target.value as AccentScope })}>
              <option value="headings">All headings</option>
              <option value="name">Name only</option>
              <option value="both">Name and headings</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Font">
        <Field name="Font family">
          <select className={select} value={style.font} onChange={(e) => set({ font: e.target.value as ResumeStyle['font'] })}>
            {FONT_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {([['name', 'Name'], ['section', 'Section headers'], ['sub', 'Sub-headers'], ['body', 'Body text']] as const).map(([k, n]) => (
            <Field key={k} name={n}>
              <select className={select} value={style.sizes[k]} onChange={(e) => size(k, Number(e.target.value))}>
                {[...new Set([...SIZES[k], style.sizes[k]])].sort((a, b) => a - b).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Content style">
        <Field name="Date format">
          <select className={select} value={style.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as DateFormat })}>
            <option value="short">Short month name (Jan 2025)</option>
            <option value="long">Full month name (January 2025)</option>
            <option value="numeric">Numbers (01/2025)</option>
            <option value="year">Year only (2025)</option>
          </select>
        </Field>
        <Field name="Bullet icon">
          <Seg ariaLabel="Bullet icon" value={style.bullet} onChange={(v) => set({ bullet: v })} options={[{ id: '•', name: '•' }, { id: '–', name: '–' }]} />
        </Field>
        <Switch name="Hide divider" checked={style.hideDivider} onChange={(v) => set({ hideDivider: v })} />
      </Section>

      <Section title="Layout">
        <Field name="Header alignment">
          <Seg ariaLabel="Header alignment" value={style.headerAlign} onChange={(v) => set({ headerAlign: v })} options={[{ id: 'left', name: 'Left' }, { id: 'center', name: 'Center' }, { id: 'right', name: 'Right' }]} />
        </Field>
        <Field name="Show education by">
          <Seg
            ariaLabel="Education order"
            value={style.educationFirst}
            onChange={(v) => set({ educationFirst: v })}
            options={[{ id: 'degree', name: 'Degree first' }, { id: 'institution', name: 'Institution first' }]}
          />
        </Field>
        <Field name="Skills layout">
          <Seg ariaLabel="Skills layout" value={style.skillsLayout} onChange={(v) => set({ skillsLayout: v })} options={[{ id: 'inline', name: 'One line' }, { id: 'list', name: 'Bulleted list' }]} />
        </Field>
      </Section>

      <Section title="Spacing & margin">
        {SLIDERS.map(({ key, name }) => (
          <label key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3">
            <span className="text-sm text-primary">{name}</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={style.spacing[key]}
              aria-label={name}
              onChange={(e) => onChange({ ...style, spacing: { ...style.spacing, [key]: Number(e.target.value) } })}
              className="w-full accent-[var(--color-accent)]"
            />
          </label>
        ))}
        <Switch name="Align text left & right" checked={style.justify} onChange={(v) => set({ justify: v })} />
      </Section>

      <button
        type="button"
        onClick={() => onChange(presetStyle(style.preset))}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <RotateCcw className="size-4" /> Reset formatting
      </button>
    </div>
  )
}
