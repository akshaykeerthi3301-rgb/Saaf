'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileDown, Loader2, ShieldCheck, X } from 'lucide-react'
import { Sheet, SheetClose, SheetTitle } from '@/components/ui/sheet'
import { ResumePaper } from '@/components/features/resume-paper'
import { ResumeStyleControls } from '@/components/features/resume-style-controls'
import { buildDoc } from '@/lib/resume-doc'
import { PAGE, type ResumeStyle } from '@/lib/resume-style'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * "Export résumé": the controls on the left, the page on the right, and the two ways to take it away — the reference
 * product's export drawer, with the live paginated preview it has.
 *
 * Word is a real .docx built on the server from the same blocks and style (src/lib/resume-docx.ts). PDF is the page
 * itself, printed: the browser's own "Save as PDF" gives real selectable text, every glyph (₹ included) and exactly
 * the page that is on screen — which is why it is not a separate PDF writer that would have to be kept identical.
 */
export function ExportDrawer({
  open, onOpenChange, sections, targetRole, style, onStyle, fileName, onWord, busy, note,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  sections: ResumeSections
  targetRole: string
  style: ResumeStyle
  onStyle: (s: ResumeStyle) => void
  /** Without extension. Also the title while printing, which is what the browser names the PDF after. */
  fileName: string
  onWord: () => void
  busy: boolean
  note?: string
}) {
  const blocks = useMemo(() => buildDoc(sections, targetRole, style), [sections, targetRole, style])
  const [pages, setPages] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const paperW = PAGE[style.page].widthIn * 96

  // Fit the page to the column it sits in, never larger than life.
  useEffect(() => {
    const el = box.current
    if (!open || !el) return
    const fit = () => setScale(Math.min(1, (el.clientWidth - 32) / paperW))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, paperW])

  function printPdf() {
    const previous = document.title
    document.title = fileName
    document.body.classList.add('printing-resume')
    window.addEventListener('afterprint', () => { document.title = previous; document.body.classList.remove('printing-resume') }, { once: true })
    window.print()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} trigger={<></>} wide>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5 print:hidden">
        <SheetClose aria-label="Close" className="rounded-lg border border-border p-2 text-primary hover:bg-secondary"><X className="size-4" /></SheetClose>
        <SheetTitle className="text-lg font-semibold tracking-[-0.03em] text-primary">Export résumé</SheetTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-score-high/15 px-3 py-1 text-xs font-semibold text-score-high">
          <ShieldCheck className="size-3.5" aria-hidden="true" /> ATS-friendly format
        </span>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[400px_1fr]">
        <div className="flex min-h-0 flex-col border-border bg-background print:hidden lg:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ResumeStyleControls style={style} onChange={onStyle} />
          </div>
          <div className="space-y-2 border-t border-border bg-card p-4">
            {note ? <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">{note}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={printPdf} className="bg-brand-gradient inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold">
                <FileDown className="size-4" /> Download PDF
              </button>
              <button type="button" onClick={onWord} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-60">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download Word
              </button>
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">PDF opens your browser&rsquo;s print box — choose &ldquo;Save as PDF&rdquo;. It keeps the text selectable, so an ATS can read it.</p>
          </div>
        </div>

        <div ref={box} data-resume-print-root className="relative min-h-0 overflow-y-auto bg-secondary/40 p-4">
          {/* `zoom`, not a transform: a transform leaves the unscaled height behind as blank scroll. */}
          <div data-resume-scale style={{ zoom: scale, width: paperW }} className="mx-auto">
            <ResumePaper blocks={blocks} style={style} onPages={setPages} />
          </div>
          <p className="pointer-events-none sticky bottom-3 mx-auto mt-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground print:hidden" aria-live="polite">
            {pages} {pages === 1 ? 'page' : 'pages'}
          </p>
        </div>
      </div>
    </Sheet>
  )
}
