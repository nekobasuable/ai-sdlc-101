import { signInWithGoogle } from '../data/supabase'
import Owl from './Owl'

export default function SignIn() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-8">
      <Owl pose="read" />
      <h1 className="m-0 font-mincho text-[28px] leading-relaxed font-normal tracking-wide">今を選ぶための、小さな手帳。</h1>
      <button type="button" onClick={signInWithGoogle} className="min-h-11 self-start font-hand text-[17px] text-ink underline decoration-rule underline-offset-[6px]">
        Google で開く
      </button>
    </main>
  )
}
