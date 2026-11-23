import type { OwlPose } from '../domain/owl'

// 墨の線で描いたふくろう(spec R36)。説明はしない
export default function Owl({ pose, className = '' }: { pose: OwlPose; className?: string }) {
  const label = pose === 'sleep' ? '眠っているふくろう' : pose === 'read' ? '本を読むふくろう' : 'ふくろう'
  return (
    <svg
      className={`text-ink ${className}`}
      width="46"
      height="52"
      viewBox="0 0 46 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      <path d="M10 14c-1.5-4-1-8 1-10 2.5 3 6 4.5 12 4.5S32.5 7 35 4c2 2 2.5 6 1 10" />
      <path d="M9.5 14C6 20 6 34 11 40c3.5 4.2 8 6 12 6s8.5-1.8 12-6c5-6 5-20 1.5-26" />
      {pose === 'watch' && (
        <>
          <circle cx="16.5" cy="19" r="4.2" />
          <circle cx="29.5" cy="19" r="4.2" />
          <circle cx="17" cy="19.5" r="1" fill="currentColor" />
          <circle cx="29" cy="19.5" r="1" fill="currentColor" />
          <path d="M15 31c2 1.5 3 1.5 4 0M23 33c2 1.5 3 1.5 4 0M17.5 37c2 1.5 3 1.5 4 0" />
        </>
      )}
      {pose === 'sleep' && (
        <>
          <path d="M13 19c2 1.6 4.5 1.6 6.5 0M26.5 19c2 1.6 4.5 1.6 6.5 0" />
          <path d="M39 7h3l-3 3.5h3M42.5 1.5h2l-2 2.3h2" strokeWidth="1" />
          <path d="M15 31c2 1.5 3 1.5 4 0M23 33c2 1.5 3 1.5 4 0" />
        </>
      )}
      {pose === 'read' && (
        <>
          <path d="M13 20.5c2-1 4.5-1 6.5 0M26.5 20.5c2-1 4.5-1 6.5 0" />
          <path d="M13 33l10 3 10-3v8l-10 3-10-3z" />
          <path d="M23 36v8" />
        </>
      )}
      <path d="M21.5 24.5 23 27l1.5-2.5" />
      <path d="M16 46.5v3M30 46.5v3M4 50h38" />
    </svg>
  )
}
