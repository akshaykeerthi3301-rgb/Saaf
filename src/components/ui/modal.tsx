'use client'

import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'

/**
 * A centred dialog — the sheet's sibling, on the same primitive and for the
 * same reason (src/components/ui/sheet.tsx): Escape, the focus trap, focus
 * return and scroll lock are the parts that are easy to half-build.
 *
 * Controlled only: the tracker opens it from a card click, not a trigger.
 */
export function Modal({
  open, onOpenChange, children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md" />
        <Dialog.Popup className="glass fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border shadow-2xl outline-none">
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const ModalTitle = Dialog.Title
export const ModalClose = Dialog.Close
