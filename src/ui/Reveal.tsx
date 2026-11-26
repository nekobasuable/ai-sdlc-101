import { useEffect, useRef, useState, type ReactNode } from 'react'

// 見えてきたら、墨がにじむように現れる(spec R43 補、plan/020)。一度現れたら、それきり動かさない。
// 開いたときに最初から見えているものは、そのまま見せる(全部が一度ににじむと、うるさいため)。動きを減らす設定では、そのまま見せる
export default function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'shown' | 'waiting' | 'revealed'>('shown')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) return
    setPhase('waiting')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('revealed')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`${phase === 'waiting' ? 'opacity-0' : phase === 'revealed' ? 'ink-in' : ''} ${className}`}>
      {children}
    </div>
  )
}
