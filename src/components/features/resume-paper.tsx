'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { DocBlock } from '@/lib/resume-doc'
import { PAGE, entryGapPt, fontFamily, lineMultiple, marginXIn, marginYIn, sectionGapPt, type ResumeStyle } from '@/lib/resume-style'

/**
 * The résumé as a page: the on-screen half of the one-block-list, two-renderers pair (the Word file is the other —
 * src/lib/resume-docx.ts). Sizes are in points and margins in inches, so the preview and the printed PDF are the same
 * document at 96 dpi.
 *
 * PRINTING. `window.print()` on a page that contains this element prints only the page: globals.css hides everything
 * else when <body> carries `printing-resume`, and the @page rule below (size and margins from the style) replaces the
 * paper's own padding, so margins repeat on every printed page rather than only the first.
 *
 * Colours come from tokens (`bg-paper`, `text-paper-ink`); only the person's own accent colour is inline, because it
 * is data, not design.
 */
export function ResumePaper({ blocks, style, onPages, decorate }: {
  blocks: DocBlock[]
  style: ResumeStyle
  onPages?: (pages: number) => void
  /** Marks a line on screen — the tailor result highlights what the rewrite changed. Never used when printing or exporting. */
  decorate?: (text: string) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const page = PAGE[style.page]
  const my = marginYIn(style.spacing.marginY)
  const mx = marginXIn(style.spacing.marginX)
  const line = lineMultiple(style.spacing.line)

  // How many printed pages this runs to: the content height over the page's usable height. Measured, not estimated.
  useEffect(() => {
    const el = ref.current
    if (!el || !onPages) return
    const usable = (page.heightIn - 2 * my) * 96
    const measure = () => onPages(Math.max(1, Math.ceil((el.scrollHeight - 2 * my * 96) / usable - 0.02)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [blocks, style, onPages, page.heightIn, my])

  const accent = style.accent ? `#${style.accent}` : undefined
  const nameColor = style.accentScope === 'headings' ? undefined : accent
  const headColor = style.accentScope === 'name' ? undefined : accent
  const al = style.justify ? 'justify' : 'left'
  const text = (size: number): CSSProperties => ({ fontSize: `${size}pt`, lineHeight: 1.15 * line })

  return (
    <>
      <style>{`@media print { @page { size: ${page.widthIn}in ${page.heightIn}in; margin: ${my}in ${mx}in } }`}</style>
      <div
        ref={ref}
        data-resume-paper
        className="resume-paper relative bg-paper text-paper-ink shadow-lg"
        style={{
          width: `${page.widthIn * 96}px`,
          minHeight: `${page.heightIn * 96}px`,
          padding: `${my}in ${mx}in`,
          fontFamily: fontFamily(style.font).css,
          ...text(style.sizes.body),
        }}
      >
        {blocks.map((b, i) => {
          switch (b.kind) {
            case 'name':
              return <h1 key={i} className="m-0 font-bold" style={{ ...text(style.sizes.name), textAlign: style.headerAlign, color: nameColor }}>{b.text}</h1>
            case 'contact':
              return <p key={i} className="m-0 mb-0.5" style={{ textAlign: style.headerAlign }}>{b.text}</p>
            case 'target':
              return <p key={i} className="m-0 mb-1 text-paper-muted" style={{ textAlign: style.headerAlign }}>{b.text}</p>
            case 'heading':
              return (
                <h2
                  key={i}
                  className="m-0 break-after-avoid font-bold uppercase"
                  style={{
                    ...text(style.sizes.section),
                    textAlign: style.headingAlign,
                    letterSpacing: '0.04em',
                    color: headColor,
                    marginTop: `${sectionGapPt(style.spacing.section)}pt`,
                    marginBottom: '3pt',
                    paddingBottom: '1.5pt',
                    borderBottom: style.hideDivider ? undefined : `1px solid ${headColor ?? 'var(--paper-rule)'}`,
                  }}
                >
                  {b.text}
                </h2>
              )
            case 'para':
              return <p key={i} className="m-0 mb-0.5" style={{ textAlign: al }}>{decorate ? decorate(b.text) : b.text}</p>
            case 'entry':
              return (
                <div key={i} className="break-inside-avoid break-after-avoid" style={{ marginTop: `${entryGapPt(style.spacing.entry)}pt` }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-bold" style={text(style.sizes.sub)}>{b.main}</span>
                    {b.right ? <span className="shrink-0">{b.right}</span> : null}
                  </div>
                  {b.sub ? <div className={b.subItalic ? 'italic' : undefined}>{b.sub}</div> : null}
                </div>
              )
            case 'bullet':
              return (
                <div key={i} className="flex break-inside-avoid gap-[0.6em]" style={{ textAlign: al, marginBottom: '1pt', paddingLeft: '0.7em' }}>
                  <span aria-hidden="true">{style.bullet}</span>
                  <span className="min-w-0 flex-1">{decorate ? decorate(b.text) : b.text}</span>
                </div>
              )
          }
        })}
      </div>
    </>
  )
}
