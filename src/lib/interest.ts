/**
 * "N candidates are tracking this" — F-107's lawful form.
 *
 * Jobinko cannot know how many people applied on an employer's site and will not
 * say a number it did not count. The one count it holds is how many of its own
 * candidates have the role in their tracker (migration 0033's `role_interest`),
 * and that function returns nothing below INTEREST_MIN so a small number can
 * never point at a person. This repeats the floor on the client's side of the
 * line: a record under it is dropped even if the database ever sent one.
 */
export const INTEREST_MIN = 3

export type InterestChip = { label: string; title: string }

export function interestChip(trackers: number | null | undefined): InterestChip | null {
  if (typeof trackers !== 'number' || !Number.isInteger(trackers) || trackers < INTEREST_MIN) return null
  return {
    label: `${trackers} tracking`,
    title: `${trackers} Jobinko candidates have this role in their own tracker. Counted from Jobinko only — not the number of applicants on the employer's site, which we cannot see.`,
  }
}
