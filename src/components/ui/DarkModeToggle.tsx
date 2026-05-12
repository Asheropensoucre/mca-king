import React from 'react'
import { corporateTech as COLORS } from './corporateTechTheme'

interface DarkModeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <label className="switch" style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '50px',
      height: '20px',
      cursor: 'pointer',
    }}>
      <input
        type="checkbox"
        checked={isDark}
        onChange={onToggle}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      />
      <span style={{
        boxSizing: 'border-box',
        borderRadius: '5px',
        border: isDark ? `2px solid ${COLORS.inversePrimary}` : `2px solid ${COLORS.primary}`,
        boxShadow: isDark ? `4px 4px ${COLORS.secondaryFixedDim}` : `4px 4px ${COLORS.primary}`,
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? COLORS.inverseSurface : COLORS.surfaceContainerLowest,
        transition: '0.3s',
      }}>
        <span style={{
          boxSizing: 'border-box',
          position: 'absolute',
          content: '""',
          height: '20px',
          width: '20px',
          border: isDark ? `2px solid ${COLORS.inversePrimary}` : `2px solid ${COLORS.primary}`,
          borderRadius: '5px',
          left: isDark ? '28px' : '-2px',
          bottom: '2px',
          backgroundColor: isDark ? COLORS.primaryContainer : COLORS.tertiaryFixed,
          boxShadow: isDark ? `0 3px 0 ${COLORS.secondaryFixedDim}` : `0 3px 0 ${COLORS.primary}`,
          transition: '0.3s',
        }} />
      </span>
    </label>
  )
}
