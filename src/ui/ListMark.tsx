// 箇条書きの頭の、筆で置いたような小さな墨の点(spec R47 補、plan/026)。
// 短い線(plan/020)は見づらかったので、点にした。文字よりは薄く、罫線よりは濃い ink-2
/** className: 行の高さに合わせた上の余白(既定は、上下に余白のある箇条書きの行で、1行目の文字の中央にそろう位置) */
export default function ListMark({ className = 'mt-[18px]' }: { className?: string }) {
  return (
    <svg className={`shrink-0 text-ink-2 ${className}`} width="6" height="6" viewBox="0 0 6 6" fill="currentColor" aria-hidden="true">
      <path d="M3.1 0.4C4.6 0.5 5.7 1.6 5.6 3.1C5.5 4.6 4.3 5.7 2.8 5.6C1.3 5.5 0.3 4.4 0.4 2.9C0.5 1.4 1.7 0.3 3.1 0.4Z" />
    </svg>
  )
}
