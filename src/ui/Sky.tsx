import type { CSSProperties } from 'react'
import type { Period } from '../domain/period'

// 時間帯の空(spec R44、plan/013)。墨の線で、少しずつ描かれる。時間帯が変わると描き直す(呼ぶ側で key に時間帯を渡す)
const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` })
const long = { '--len': 420 } as CSSProperties

export default function Sky({ period }: { period: Period }) {
  return (
    <svg className="block h-auto w-full max-w-[420px]" viewBox="0 0 330 96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
      {period === 'morning' && (
        <g className="text-ink-2">
          <path className="ink-draw" style={long} d="M0 80C60 79 120 81 180 80S290 79 330 80" />
          <path className="ink-draw" style={{ ...long, ...delay(0.6) }} d="M128 80a28 28 0 0 1 56 0" />
          <path className="ink-draw" style={{ ...long, ...delay(1.1) }} d="M156 40v-12M126 50l-8-8M186 50l8-8M112 70h-10M200 70h10" />
        </g>
      )}
      {period === 'noon' && (
        <g className="text-ink-2">
          <path className="ink-draw" style={long} d="M70 64c-10 0-12-12-3-14 0-12 16-16 22-6 6-10 24-8 24 6 10 0 12 14 0 14z" />
          <path className="ink-draw" style={{ ...long, ...delay(0.6) }} d="M200 46c-7 0-8-8-2-9 0-8 11-10 15-4 4-6 16-5 16 4 7 0 8 9 0 9z" />
          <circle className="ink-draw" style={{ ...long, ...delay(1.1) }} cx="276" cy="30" r="11" />
        </g>
      )}
      {period === 'evening' && (
        <g className="text-ink-2">
          <path className="ink-draw" style={long} d="M0 70C60 69 120 71 180 70S290 69 330 70" />
          <path className="ink-draw" style={{ ...long, ...delay(0.6) }} d="M236 70a22 22 0 0 1 44 0" />
          <path className="ink-draw" style={{ ...long, ...delay(1.1) }} d="M226 80h64M240 88h36M250 94h16" />
          <path className="ink-draw" style={{ ...long, ...delay(1.5) }} d="M60 30c4-3 7-3 10 0 3-3 6-3 10 0M92 18c3-2 5-2 7 0 2-2 4-2 7 0" />
        </g>
      )}
      {period === 'night' && (
        <g className="text-ink">
          <path className="ink-draw" style={long} d="M262 14a26 26 0 1 0 22 40 21 21 0 1 1-22-40z" />
          {[
            ['M60 30v8M56 34h8', 0.4],
            ['M128 58v6M125 61h6', 0.8],
            ['M190 22v6M187 25h6', 1.1],
            ['M20 72v5M17.5 74.5h5', 1.4],
          ].map(([d, s]) => (
            <g key={d as string} className="twinkle" style={delay((s as number) + 1.5)}>
              <path className="ink-draw" style={{ ...long, ...delay(s as number) }} d={d as string} />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}
