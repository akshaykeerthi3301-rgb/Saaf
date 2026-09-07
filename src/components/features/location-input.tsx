'use client'

import { useMemo } from 'react'
import { Combobox, type ComboGroup } from '@/components/ui/combobox'
import { REGIONS, resolveCity } from '@/lib/taxonomy/locations'

type Props = {
  label: string
  value: string
  provenance?: string
  onChange: (value: string) => void
}

/**
 * Where the candidate wants to work, chosen from a dropdown of Indian cities.
 *
 * ⚠️ THIS WAS A TEXT BOX WITH CHIPS AND A COLLAPSED ACCORDION, AND THAT IS WHY
 * THE TAXONOMY LOOKED BROKEN. The field is prefilled from the résumé parser,
 * which produces "Bangalore, India" — correct-looking, so the candidate accepts
 * it and never opens the accordion. That string is not in the taxonomy, so
 * resolveCity returned null, matchLocation fell back to a literal substring
 * test, and "Bengaluru, Karnataka, India" — the commonest location in the whole
 * index — scored as ANOTHER CITY, at 3/10. Commute-cluster matching was off for
 * the same reason. Measured on a live profile: 36 roles placed in-city where
 * the correct figure was 209.
 *
 * The list was there the entire time. Nobody opened it, because nothing about
 * the interface said it existed. It is a dropdown now.
 *
 * A city we do not carry is still accepted — the Combobox offers it explicitly
 * once the search finds nothing, and confirmProfile stores it as typed. Never
 * turning a candidate away is a locked decision; what they lose is alias and
 * cluster matching, and the note below says so rather than letting them find
 * out from a thin shortlist.
 */
export function LocationInput({ label, value, provenance, onChange }: Props) {
  const groups: ComboGroup[] = useMemo(
    () => REGIONS.map((r) => ({ label: r.region, options: r.cities.map((c) => ({ value: c.name })) })),
    [],
  )

  const known = !!resolveCity(value)

  return (
    <Combobox
      label={label}
      value={value}
      groups={groups}
      placeholder="Choose a city"
      provenance={provenance}
      onChange={onChange}
      helper={
        value && !known
          ? `We don't carry ${value} yet, so we can't match its other spellings or its commute belt. Your shortlist still works — pick a city from the list if one is closer.`
          : 'Matching knows the other spellings — Bangalore and Bengaluru are the same city — and nearby cities people commute from.'
      }
    />
  )
}
