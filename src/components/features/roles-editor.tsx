'use client'

import type { ReactNode } from 'react'
import { Star, X } from 'lucide-react'
import { RoleInput } from '@/components/features/role-input'
import { Chip } from '@/components/features/profile-ui'
import { MAX_ROLES, addRole, makeMain, removeRole } from '@/lib/role-list'

/**
 * The roles you are looking for, up to five, in one list. The first is the main role; click the star on another to
 * make it the main one. Every pick is ADDED — see src/lib/role-list.ts for why that is the whole point.
 */
export function RolesEditor({ roles, onChange, helper, note }: { roles: string[]; onChange: (next: string[]) => void; helper?: string; note?: ReactNode }) {
  return (
    <div>
      {roles.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Your roles">
          {roles.map((r, i) => (
            <li key={r}>
              <Chip active={i === 0}>
                {i === 0 ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Main</span> : (
                  <button type="button" onClick={() => onChange(makeMain(roles, r))} aria-label={`Make ${r} your main role`} title="Make this your main role" className="text-muted-foreground hover:text-accent"><Star className="size-3.5" /></button>
                )}
                {r}
                <button type="button" onClick={() => onChange(removeRole(roles, r))} aria-label={`Remove ${r}`} className="text-muted-foreground hover:text-primary"><X className="size-3" /></button>
              </Chip>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No role chosen yet.</p>}
      <p className="mt-2 text-xs text-muted-foreground">{roles.length} of {MAX_ROLES} chosen. Your list becomes one merged list across all of them, best match first.</p>
      {note ? <div className="mt-2 text-xs text-muted-foreground">{note}</div> : null}
      {roles.length < MAX_ROLES ? (
        <div className="mt-4">
          <RoleInput label={roles.length ? 'Add another role' : 'Choose a role'} value="" onChange={(v) => onChange(addRole(roles, v))} helper={helper ?? "Pick from the list or type your own and press Enter. The number beside each is how many postings we hold for it today."} />
        </div>
      ) : <p className="mt-4 text-xs text-muted-foreground">That is {MAX_ROLES} roles — enough. Remove one to add another.</p>}
    </div>
  )
}
