'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { quickApplyRole } from '@/app/actions/applications'
import { STAGE_LABEL } from '@/lib/job-facts'
import { useTrackedStage } from '@/components/features/feed-selection'

/**
 * Quick Apply — open the employer's form and move the role to Applying.
 *
 * ⚠️ JOBINKO DOES NOT SUBMIT ANYTHING. Permanent decision (PROJECT-STATE, "Never
 * applies on the candidate's behalf"). "Quick" is the two steps it removes:
 * finding the form, and filing the role on the tracker. On an Easy Apply host
 * the browser extension fills the form; the candidate reads it and presses send.
 *
 * The window opens first and synchronously, inside the click, so popup
 * blockers allow it; the tracker write follows (quickApplyRole): it files the
 * role and moves a Saved one to Applying. Until migration 0028 is applied the
 * move is refused and it stays Saved — the label says which stage it is in.
 */
export function QuickApply({
  roleId, company, title, applyUrl, easy, size = 'sm',
}: {
  roleId: string
  company: string
  title: string
  applyUrl: string
  easy: boolean
  size?: 'sm' | 'lg'
}) {
  const [stage, setStage] = useState<string | 'error' | null>(null)
  const [, setShared] = useTrackedStage(roleId)

  async function go() {
    window.open(applyUrl, '_blank', 'noopener,noreferrer')
    const res = await quickApplyRole({ roleId, company, title, applyUrl }).catch(() => ({ ok: false as const }))
    setStage(res.ok ? res.status : 'error')
    if (res.ok) setShared(res.status)
  }

  const label =
    stage === 'error' ? 'Opened — not tracked'
    : stage ? `Opened · ${STAGE_LABEL[stage] ?? stage}`
    : easy ? 'Quick Apply' : 'Apply on site'

  return (
    <button
      type="button"
      onClick={go}
      title={
        easy
          ? 'Opens the one-page application form. Jobinko’s extension can fill it; you review and press submit.'
          : 'Opens the employer’s application site. It may ask you to create an account first.'
      }
      className={`bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl font-semibold shadow-sm transition hover:opacity-90 ${
        size === 'lg' ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs'
      }`}
    >
      <Zap className="size-3.5" />
      {label}
    </button>
  )
}
