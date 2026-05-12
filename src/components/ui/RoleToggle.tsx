import React from 'react'
import { corporateTech as COLORS } from './corporateTechTheme'

interface RoleToggleProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  name?: string
}

function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function RoleToggle<T extends string>({ value, options, onChange, name = 'role' }: RoleToggleProps<T>) {
  const isDark = isDarkMode()
  const width = 250
  const optionWidth = (width - 8) / options.length

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: '40px',
        backgroundColor: isDark ? COLORS.inverseSurface : COLORS.surfaceContainerLowest,
        border: `2px solid ${isDark ? COLORS.inversePrimary : COLORS.primary}`,
        borderRadius: '34px',
        display: 'flex',
        flexDirection: 'row',
        boxShadow: `4px 4px ${isDark ? COLORS.secondaryFixedDim : COLORS.primary}`,
      }}
      role="radiogroup"
      aria-label="Account role"
    >
      {options.map(option => {
        const checked = option.value === value
        return (
          <div
            key={option.value}
            style={{
              width: `${optionWidth}px`,
              height: '32px',
              position: 'relative',
              top: '2px',
              left: '2px',
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
                appearance: 'none',
                cursor: 'pointer',
                zIndex: 2,
              }}
            />
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: checked ? (isDark ? COLORS.inversePrimary : COLORS.primary) : (isDark ? COLORS.inverseSurface : COLORS.surfaceContainerLowest),
                borderRadius: '50px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transition: '0.25s',
              }}
            >
              <span
                style={{
                  color: checked ? (isDark ? COLORS.onPrimaryFixed : COLORS.onPrimary) : (isDark ? COLORS.secondaryFixed : COLORS.primary),
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {option.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
