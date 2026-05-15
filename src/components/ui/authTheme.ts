import type { CSSProperties, FocusEvent } from 'react'

export function getAuthCardStyle(_isDark: boolean): CSSProperties {
  return {}
}

export function getAuthInputStyle(_isDark: boolean): CSSProperties {
  return {}
}

export function focusAuthInput(_event: FocusEvent<HTMLInputElement>, _isDark: boolean): void {}

export function blurAuthInput(_event: FocusEvent<HTMLInputElement>, _isDark: boolean): void {}

export const authCardClassName = 'rounded-xl border-2 border-line bg-surface p-8 text-main shadow-[8px_8px_0_rgb(var(--color-border-strong))] dark:shadow-[8px_8px_0_rgb(var(--color-accent))]'
export const authInputClassName = 'h-11 w-full rounded-lg border-2 border-line bg-surface px-3 py-2 text-base font-semibold text-main outline-none transition focus:border-line-strong focus:ring-2 focus:ring-accent/60'
