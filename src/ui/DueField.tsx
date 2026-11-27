import { useEffect, useRef, useState } from 'react'
import { toDueDate } from '../domain/capture'
import { shortDate } from '../domain/due'

/**
 * 締め切りを付ける、直す、外す小さな欄(spec R7 補、R51、plan/025)。追加の欄と、やることの詳細で使う。
 * 押すと日付を選ぶ欄が開く(スマホでは OS の日付の選び方が出る)。評価の色や警告の口調は付けない。
 * 選んでいるあいだの値は手元に持ち、欄を離れたとき(または Enter)に1回だけ渡す。
 * キーボードで年を打つ途中の値で保存したり、既存の締め切りを外したりしないため(PR #25 のレビューの指摘)
 */
export default function DueField({ id, value, onChange, className = '' }: { id: string; value: string | null; onChange: (value: string | null) => void; className?: string }) {
  // 開いているあいだの下書き。null なら閉じている
  const [draft, setDraft] = useState<string | null>(null)
  const open = draft !== null
  const link = 'min-h-11 font-hand text-sm text-ink-3'
  const box = useRef<HTMLSpanElement>(null)

  // 何も選ばないうちに欄の外を押したら閉じる(PR #25 のレビューの Nit)。
  // 離れただけでは閉じない(OS の日付の選び方が開くと先に欄から離れる端末があるが、そのあいだはページが押されない)
  useEffect(() => {
    if (draft !== '') return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setDraft(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [draft])

  function close(text = draft) {
    if (text === null) return
    const next = toDueDate(text)
    setDraft(null)
    // 形の整った日付のときだけ渡す。空や途中の値なら、今の締め切りのまま(外すのは「外す」で)
    if (next && next !== value) onChange(next)
  }

  return (
    <span ref={box} className={`inline-flex flex-wrap items-center gap-x-3 ${className}`}>
      {open ? (
        <>
          <label htmlFor={id} className="font-hand text-sm text-ink-3">
            〆
          </label>
          <input
            id={id}
            type="date"
            value={draft}
            min="2000-01-01"
            max="2100-12-31"
            autoFocus
            onChange={(e) => {
              // OS の日付の選び方が欄から離れた後に値を返したとき(端末による)は、その場で渡す
              if (document.activeElement !== e.target && toDueDate(e.target.value)) return close(e.target.value)
              setDraft(e.target.value)
            }}
            // まだ何も選んでいないうちは、離れただけでは閉じない(上の pointerdown で閉じる)。
            // ほかの欄へ移ったとき(relatedTarget がある)は閉じる。Esc でも閉じる
            onBlur={(e) => (draft !== '' || e.relatedTarget) && close()}
            onKeyDown={(e) => {
              // Enter で閉じる。追加の欄では、フォームを送らない(締め切りを選んだだけで追加されないように)
              if (e.key === 'Enter') {
                e.preventDefault()
                close()
              }
              if (e.key === 'Escape') setDraft(null)
            }}
            className="min-h-11 border-b border-rule bg-transparent font-hand text-sm text-ink outline-none"
          />
        </>
      ) : (
        <button type="button" onClick={() => setDraft(value ?? '')} className={link}>
          {value ? `〆 ${shortDate(value)}` : '〆'}
        </button>
      )}
      {value && !open && (
        <button type="button" aria-label="締め切りを外す" onClick={() => onChange(null)} className={link}>
          外す
        </button>
      )}
    </span>
  )
}
