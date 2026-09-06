import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Join class names, with later Tailwind utilities winning over earlier ones.
 *
 * `clsx` handles the conditional/array/object forms; `twMerge` resolves
 * conflicts so `cn('p-2', 'p-4')` yields `p-4` rather than both. Every shadcn
 * component expects this helper to exist at this path.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
