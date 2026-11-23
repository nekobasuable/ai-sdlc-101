import { useEffect, useState } from 'react'
import { RECONNECT, syncNow } from '../data/sync'

const EVERY_MS = 5 * 60 * 1000

/**
 * 操作なしで Google ToDo と同期する(spec 変更 3、R34)。
 * アプリを開いたとき、画面に戻ってきたとき、開いている間は5分ごと。画面が裏にあるときは同期しない。
 * 同期のたびに onSynced を呼ぶ(画面とカレンダーを読み直すため)。つながりが切れていたら、その一言を返す。
 */
export function useAutoSync(onSynced: () => void): string | null {
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let running = false
    const run = async () => {
      if (running || document.hidden) return
      running = true
      try {
        const res = await syncNow()
        setNotice(!res.ok && res.message === RECONNECT ? RECONNECT : null)
      } finally {
        // 想定外の例外が起きても、次の同期が止まらないようにする(PR #4 のレビューの Nit)
        running = false
        onSynced()
      }
    }
    void run()
    const onVisible = () => {
      if (!document.hidden) void run()
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => void run(), EVERY_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
    // onSynced は版の番号を上げるだけの関数なので、最初の1回の登録で足りる
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return notice
}
