/**
 * The saved-résumé slot rule, stated once so the screen and the database trigger
 * (migration 0034) cannot drift apart.
 *
 * Ten slots per candidate. The primary résumé holds one of them and is never
 * the one replaced; saving past the limit replaces the oldest of the rest.
 */
export const RESUME_SLOTS = 10

export function slotNote(count: number, hasPrimary: boolean): string {
  const left = Math.max(RESUME_SLOTS - count, 0)
  const full = left === 0
  if (!full) return `${count} of ${RESUME_SLOTS} saved — ${left} slot${left === 1 ? '' : 's'} free.`
  return hasPrimary
    ? `${RESUME_SLOTS} of ${RESUME_SLOTS} saved. Saving another replaces the oldest — never your primary.`
    : `${RESUME_SLOTS} of ${RESUME_SLOTS} saved. Saving another replaces the oldest. Mark one primary to keep it safe.`
}
