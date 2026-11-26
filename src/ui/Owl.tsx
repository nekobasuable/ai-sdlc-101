import { useEffect, useRef, useState } from 'react'
import type { OwlPose } from '../domain/owl'
import { useScroll } from './useScroll'

/** 省みる画面での様子(plan/013): 聞いている間は首をかしげ、整えている間は目をきょろきょろ、下書きが出たらうなずく */
export type OwlMood = 'listen' | 'think' | 'nod' | null

// 墨の線で描いたふくろう(spec R36)。説明はしない。
// 動き(spec R43、R36 補、plan/013): 開いたときに舞い降りる。起きているあいだは瞬き、眠っているあいだは寝息。
// 押すと跳ねて「ほう。」と一言。nudge の値が変わったとき(終えたときなど)も跳ねる
/** small: 上のバーに置くときの、少し小さな姿(plan/021) */
export default function Owl({ pose, className = '', mood = null, nudge = 0, small = false }: { pose: OwlPose; className?: string; mood?: OwlMood; nudge?: number; small?: boolean }) {
  const label = pose === 'sleep' ? '眠っているふくろう' : pose === 'read' ? '本を読むふくろう' : 'ふくろう'
  // スクロールに合わせて、瞳が少しだけ上下に追う(plan/020)
  const { pupil } = useScroll()
  const [hop, setHop] = useState(0)
  const [hoo, setHoo] = useState(false)
  const timers = useRef<number[]>([])
  const first = useRef(nudge)

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  useEffect(() => {
    // 最初の値では跳ねない(開いたときは舞い降りる動きだけ)
    if (nudge !== first.current) setHop((h) => h + 1)
  }, [nudge])

  const poke = () => {
    setHop((h) => h + 1)
    setHoo(true)
    timers.current.push(window.setTimeout(() => setHoo(false), 1800))
  }

  const asleep = pose === 'sleep'
  const Tag = asleep ? 'span' : 'button'
  const moodClass = mood === 'listen' ? 'owl-listen' : mood === 'nod' ? 'owl-nod' : ''
  return (
    // 眠っている姿は押しても何もしないので、ボタンにしない(キーボードで選べないように。PR #17 のレビューの Nit)
    <Tag
      {...(asleep ? { role: 'img' } : { type: 'button' as const, onClick: poke })}
      aria-label={label}
      className={`owl-land flex ${small ? 'size-11 items-center' : 'size-14 items-start'} justify-center text-ink ${className.includes('absolute') ? '' : 'relative'} ${className}`}
    >
      {/* key を変えると、跳ねる動きをもう一度最初から再生できる */}
      <span key={hop} className={`block ${hop > 0 ? 'owl-hop' : ''}`}>
        <svg className={`block ${moodClass}`} width={small ? 32 : 46} height={small ? 36 : 52} viewBox="0 0 46 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g className={pose === 'sleep' ? 'owl-breathe' : ''}>
            <path d="M10 14c-1.5-4-1-8 1-10 2.5 3 6 4.5 12 4.5S32.5 7 35 4c2 2 2.5 6 1 10" />
            <path d="M9.5 14C6 20 6 34 11 40c3.5 4.2 8 6 12 6s8.5-1.8 12-6c5-6 5-20 1.5-26" />
            {pose === 'watch' && (
              <>
                <g className="owl-blink">
                  <circle cx="16.5" cy="19" r="4.2" />
                  <circle cx="29.5" cy="19" r="4.2" />
                  <g style={{ transform: `translateY(${pupil}px)`, transition: 'transform 0.2s ease-out' }}>
                    <g className={mood === 'think' ? 'owl-look' : ''}>
                      <circle cx="17" cy="19.5" r="1" fill="currentColor" />
                      <circle cx="29" cy="19.5" r="1" fill="currentColor" />
                    </g>
                  </g>
                </g>
                <path d="M15 31c2 1.5 3 1.5 4 0M23 33c2 1.5 3 1.5 4 0M17.5 37c2 1.5 3 1.5 4 0" />
              </>
            )}
            {pose === 'sleep' && (
              <>
                <path d="M13 19c2 1.6 4.5 1.6 6.5 0M26.5 19c2 1.6 4.5 1.6 6.5 0" />
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
          </g>
          {pose === 'sleep' && <path className="twinkle" d="M39 7h3l-3 3.5h3M42.5 1.5h2l-2 2.3h2" strokeWidth="1" />}
          <path d="M16 46.5v3M30 46.5v3M4 50h38" />
        </svg>
      </span>
      {hoo && (
        <span className="hoo pointer-events-none absolute top-full left-1/2 -translate-x-1/2 font-hand text-sm whitespace-nowrap text-ink" aria-live="polite">
          ほう。
        </span>
      )}
    </Tag>
  )
}
