import { pickQuote, type Screen } from '../domain/quotes'

// 1画面に1つだけ、小さく、出典を添えて(スキル、spec R18)。時間帯ごとに変わる(変更 7)
export default function QuoteLine({ screen, now, timeZone }: { screen: Screen; now: Date; timeZone: string }) {
  const q = pickQuote(screen, now, timeZone)
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
