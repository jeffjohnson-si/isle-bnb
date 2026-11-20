import type { ReactElement, SVGProps } from 'react'

type IconName =
  | 'search'
  | 'pin'
  | 'star'
  | 'heart'
  | 'users'
  | 'bed'
  | 'bath'
  | 'wifi'
  | 'arrowRight'
  | 'arrowLeft'
  | 'chevronDown'
  | 'menu'
  | 'close'
  | 'check'
  | 'calendar'
  | 'shield'
  | 'boat'
  | 'sparkles'
  | 'download'
  | 'globe'
  | 'filter'
  | 'phone'
  | 'mail'
  | 'waves'
  | 'sun'
  | 'wallet'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

const paths: Record<IconName, ReactElement> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.6 16.6 21 21" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s7-6.4 7-11.2A7 7 0 0 0 5 10.3c0 4.8 7 11.2 7 11.2Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  star: (
    <path
      d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9L12 3.2Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  heart: (
    <path d="M12 20.4 10.6 19C5.5 14.4 2.6 11.5 2.6 8a5 5 0 0 1 5-5c1.7 0 3.2.8 4.4 2.2A5.7 5.7 0 0 1 16.4 3a5 5 0 0 1 5 5c0 3.5-2.9 6.4-8 11l-1.4 1.4Z" />
  ),
  users: (
    <>
      <circle cx="9.2" cy="8" r="3.4" />
      <path d="M2.8 20c0-3.4 2.9-5.8 6.4-5.8s6.4 2.4 6.4 5.8" />
      <path d="M16.8 5.1a3.4 3.4 0 0 1 0 6.2M18.6 14.7c2.2.6 3.6 2.4 3.6 5.3" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18.5V9M21 18.5V13M3 13.5h18M6 13.5V9.5h6.5v4M14.5 9.5h3.5v4" />
      <path d="M2 18.5h20" />
    </>
  ),
  bath: (
    <>
      <path d="M3.5 12.5h17M5.5 12.5V6.9a2 2 0 0 1 3.8-.9M7.5 19.5 6 21M16.5 19.5 18 21" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 8.6a14 14 0 0 1 19 0M5.8 12a9.4 9.4 0 0 1 12.4 0M9 15.4a4.6 4.6 0 0 1 6 0" />
      <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  arrowRight: <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />,
  arrowLeft: <path d="M20 12H5M10.5 6.5 5 12l5.5 5.5" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  calendar: (
    <>
      <rect x="3.2" y="5" width="17.6" height="16" rx="3" />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5.4c0 4.6-3 8.3-7 9.6-4-1.3-7-5-7-9.6V6l7-3Z" />
      <path d="m8.8 11.8 2.2 2.2 4.2-4.4" />
    </>
  ),
  boat: (
    <>
      <path d="M4 18h16M12 3.5V18M12 4.2 18.5 12H12M12 4.2 5.5 12H12" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3Z" />
      <path d="m18.6 15.4.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z" />
    </>
  ),
  download: <path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 20.5h15" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  filter: <path d="M3.5 6.5h17M6.5 12h11M10 17.5h4" />,
  phone: (
    <path d="M6.2 3.5h2.6l1.5 3.9-2 1.4a11 11 0 0 0 5.9 5.9l1.4-2 3.9 1.5v2.6a2.4 2.4 0 0 1-2.6 2.4C10.2 18.5 5.5 13.8 3.8 6.1A2.4 2.4 0 0 1 6.2 3.5Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7.5 8 5.5 8-5.5" />
    </>
  ),
  waves: (
    <path d="M2.5 8.5c2.4 0 2.4-2 4.8-2s2.4 2 4.8 2 2.4-2 4.8-2 2.4 2 4.8 2M2.5 15.5c2.4 0 2.4-2 4.8-2s2.4 2 4.8 2 2.4-2 4.8-2 2.4 2 4.8 2" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10.5h18M16.5 14.8h1.5" />
    </>
  ),
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

/** Brand mark: sun, palm and two lines of swell. */
export function IsleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <circle cx="13.4" cy="12.4" r="4.4" fill="#ffc46b" />
      <path
        d="M25.6 31c-.2-6 .6-10.9 3-15.2"
        stroke="#faf6ef"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28.4 16.2c2.3-1.7 4.7-2.1 7.1-1.3M28.4 16.2c.5-2.5 2-4.4 4.4-5.6M28.4 16.2c-1.9-1.9-2.9-4-3-6.4M28.4 16.2c-2.5.2-4.7-.5-6.6-2"
        stroke="#faf6ef"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 33.4c2.6 0 2.6-2 5.2-2s2.6 2 5.2 2 2.6-2 5.2-2 2.6 2 5.2 2"
        stroke="#35c6bd"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
