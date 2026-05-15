import React from 'react'

interface RoleToggleProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  name?: string
}

export function RoleToggle<T extends string>({ value, options, onChange, name = 'role' }: RoleToggleProps<T>) {
  return (
    <div className="flex rounded-full border-2 border-line-strong bg-surface p-1 shadow-[4px_4px_0_rgb(var(--color-border-strong))] dark:shadow-[4px_4px_0_rgb(var(--color-accent))]" role="radiogroup" aria-label="Account role">
      {options.map(option => {
        const checked = option.value === value
        return (
          <label key={option.value} className={`relative rounded-full px-5 py-2 text-sm font-black transition-colors ${checked ? 'bg-primary text-on-primary' : 'text-main hover:bg-surface-muted'}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}
