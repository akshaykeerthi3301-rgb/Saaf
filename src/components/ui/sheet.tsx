'use client'

import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'

/**
 * A panel that slides over the page from the right — the one drawer.
 *
 * ⚠️ BUILT ON @base-ui/react's Dialog, NOT A HAND-ROLLED `role="dialog"`. The
 * review drawer was a div with the role and nothing behind it: Escape did not
 * close it, focus stayed on the page underneath, and a keyboard or
 * screen-reader user could tab out into the cards it covered
 * (docs/QA-AUDIT.md QA-13). The primitive gives Escape, the focus trap, focus
 * returning to the trigger, scroll lock and the accessible name from
 * SheetTitle — the parts that are easy to half-build.
 *
 * Styling is the old drawer's, from tokens: the card surface, the one border,
 * the backdrop tinted with the primary ink.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A SheetTrigger, so focus returns to it when the sheet closes. */
  trigger: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-primary/25 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-sm outline-none">
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const SheetTrigger = Dialog.Trigger
export const SheetTitle = Dialog.Title
export const SheetClose = Dialog.Close
