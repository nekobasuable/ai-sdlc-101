// 箇条書きの頭の、手で引いたような短い墨の印(spec R47、plan/020)
/** className: 行の高さに合わせた上の余白(既定は、上下に余白のある箇条書きの行に合わせた位置) */
export default function ListMark({ className = 'mt-[18px]' }: { className?: string }) {
  return (
    <svg className={`shrink-0 text-ink-3 ${className}`} width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
      <path d="M1 3.4C3 2.6 6 2.4 9 3" />
    </svg>
  )
}
