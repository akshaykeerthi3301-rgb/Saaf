import { roleLine, type ResumeSections } from '@/lib/parse/sections'
import { templateSpec, type TemplateId, type TemplateSpec } from '@/lib/resume-templates'

/**
 * The optimised résumé, as the candidate will receive it.
 *
 * ⚠️ IT IS A PREVIEW OF THE FILE, NOT A DIFFERENT DESIGN OF THE SAME CONTENT.
 * Every element here has a counterpart in buildFullResumeDocx(): centred name,
 * a contact line, ruled section headings, a real bullet list, one column. If
 * this screen and that document ever diverge, the download stops being a
 * preview and becomes a surprise — which on a résumé is the worst kind.
 *
 * ⚠️ DESIGNED, BUT ONLY FROM CONSTRUCTS THAT PARSE. The founder chose a styled
 * template over a plain one, and the constraint that makes that safe is narrow
 * and worth stating: the STYLING lives in this page's CSS, and the DOCUMENT is
 * built from text, headings and bullets alone. No tables, no columns, no text
 * boxes, no icons standing in for words, no text inside an image. Those five
 * are exactly what the checker on the previous screen flags, and a template
 * that failed our own check would end the product's argument in one screenshot.
 *
 * The typography does the work instead: a real hierarchy, a hairline under each
 * heading, generous leading, tabular contact details. That reads as considered
 * without asking a parser to understand a layout.
 */

/**
 * A section heading, in whichever of the three marks the template uses.
 *
 * All three are a real text heading — never an image, never a table cell, never
 * a coloured band drawn behind text. That is the whole difference between a
 * template that parses and one that looks like it should.
 */
function Rule({ label, spec }: { label: string; spec: TemplateSpec }) {
  // Compact is tighter, not cramped: at mt-4 the heading sat almost on the
  // paragraph above it, which reads as a rendering fault rather than a choice.
  const gap = spec.density === 'tight' ? 'mt-5 mb-2' : spec.density === 'airy' ? 'mt-8 mb-3' : 'mt-6 mb-2.5'

  if (spec.heading === 'ruled') {
    return (
      <div className={`flex items-center gap-3 first:mt-0 ${gap}`}>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-ink">{label}</h3>
        <span aria-hidden className="h-px flex-1 bg-paper-rule" />
      </div>
    )
  }
  if (spec.heading === 'caps') {
    return (
      <h3 className={`text-[10.5px] font-bold uppercase tracking-[0.2em] text-paper-muted first:mt-0 ${gap}`}>
        {label}
      </h3>
    )
  }
  return (
    <h3 className={`text-[13px] font-semibold tracking-[-0.01em] text-paper-ink first:mt-0 ${gap}`}>{label}</h3>
  )
}

export function ResumePreview({
  sections,
  targetRole,
  template,
}: {
  sections: ResumeSections
  targetRole?: string
  template?: TemplateId
}) {
  const spec = templateSpec(template)
  const contact = [sections.contact.email, sections.contact.phone, ...sections.contact.links].filter(
    Boolean,
  )

  return (
    <article
      /**
       * A4-ish proportions and a white ground even in dark mode: this is a
       * picture of a printed document, and inverting it would misrepresent what
       * downloads. The wrapper around it carries the page's own theme.
       */
      className={`mx-auto w-full max-w-[46rem] rounded-xl border border-paper-rule bg-paper text-paper-ink shadow-sm ${
        spec.density === 'tight'
          ? 'px-7 py-7 text-[12.5px] leading-[1.45] sm:px-10 sm:py-9'
          : spec.density === 'airy'
            ? 'px-8 py-11 text-[13.5px] leading-7 sm:px-14 sm:py-14'
            : 'px-8 py-9 text-[13px] leading-6 sm:px-12 sm:py-12'
      }`}
      aria-label="Preview of your optimised résumé"
    >
      <header className={spec.align === 'center' ? 'text-center' : 'text-left'}>
        <h2
          className={`font-semibold tracking-[-0.03em] text-paper-ink ${
            spec.density === 'airy' ? 'text-3xl' : spec.density === 'tight' ? 'text-xl' : 'text-2xl'
          }`}
        >
          {sections.contact.name ?? 'Your name'}
        </h2>
        {targetRole ? (
          <p className="mt-1 text-[12.5px] uppercase tracking-[0.14em] text-paper-muted">{targetRole}</p>
        ) : null}
        {contact.length > 0 ? (
          <p className="mt-2 text-[12.5px] text-paper-muted">{contact.join('  ·  ')}</p>
        ) : null}
      </header>

      <div className="mt-7">
        {sections.summary ? (
          <section>
            <Rule label="Professional summary" spec={spec} />
            <p>{sections.summary}</p>
          </section>
        ) : null}

        {sections.experience.length > 0 ? (
          <section>
            <Rule label="Experience" spec={spec} />
            <div className="flex flex-col gap-4">
              {sections.experience.map((e, i) => (
                <div key={`${e.employer ?? 'role'}-${i}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="font-semibold text-paper-ink">
                      {roleLine(e)}
                    </p>
                    {e.dates ? (
                      <p className="font-mono text-[11.5px] tabular-nums text-paper-muted">{e.dates}</p>
                    ) : null}
                  </div>
                  {e.location ? <p className="text-[12px] text-paper-muted">{e.location}</p> : null}
                  {e.bullets.length > 0 ? (
                    <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 marker:text-paper-rule">
                      {e.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sections.skills.length > 0 ? (
          <section>
            <Rule label="Skills" spec={spec} />
            {/*
              Deliberately a sentence rather than a row of pills. Pills are a
              CSS shape here and a table or a text box in a Word file, and a
              table is the second most common reason a skills section extracts
              as nothing at all.
            */}
            <p>{sections.skills.join('  ·  ')}</p>
          </section>
        ) : null}

        {sections.education.length > 0 ? (
          <section>
            <Rule label="Education" spec={spec} />
            <div className="flex flex-col gap-1">
              {sections.education.map((e, i) => (
                <p key={i}>
                  <span className="font-semibold text-paper-ink">{e.qualification}</span>
                  {[e.institution, e.dates].filter(Boolean).length ? (
                    <span className="text-paper-muted">
                      {'  ·  '}
                      {[e.institution, e.dates].filter(Boolean).join('  ·  ')}
                    </span>
                  ) : null}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {sections.other.map((o) => (
          <section key={o.heading}>
            <Rule label={o.heading} spec={spec} />
            <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-paper-rule">
              {o.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  )
}
