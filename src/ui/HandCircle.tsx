import { useEffect, useRef, useState, type CSSProperties } from 'react'

// 墨のしぶきの粒(位置と大きさ)。ランダムにはしない
const DROPS: readonly [number, number, number][] = [
  [-26, -14, 5],
  [24, -22, 4],
  [30, 10, 5],
  [-18, 22, 3],
  [4, -30, 3],
  [-32, 6, 4],
  [14, 28, 3],
]

// 手で描いたような丸(スキル: 終えた)。開いたときに一筆で描かれ、終えたら中にチェックを書き込み、墨のしぶきが散る(plan/013)
export default function HandCircle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  const [splash, setSplash] = useState(0)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const press = () => {
    if (!checked) {
      setSplash((n) => n + 1)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSplash(0), 1000)
    }
    onClick()
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={press}
      className="relative -ml-2 flex size-11 shrink-0 items-center justify-center text-ink"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
        <path className="ink-draw" d="M13 2.6c5.9.1 10.4 4.8 10.3 10.6-.1 5.8-4.8 10.4-10.6 10.3C6.9 23.4 2.5 18.7 2.6 12.9 2.7 7.4 7.1 2.8 12.5 2.9" />
        {checked && <path className="ink-draw" style={{ '--len': 24, animationDuration: '0.5s' } as CSSProperties} d="M8.2 13.4c1.3 1.1 2.4 2.4 3.4 3.8 2-3.6 4.2-6.4 6.6-8.6" strokeWidth="1.4" />}
      </svg>
      {splash > 0 &&
        DROPS.map(([x, y, size], i) => (
          <span
            key={`${splash}-${i}`}
            className="ink-drop"
            aria-hidden="true"
            style={{ '--x': `${x}px`, '--y': `${y}px`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 } as CSSProperties}
          />
        ))}
    </button>
  )
}
