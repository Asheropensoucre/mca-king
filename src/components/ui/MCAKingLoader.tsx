import React, { useId } from 'react'

interface MCAKingLoaderProps {
  label?: string
  size?: 'small' | 'medium' | 'large'
  centered?: boolean
}

const sizeClasses: Record<NonNullable<MCAKingLoaderProps['size']>, string> = {
  small: 'w-44',
  medium: 'w-72',
  large: 'w-96 max-w-[85vw]',
}

export const MCAKingLoader: React.FC<MCAKingLoaderProps> = ({
  label = 'Loading...',
  size = 'medium',
  centered = false,
}) => {
  const maskId = useId().replace(/:/g, '')

  return (
    <div className={centered ? 'flex min-h-[220px] items-center justify-center' : 'inline-flex items-center justify-center'} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <svg
          viewBox="0 0 360 110"
          className={`${sizeClasses[size]} overflow-visible`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${maskId}-brandGradient`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#880425" />
              <stop offset="52%" stopColor="#f3e600" />
              <stop offset="100%" stopColor="#55ead4" />
            </linearGradient>
            <filter id={`${maskId}-shadow`} x="-20%" y="-40%" width="140%" height="180%">
              <feDropShadow dx="4" dy="4" stdDeviation="0" floodColor="currentColor" floodOpacity="0.38" />
            </filter>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x="360" y="0" width="0" height="110" fill="white">
                <animate attributeName="x" values="360;0;0;360" keyTimes="0;0.48;0.82;1" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="width" values="0;360;360;0" keyTimes="0;0.48;0.82;1" dur="2.2s" repeatCount="indefinite" />
              </rect>
            </mask>
          </defs>

          <rect
            x="19"
            y="24"
            width="322"
            height="60"
            rx="12"
            className="fill-white/80 stroke-theme-maroon dark:fill-dark-card/90 dark:stroke-theme-yellow"
            strokeWidth="3"
            filter={`url(#${maskId}-shadow)`}
          />

          <text
            x="180"
            y="64"
            textAnchor="middle"
            className="fill-slate-300 dark:fill-slate-700"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 34, fontWeight: 900, letterSpacing: '0.5px' }}
          >
            mcaking.com
          </text>

          <g mask={`url(#${maskId})`}>
            <text
              x="180"
              y="64"
              textAnchor="middle"
              fill={`url(#${maskId}-brandGradient)`}
              stroke="currentColor"
              className="text-theme-maroon dark:text-theme-teal"
              strokeWidth="0.8"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 34, fontWeight: 900, letterSpacing: '0.5px' }}
            >
              mcaking.com
            </text>
            <line x1="48" y1="74" x2="312" y2="74" className="stroke-theme-teal dark:stroke-theme-yellow" strokeWidth="4" strokeLinecap="round">
              <animate attributeName="x1" values="312;48;48;312" keyTimes="0;0.48;0.82;1" dur="2.2s" repeatCount="indefinite" />
            </line>
          </g>

          <circle cx="322" cy="32" r="5" className="fill-theme-yellow dark:fill-theme-teal">
            <animate attributeName="opacity" values="0.25;1;0.25" dur="1.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="38" cy="76" r="4" className="fill-theme-teal dark:fill-theme-yellow">
            <animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </svg>
        {label && <p className="text-sm font-bold text-theme-maroon dark:text-theme-yellow">{label}</p>}
      </div>
    </div>
  )
}
