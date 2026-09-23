'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { ScoredRoleOption } from '@/lib/services/cookie'

/**
 * A select bound to one URL parameter. Changing it rewrites that parameter and
 * keeps every other one, so each tool view is its own shareable URL.
 */
export function ParamSelect({
  param, label, options, selected,
}: {
  param: string
  label: string
  options: { value: string; label: string }[]
  selected: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <select
        value={selected}
        onChange={(e) => {
          const next = new URLSearchParams(params)
          next.set(param, e.target.value)
          router.push(`${pathname}?${next}`)
        }}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-ring/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

/** Which scored role a Co-Pilot tool is working on (`?role=`). */
export function RolePicker({ options, selected }: { options: ScoredRoleOption[]; selected: string }) {
  return (
    <ParamSelect
      param="role"
      label="Target role"
      selected={selected}
      options={options.map((o) => ({
        value: o.id,
        label: `${o.score !== null ? `${Math.round(o.score)}% · ` : ''}${o.title} — ${o.company}`,
      }))}
    />
  )
}
