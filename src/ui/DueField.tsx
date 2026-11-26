import { useState } from 'react'
import { toDueDate } from '../domain/capture'
import { shortDate } from '../domain/due'

/**
 * 締め切りを付ける、直す、外す小さな欄(spec R7 補、R51、plan/025)。追加の欄と、やることの詳細で使う。
 * 押すと日付を選ぶ欄が開く(スマホでは OS の日付の選び方が出る)。評価の色や警告の口調は付けない
 */
export default function DueField({ id, value, onChange, className = '' }: { id: string; value: string | null; onChange: (value: string | null) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const link = 'min-h-11 font-hand text-sm text-ink-3'
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 ${className}`}>
      {open ? (
        <>
          <label htmlFor={id} className="font-hand text-sm text-ink-3">
            〆
          </label>
          <input
            id={id}
            type="date"
            value={value ?? ''}
            autoFocus
            onChange={(e) => {
              const next = toDueDate(e.target.value)
              onChange(next)
              if (next) setOpen(false)
            }}
            onBlur={() => setOpen(false)}
            className="min-h-11 border-b border-rule bg-transparent font-hand text-sm text-ink outline-none"
          />
        </>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={link}>
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
