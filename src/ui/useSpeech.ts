import { useEffect, useRef, useState } from 'react'
import { heardText } from '../domain/speech-text'

// ブラウザの音声認識を包む(plan/012、spec R2)。使えないブラウザでは supported が false になり、ボタンを出さない
type Result = { transcript: string; isFinal: boolean }
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * @param onHeard 聞き取りの途中も含めて、聞き取った文字(この聞き取りを始めてからの分)を渡す
 */
export function useSpeech(onHeard: (heard: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<Recognition | null>(null)
  // 止めたあとに遅れて届く結果は捨てる(止めた直後に、手で直した文字や送った文字を上書きしないため。PR #9 のレビューの指摘)
  const stoppedRef = useRef(true)
  const onHeardRef = useRef(onHeard)
  useEffect(() => {
    onHeardRef.current = onHeard
  })
  useEffect(() => () => recRef.current?.stop(), [])

  const Ctor = recognitionCtor()

  function start() {
    if (!Ctor || listening) return
    const rec = new Ctor()
    rec.lang = 'ja-JP'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      if (stoppedRef.current) return
      const results: Result[] = Array.from(e.results, (r) => ({ transcript: r[0].transcript, isFinal: r.isFinal }))
      onHeardRef.current(heardText(results))
    }
    rec.onerror = (e) => {
      // onerror のあとに onend が来ないブラウザもあるので、ここでも止まった扱いにする
      stoppedRef.current = true
      setListening(false)
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'マイクが使えない。ブラウザの設定でマイクを許可すると、使えるようになる。' : 'うまく聞き取れなかった。')
    }
    rec.onend = () => {
      stoppedRef.current = true
      setListening(false)
    }
    recRef.current = rec
    stoppedRef.current = false
    setError(null)
    setListening(true)
    rec.start()
  }

  function stop() {
    stoppedRef.current = true
    recRef.current?.stop()
    setListening(false)
  }

  return { supported: Ctor !== null, listening, error, start, stop }
}
