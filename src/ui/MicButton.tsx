// マイクのボタン(plan/012、動きは plan/013)。スキルに従い、箱にしない。線画だけ。聞いている間は線を濃くし、言葉を添える
export default function MicButton({ listening, onToggle }: { listening: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={listening ? '聞き取りを止める' : '話して入れる'}
      aria-pressed={listening}
      onClick={onToggle}
      className={`flex min-h-11 shrink-0 items-center gap-1 px-2 ${listening ? 'text-ink' : 'text-ink-3'}`}
    >
      {/* 聞いている間は、マイクのまわりに墨の波紋が広がる(plan/013) */}
      <span className="relative flex">
        {listening && [0, 0.8, 1.6].map((d) => <span key={d} aria-hidden="true" className="ripple" style={{ animationDelay: `${d}s` }} />)}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={listening ? 1.8 : 1.25} strokeLinecap="round" aria-hidden="true">
        <path d="M12 3.5c1.7 0 3 1.3 3 3v5.2c0 1.7-1.3 3-3 3s-3-1.3-3-3V6.5c0-1.7 1.3-3 3-3z" />
        <path d="M6.5 11.2c0 3.2 2.5 5.6 5.5 5.6s5.5-2.4 5.5-5.6M12 16.8v3.7" />
      </svg>
      </span>
      {listening && <span className="font-hand text-sm">聞いています</span>}
    </button>
  )
}
