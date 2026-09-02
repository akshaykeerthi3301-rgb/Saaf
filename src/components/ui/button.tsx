import type { ButtonHTMLAttributes } from 'react'
import styles from './button.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Two variants only. A third invites hierarchy this product does not have. */
  variant?: 'primary' | 'ghost'
}

export function Button({ variant = 'primary', className, ...rest }: Props) {
  return <button className={`${styles[variant]} ${className ?? ''}`} {...rest} />
}
