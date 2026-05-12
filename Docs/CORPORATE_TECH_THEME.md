# Corporate Tech Theme

The app now uses the **Corporate Tech** color system as the single source of truth for UI colors.

## Typography

Primary UI font:

```txt
FiraCode Nerd Font Mono
Fira Code fallback
monospace fallback
```

## Palette

```yaml
name: Corporate Tech
colors:
  surface: '#fff7fa'
  surface-dim: '#fccaff'
  surface-bright: '#fff7fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ffeffb'
  surface-container: '#ffe7fd'
  surface-container-high: '#ffdefe'
  surface-container-highest: '#fed6ff'
  on-surface: '#350040'
  on-surface-variant: '#444651'
  inverse-surface: '#560068'
  inverse-on-surface: '#ffebfc'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#6f5d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c6aa23'
  on-tertiary-container: '#4b3f00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffe262'
  tertiary-fixed-dim: '#e3c53f'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#534600'
  background: '#fff7fa'
  on-background: '#350040'
  surface-variant: '#fed6ff'
```

## Implementation notes

- `index.html` defines Tailwind color tokens and maps legacy utility families (`slate`, `gray`, `red`, `blue`, `green`, `emerald`, `amber`, `yellow`) onto this palette so existing components remain within the approved theme.
- `index.css` defines CSS variables (`--ct-*`) for the same palette and controls the global light/dark wallpaper background.
- `src/components/ui/corporateTechTheme.ts` exports the palette for inline-style components such as buttons, toggles, loaders, auth inputs, and email templates.
- Legacy aliases like `theme-yellow`, `theme-teal`, `theme-red`, `theme-maroon`, `theme-black`, `dark-bg`, and `dark-card` now resolve to Corporate Tech colors.

## Rule

New UI work should not introduce colors outside this palette. Use Tailwind theme tokens or `corporateTechTheme.ts` instead of new hard-coded hex values.
