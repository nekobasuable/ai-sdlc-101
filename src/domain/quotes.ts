// 哲学者や思想家の言葉(spec R18、R19、C3)。
// 日本語訳の言い回しをそのまま使わず、意味を保った言い換えにして、人物と著作を添える。出典を確かめられないものは入れない。
export type Scene = 'day' | 'night' | 'week'
export type Quote = { text: string; who: string; source: string; scenes: readonly Scene[] }

export const QUOTES: readonly Quote[] = [
  { text: '人が失うのは、いま生きているこの人生だけだ。', who: 'マルクス・アウレリウス', source: '自省録 2.14', scenes: ['day'] },
  { text: '人生は短いのではない。私たちがその多くを浪費しているのだ。', who: 'セネカ', source: '人生の短さについて', scenes: ['day', 'week'] },
  { text: '幸福に生きるために必要なものは、ごくわずかだ。', who: 'マルクス・アウレリウス', source: '自省録 7.67', scenes: ['day'] },
  { text: '器は、その空いたところがあるから役に立つ。', who: '老子', source: '道徳経 11章', scenes: ['night', 'week'] },
  { text: 'ミネルヴァのふくろうは、夕暮れが訪れてはじめて飛び立つ。', who: 'ヘーゲル', source: '法の哲学 序文', scenes: ['night'] },
  { text: '物事には、私たちの力の及ぶものと、及ばないものがある。', who: 'エピクテトス', source: '要録 1', scenes: ['week'] },
]

/** 場面と日付で1つ選ぶ。同じ日の同じ場面なら同じ言葉 */
export function pickQuote(scene: Scene, date: string): Quote {
  const pool = QUOTES.filter((q) => q.scenes.includes(scene))
  const day = Number(date.replaceAll('-', ''))
  return pool[day % pool.length]
}
