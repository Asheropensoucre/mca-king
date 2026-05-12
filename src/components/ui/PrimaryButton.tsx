import React from 'react'
import { corporateTech as COLORS } from './corporateTechTheme'

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

function getIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function getVariantColors(variant: PrimaryButtonProps['variant'], isDark: boolean) {
  if (variant === 'funded') {
    return {
      text: COLORS.onSecondary,
      background: isDark ? COLORS.secondaryContainer : COLORS.secondary,
      border: isDark ? COLORS.secondaryFixed : COLORS.onSecondaryFixedVariant,
      shadowDark: isDark ? COLORS.onSecondaryFixedVariant : COLORS.onSecondaryFixed,
      shadowLight: isDark ? COLORS.secondaryFixedDim : COLORS.secondaryContainer,
      pressedText: isDark ? COLORS.onSecondaryFixed : COLORS.secondaryFixed,
    }
  }

  if (variant === 'danger') {
    return {
      text: COLORS.onError,
      background: COLORS.error,
      border: COLORS.onErrorContainer,
      shadowDark: COLORS.onErrorContainer,
      shadowLight: COLORS.errorContainer,
      pressedText: COLORS.errorContainer,
    }
  }

  return {
    text: COLORS.onTertiaryFixed,
    background: isDark ? COLORS.tertiaryFixedDim : COLORS.tertiaryFixed,
    border: isDark ? COLORS.tertiaryContainer : COLORS.tertiary,
    shadowDark: isDark ? COLORS.onTertiaryFixedVariant : COLORS.tertiary,
    shadowLight: isDark ? COLORS.tertiaryFixed : COLORS.surfaceContainerHighest,
    pressedText: COLORS.onTertiaryFixedVariant,
  }
}

export function PrimaryButton({ label, onClick, disabled, variant = 'default', type = 'button', size = 'normal', className = '', fullWidth = false }: PrimaryButtonProps) {
  const isDark = getIsDark()
  const colors = getVariantColors(variant, isDark)

  const baseStyle: React.CSSProperties = {
    color: colors.text,
    width: fullWidth ? '100%' : undefined,
    padding: size === 'large' ? '0.9em 2.1em' : size === 'small' ? '0.45em 1em' : '0.7em 1.7em',
    fontSize: size === 'large' ? '22px' : size === 'small' ? '14px' : '18px',
    fontWeight: 800,
    borderRadius: '0.5em',
    background: colors.background,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: `2px solid ${colors.border}`,
    transition: 'all 0.3s',
    boxShadow: `6px 6px 0 ${colors.shadowDark}, -4px -4px 0 ${colors.shadowLight}`,
    opacity: disabled ? 0.5 : 1,
  }

  const raisedShadow = `6px 6px 0 ${colors.shadowDark}, -4px -4px 0 ${colors.shadowLight}`
  const pressedShadow = `inset 4px 4px 0 ${colors.shadowDark}, inset -3px -3px 0 ${colors.shadowLight}`

  return (
    <button
      type={type}
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      onMouseDown={e => {
        if (!disabled) {
          const el = e.currentTarget
          el.style.boxShadow = pressedShadow
          el.style.color = colors.pressedText
          el.style.transform = 'translate(2px, 2px)'
        }
      }}
      onMouseUp={e => {
        const el = e.currentTarget
        el.style.boxShadow = raisedShadow
        el.style.color = colors.text
        el.style.transform = 'translate(0, 0)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.boxShadow = raisedShadow
        el.style.color = colors.text
        el.style.transform = 'translate(0, 0)'
      }}
    >
      {label}
    </button>
  )
}
