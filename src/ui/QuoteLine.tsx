import { pickQuote, type Scene } from '../domain/quotes'

// 1画面に1つだけ、小さく、出典を添えて(スキル、spec R18)
export default function QuoteLine({ scene, date }: { scene: Scene; date: string }) {
  const q = pickQuote(scene, date)
  return (
    <figure className="m-0 font-mincho text-[13px] leading-loose text-ink-3">
      <blockquote className="m-0 inline">{q.text}</blockquote>
      <figcaption className="inline text-ink-3">
        {'　'}
        {q.who}『{q.source}』
      </figcaption>
    </figure>
  )
}
