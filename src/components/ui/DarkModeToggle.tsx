import React from 'react'

interface DarkModeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative h-7 w-14 rounded-lg border-2 border-line-strong bg-surface shadow-[3px_3px_0_rgb(var(--color-border-strong))] transition-colors dark:shadow-[3px_3px_0_rgb(var(--color-accent))]"
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-md border-2 border-line-strong bg-accent transition-all ${isDark ? 'left-7' : 'left-0.5'}`}
      />
    </button>
  )
}
