import type { CSSProperties, FocusEvent } from 'react'
import { corporateTech as COLORS } from './corporateTechTheme'

export function getAuthCardStyle(isDark: boolean): CSSProperties {
  return {
    backgroundColor: isDark ? COLORS.primary : COLORS.surfaceContainerLowest,
    border: `2px solid ${isDark ? COLORS.inversePrimary : COLORS.primary}`,
    borderRadius: '14px',
    boxShadow: isDark ? `8px 8px 0 ${COLORS.secondaryFixedDim}` : `8px 8px 0 ${COLORS.primary}`,
  }
}

export function getAuthInputStyle(isDark: boolean): CSSProperties {
  return {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: `2px solid ${isDark ? COLORS.inversePrimary : COLORS.primary}`,
    backgroundColor: isDark ? COLORS.primaryContainer : COLORS.surfaceContainerLowest,
    boxShadow: isDark ? `4px 4px 0 ${COLORS.secondaryFixedDim}` : `4px 4px 0 ${COLORS.primary}`,
    color: isDark ? COLORS.inverseOnSurface : COLORS.onSurface,
    fontSize: '15px',
    fontWeight: 600,
    padding: '8px 12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
  }
}

export function focusAuthInput(event: FocusEvent<HTMLInputElement>, isDark: boolean): void {
  event.currentTarget.style.borderColor = isDark ? COLORS.secondaryFixed : COLORS.secondary
  event.currentTarget.style.boxShadow = isDark ? `4px 4px 0 ${COLORS.inversePrimary}` : `4px 4px 0 ${COLORS.secondary}`
  event.currentTarget.style.transform = 'translate(-1px, -1px)'
}

export function blurAuthInput(event: FocusEvent<HTMLInputElement>, isDark: boolean): void {
  event.currentTarget.style.borderColor = isDark ? COLORS.inversePrimary : COLORS.primary
  event.currentTarget.style.boxShadow = isDark ? `4px 4px 0 ${COLORS.secondaryFixedDim}` : `4px 4px 0 ${COLORS.primary}`
  event.currentTarget.style.transform = 'translate(0, 0)'
}
