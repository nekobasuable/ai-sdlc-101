// 手で描いたような丸(スキル: 終えた)。終えたら中にチェックを描く
export default function HandCircle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={onClick}
      className="-ml-2 flex size-11 shrink-0 items-center justify-center text-ink"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
        <path d="M13 2.6c5.9.1 10.4 4.8 10.3 10.6-.1 5.8-4.8 10.4-10.6 10.3C6.9 23.4 2.5 18.7 2.6 12.9 2.7 7.4 7.1 2.8 12.5 2.9" />
        {checked && <path d="M8.2 13.4c1.3 1.1 2.4 2.4 3.4 3.8 2-3.6 4.2-6.4 6.6-8.6" strokeWidth="1.4" />}
      </svg>
    </button>
  )
}
