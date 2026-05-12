import type { CSSProperties, FocusEvent } from 'react'

const COLORS = {
  yellow: '#f3e600',
  teal: '#55ead4',
  maroon: '#880425',
  black: '#000000',
  white: '#ffffff',
  slate500: '#64748b',
  darkBg: '#111827',
  darkCard: '#1f2937',
  darkInput: '#374151',
}

export function getAuthCardStyle(isDark: boolean): CSSProperties {
  return {
    backgroundColor: isDark ? COLORS.darkCard : COLORS.white,
    border: `2px solid ${isDark ? COLORS.yellow : COLORS.maroon}`,
    borderRadius: '14px',
    boxShadow: isDark ? `8px 8px 0 ${COLORS.teal}` : `8px 8px 0 ${COLORS.maroon}`,
  }
}

export function getAuthInputStyle(isDark: boolean): CSSProperties {
  return {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: `2px solid ${isDark ? COLORS.yellow : COLORS.maroon}`,
    backgroundColor: isDark ? COLORS.darkInput : COLORS.white,
    boxShadow: isDark ? `4px 4px 0 ${COLORS.teal}` : `4px 4px 0 ${COLORS.maroon}`,
    color: isDark ? COLORS.white : COLORS.black,
    fontSize: '15px',
    fontWeight: 600,
    padding: '8px 12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
  }
}

export function focusAuthInput(event: FocusEvent<HTMLInputElement>, isDark: boolean): void {
  event.currentTarget.style.borderColor = isDark ? COLORS.teal : COLORS.yellow
  event.currentTarget.style.boxShadow = isDark ? `4px 4px 0 ${COLORS.yellow}` : `4px 4px 0 ${COLORS.teal}`
  event.currentTarget.style.transform = 'translate(-1px, -1px)'
}

export function blurAuthInput(event: FocusEvent<HTMLInputElement>, isDark: boolean): void {
  event.currentTarget.style.borderColor = isDark ? COLORS.yellow : COLORS.maroon
  event.currentTarget.style.boxShadow = isDark ? `4px 4px 0 ${COLORS.teal}` : `4px 4px 0 ${COLORS.maroon}`
  event.currentTarget.style.transform = 'translate(0, 0)'
}
