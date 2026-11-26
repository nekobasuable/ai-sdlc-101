import { createContext, useContext } from 'react'
import type { Item } from '../data/items'
import type { Classify } from './ItemMeta'

// やることの詳細から使う操作(plan/022 C)。App が「今」の画面で用意して渡す。保存できたかを返す
export type ItemActions = {
  classify: Classify
  /** 今のブロックがあるときだけ */
  place: ((item: Item) => Promise<boolean>) | null
  complete: (item: Item) => Promise<boolean>
  letGo: (item: Item) => Promise<boolean>
  /** メモや最初の一歩を残したあと、読み直す */
  refresh: () => void
}

const noop = async () => false
export const ItemActionsContext = createContext<ItemActions>({ classify: () => undefined, place: null, complete: noop, letGo: noop, refresh: () => undefined })

export function useItemActions(): ItemActions {
  return useContext(ItemActionsContext)
}
