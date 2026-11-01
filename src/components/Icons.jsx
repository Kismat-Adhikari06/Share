function Svg({ size = 18, children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  )
}

export function IconPlus(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconSort(props) {
  return (
    <Svg {...props}>
      <path d="M7 5v14M7 5 4 8M7 5l3 3M17 19V5M17 19l-3-3M17 19l3-3" />
    </Svg>
  )
}

export function IconDownload(props) {
  return (
    <Svg {...props}>
      <path d="M12 4v10M12 14l-4-4M12 14l4-4M5 18v1.5h14V18" />
    </Svg>
  )
}

export function IconCopy(props) {
  return (
    <Svg {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </Svg>
  )
}

export function IconLink(props) {
  return (
    <Svg {...props}>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.2 1.2" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.2-1.2" />
    </Svg>
  )
}

export function IconTrash(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12M10 11v6M14 11v6" />
    </Svg>
  )
}

export function IconClose(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconArrowLeft(props) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M5 12l6-6M5 12l6 6" />
    </Svg>
  )
}

export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  )
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  )
}

export function IconPen(props) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 2 2" />
    </Svg>
  )
}

export function IconEye(props) {
  return (
    <Svg {...props}>
      <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  )
}

export function IconFileText(props) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h2.5" />
    </Svg>
  )
}

export function IconMore(props) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1" fill="currentColor" />
    </Svg>
  )
}

export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  )
}

export function IconBook(props) {
  return (
    <Svg {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19" />
      <path d="M8.5 7.5h7" />
    </Svg>
  )
}

export function IconBold(props) {
  return (
    <Svg {...props}>
      <path d="M8 5h4.5a3.5 3.5 0 0 1 0 7H8V5ZM8 12h5.5a3.5 3.5 0 0 1 0 7H8v-7Z" />
    </Svg>
  )
}

export function IconItalic(props) {
  return (
    <Svg {...props}>
      <path d="M15 5h-5M14 19H9M14 5 10 19" />
    </Svg>
  )
}

export function IconHeading(props) {
  return (
    <Svg {...props}>
      <path d="M6 5v14M14 5v14M6 12h8M18 9l1.5-1v11" />
    </Svg>
  )
}

export function IconList(props) {
  return (
    <Svg {...props}>
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </Svg>
  )
}

export function IconCode(props) {
  return (
    <Svg {...props}>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
    </Svg>
  )
}

export function IconQuote(props) {
  return (
    <Svg {...props}>
      <path d="M9 7H5.5A1.5 1.5 0 0 0 4 8.5v3A1.5 1.5 0 0 0 5.5 13H8v1.5A2.5 2.5 0 0 1 5.5 17M19 7h-3.5A1.5 1.5 0 0 0 14 8.5v3a1.5 1.5 0 0 0 1.5 1.5H18v1.5A2.5 2.5 0 0 1 15.5 17" />
    </Svg>
  )
}

export function IconCalendarPlus(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M12 13v4.5M9.75 15.25h4.5" />
    </Svg>
  )
}

export function IconType(props) {
  return (
    <Svg {...props}>
      <path d="M5 7V5.5h14V7M12 5.5v13M9 18.5h6" />
    </Svg>
  )
}

export function IconImage(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.4-4.2a1.8 1.8 0 0 1 2.4 0L16 17M14.5 14.6l1.4-1.3a1.7 1.7 0 0 1 2.3 0l2.3 2.2" />
    </Svg>
  )
}
