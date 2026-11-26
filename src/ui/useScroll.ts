import { useSyncExternalStore } from 'react'
import { pupilShift, skyOffset } from '../domain/scroll'

// スクロールへの応え方(spec R43 補、plan/020)。ページ全体で1つだけスクロールを見張り、
// 描画のたびに1回だけ値を更新する(requestAnimationFrame)。動きを減らす設定では、何も動かさない値を返す
export type ScrollState = { sky: number; pupil: number; scrolled: boolean }

const STILL: ScrollState = { sky: 0, pupil: 0, scrolled: false }
let state: ScrollState = STILL
let lastY = 0
let frame = 0
let idle = 0
const listeners = new Set<() => void>()

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function set(next: ScrollState) {
  if (next.sky === state.sky && next.pupil === state.pupil && next.scrolled === state.scrolled) return
  state = next
  listeners.forEach((l) => l())
}

function onScroll() {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    const y = window.scrollY
    const velocity = y - lastY
    if (reduced()) {
      set({ ...STILL, scrolled: y > 0 })
    } else {
      set({ sky: skyOffset(y), pupil: pupilShift(velocity), scrolled: y > 0 })
      // 止まったら、瞳を元に戻す
      window.clearTimeout(idle)
      idle = window.setTimeout(() => set({ ...state, pupil: 0 }), 160)
    }
    lastY = y
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('scroll', onScroll)
  }
}

export function useScroll(): ScrollState {
  return useSyncExternalStore(subscribe, () => state, () => STILL)
}
