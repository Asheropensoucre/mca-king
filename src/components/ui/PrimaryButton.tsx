import React from 'react'

interface PrimaryButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'funded' | 'danger'
  type?: 'button' | 'submit'
  size?: 'small' | 'normal' | 'large'
  className?: string
  fullWidth?: boolean
}

const variantClasses: Record<NonNullable<PrimaryButtonProps['variant']>, string> = {
  default: 'border-line-strong bg-accent text-on-accent shadow-[5px_5px_0_rgb(var(--color-border-strong))] hover:bg-warning focus:ring-accent/70 dark:shadow-[5px_5px_0_rgb(var(--color-secondary))]',
  funded: 'border-secondary bg-secondary text-on-secondary shadow-[5px_5px_0_rgb(var(--color-accent))] hover:bg-success focus:ring-secondary/70',
  danger: 'border-danger bg-danger text-on-danger shadow-[5px_5px_0_rgb(var(--color-border-strong))] hover:brightness-110 focus:ring-danger/70',
}

const sizeClasses: Record<NonNullable<PrimaryButtonProps['size']>, string> = {
  small: 'px-3 py-2 text-sm',
  normal: 'px-5 py-3 text-base',
  large: 'px-7 py-4 text-xl',
}

export function PrimaryButton({ label, onClick, disabled, variant = 'default', type = 'button', size = 'normal', className = '', fullWidth = false }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-lg border-2 font-black transition-all focus:outline-none focus:ring-2 active:translate-x-1 active:translate-y-1 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {label}
    </button>
  )
}
