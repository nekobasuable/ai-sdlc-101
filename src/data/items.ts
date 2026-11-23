import type { Area } from '../domain/areas'
import type { Quadrant } from '../domain/quadrant'
import type { Slot } from '../domain/slot'
import type { Database } from './database.types'
import { failure, toResult, type DataResult } from './result'
import { supabase } from './supabase'

type Tables = Database['public']['Tables']
export type Item = Pick<Tables['items']['Row'], 'id' | 'body' | 'status'> & { area: Area | null; quadrant: Quadrant | null; dueDate: string | null }
export type PlacementResult = NonNullable<Tables['placements']['Row']['result']>
export type NowEntry = { placementId: string; result: PlacementResult | null; item: Item }

const NOT_CONFIGURED = { ok: false, message: 'Supabase の設定がまだありません。' } as const

/** 放り込む(R1、R3)。未分類のまま Inbox に入る */
export async function addItem(body: string): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').insert({ body })
  return toResult(null, error)
}

export async function listInbox(): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('items')
    .select('id, body, status, area, quadrant, due_date')
    .eq('status', 'inbox')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

type ItemRow = { id: string; body: string; status: string; area: string | null; quadrant: number | null; due_date: string | null }
// 領域と象限はデータベースの制約で値が限られているので、決まった値の型として受け取る
const toItem = (r: ItemRow): Item => ({ id: r.id, body: r.body, status: r.status, area: r.area as Area | null, quadrant: r.quadrant as Quadrant | null, dueDate: r.due_date })

/** 締め切りのある未完了の項目(spec R38、R39)。to まで(含む)、from があればそこから(含む) */
export async function listDue(range: { from?: string; to: string }): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  let query = supabase
    .from('items')
    .select('id, body, status, area, quadrant, due_date')
    .in('status', ['inbox', 'candidate'])
    .is('deleted_at', null)
    .not('due_date', 'is', null)
    .lte('due_date', range.to)
  if (range.from) query = query.gte('due_date', range.from)
  const { data, error } = await query.order('due_date')
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

/** ブロックに置かずに、項目を終えた印にする(R38)。次の同期で Google ToDo にも届く */
export async function completeItem(itemId: string): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').update({ status: 'done' }).eq('id', itemId)
  return toResult(null, error)
}

/** 今のブロックに置いた項目 */
export async function listNow(slot: Slot): Promise<DataResult<NowEntry[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('placements')
    .select('id, result, item:items(id, body, status, area, quadrant, due_date, deleted_at)')
    .eq('week_start', slot.weekStart)
    .eq('day', slot.day)
    .eq('block_id', slot.blockId)
    .order('created_at')
  if (error) return failure(error)
  return {
    ok: true,
    // 削除済み(Google ToDo で消された項目など)は出さない
    data: data.flatMap((p) =>
      p.item && !p.item.deleted_at
        ? [{ placementId: p.id, result: p.result as PlacementResult | null, item: toItem(p.item) }]
        : [],
    ),
  }
}

/** ブロックに置く(今やる R14a、週の計画 R8)。Inbox から外して候補にする */
export async function placeNow(itemId: string, slot: Slot): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const placed = await supabase
    .from('placements')
    .insert({ item_id: itemId, week_start: slot.weekStart, day: slot.day, block_id: slot.blockId })
  if (placed.error) return failure(placed.error)
  const { error } = await supabase.from('items').update({ status: 'candidate' }).eq('id', itemId)
  return toResult(null, error)
}

/** 記録する(R14)。「やった」なら項目を完了にする。それ以外は候補に戻す */
export async function setResult(entry: NowEntry, result: PlacementResult): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const recorded = await supabase.from('placements').update({ result }).eq('id', entry.placementId)
  if (recorded.error) return failure(recorded.error)
  const status = result === 'done' ? 'done' : 'candidate'
  const { error } = await supabase.from('items').update({ status }).eq('id', entry.item.id)
  return toResult(null, error)
}

/** 今のブロックから外して、Inbox に戻す(R14a) */
export async function unplace(entry: NowEntry): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const removed = await supabase.from('placements').delete().eq('id', entry.placementId)
  if (removed.error) return failure(removed.error)
  // ほかのブロックにも置いてあれば、候補のままにする
  const rest = await supabase.from('placements').select('id', { count: 'exact', head: true }).eq('item_id', entry.item.id)
  if (rest.error) return failure(rest.error)
  if ((rest.count ?? 0) > 0) return { ok: true, data: null }
  // Inbox に戻すのは、候補(未完了)のときだけ。完了した項目は完了のままにする(PR #2 のレビューの指摘)
  const { error } = await supabase.from('items').update({ status: 'inbox' }).eq('id', entry.item.id).eq('status', 'candidate')
  return toResult(null, error)
}

export type WeekEntry = NowEntry & { day: number; blockId: string }

/** 週に置いた項目(R13a) */
export async function listWeek(weekStart: string): Promise<DataResult<WeekEntry[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('placements')
    .select('id, day, block_id, result, item:items(id, body, status, area, quadrant, due_date, deleted_at)')
    .eq('week_start', weekStart)
    .order('created_at')
  if (error) return failure(error)
  return {
    ok: true,
    data: data.flatMap((p) =>
      p.item && !p.item.deleted_at
        ? [{ placementId: p.id, day: p.day, blockId: p.block_id, result: p.result as PlacementResult | null, item: toItem(p.item) }]
        : [],
    ),
  }
}

/** ブロックに置ける候補: 完了しておらず、「いつか/やらない」でもない項目 */
export async function listCandidates(): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('items')
    .select('id, body, status, area, quadrant, due_date')
    .in('status', ['inbox', 'candidate'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

/** 仕分け: 項目の領域と象限を書き換える(R4)。Google ToDo には送らない */
export async function classifyItem(itemId: string, meta: { area: Area | null; quadrant: Quadrant | null }): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').update(meta).eq('id', itemId)
  return toResult(null, error)
}

/** その期間に完了になった項目(省みるの「ほかに終えたこと」に使う。配置の有無は呼ぶ側で見る) */
export async function listCompletedBetween(start: Date, end: Date): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('items')
    .select('id, body, status, area, quadrant, due_date')
    .eq('status', 'done')
    .is('deleted_at', null)
    .gte('updated_at', start.toISOString())
    .lt('updated_at', end.toISOString())
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

/** 手放したことを選び直す(R17): やることに戻す、または「いつか/やらない」に */
export async function reconsider(itemId: string, to: 'inbox' | 'someday'): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').update({ status: to }).eq('id', itemId)
  return toResult(null, error)
}
