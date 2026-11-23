import { signInWithGoogle } from '../data/supabase'

export default function SignIn() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 text-stone-800">
      <h1 className="text-2xl">life-dashboard</h1>
      <p className="text-stone-500">今を選ぶための、小さなダッシュボード。</p>
      <button className="self-start rounded border border-stone-300 px-4 py-2" onClick={signInWithGoogle}>
        Google でログイン
      </button>
    </main>
  )
}
