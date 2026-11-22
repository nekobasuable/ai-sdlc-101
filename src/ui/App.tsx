import { useEffect, useState } from 'react'
import { currentBlock } from '../domain/blocks'

// 配線の確認用の最小の画面(plan/001)。タイムゾーンは設定機能ができるまで端末のものを使う
export default function App() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const block = currentBlock(now, timeZone)

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-sm text-stone-500">今</p>
      <h1 className="text-3xl text-stone-800">
        {block ? `${block.label}の時間です` : '静かな時間です'}
      </h1>
    </main>
  )
}
