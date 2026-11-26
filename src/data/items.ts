import type { Quadrant } from '../domain/quadrant'
import { addDays, type Slot } from '../domain/slot'
import { weeksBetween } from '../domain/week-grid'
import type { Database } from './database.types'
import { failure, toResult, type DataResult } from './result'
import { supabase } from './supabase'

type Tables = Database['public']['Tables']
export type Source = 'ai' | 'user'
export type Item = Pick<Tables['items']['Row'], 'id' | 'body' | 'status'> & {
  /** 人生の柱の id(plan/022) */
  area: string | null
  quadrant: Quadrant | null
  dueDate: string | null
  /** 領域と象限が、AI の見立てか本人の判断か(plan/017、R25 改) */
  areaSource: Source | null
  quadrantSource: Source | null
  /** AI の見立ての理由(R26 改) */
  aiReason: string | null
}
export type PlacementResult = NonNullable<Tables['placements']['Row']['result']>
export type NowEntry = { placementId: string; result: PlacementResult | null; item: Item }

const ITEM_COLUMNS = 'id, body, status, area, quadrant, due_date, area_source, quadrant_source, ai_reason'

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
    .select(ITEM_COLUMNS)
    .eq('status', 'inbox')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

type ItemRow = {
  id: string
  body: string
  status: string
  area: string | null
  quadrant: number | null
  due_date: string | null
  area_source: string | null
  quadrant_source: string | null
  ai_reason: string | null
}
// 領域と象限はデータベースの制約で値が限られているので、決まった値の型として受け取る
const toItem = (r: ItemRow): Item => ({
  id: r.id,
  body: r.body,
  status: r.status,
  area: r.area,
  quadrant: r.quadrant as Quadrant | null,
  dueDate: r.due_date,
  areaSource: r.area_source as Source | null,
  quadrantSource: r.quadrant_source as Source | null,
  aiReason: r.ai_reason,
})

/** 締め切りのある未完了の項目(spec R38、R39)。to まで(含む)、from があればそこから(含む) */
export async function listDue(range: { from?: string; to: string }): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  let query = supabase
    .from('items')
    .select(ITEM_COLUMNS)
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
    .select('id, result, item:items(id, body, status, area, quadrant, due_date, area_source, quadrant_source, ai_reason, deleted_at)')
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

/** day は暦の週の曜日(0 = 月曜)。date はその日付(plan/019) */
export type WeekEntry = NowEntry & { day: number; date: string; blockId: string }

/** 週に置いた項目(R13a) */
export async function listWeek(weekStart: string): Promise<DataResult<WeekEntry[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('placements')
    .select('id, day, block_id, result, item:items(id, body, status, area, quadrant, due_date, area_source, quadrant_source, ai_reason, deleted_at)')
    .eq('week_start', weekStart)
    .order('created_at')
  if (error) return failure(error)
  return {
    ok: true,
    data: data.flatMap((p) =>
      p.item && !p.item.deleted_at
        ? [{ placementId: p.id, day: p.day, date: addDays(weekStart, p.day), blockId: p.block_id, result: p.result as PlacementResult | null, item: toItem(p.item) }]
        : [],
    ),
  }
}

/** start の日から7日に置いた項目(spec R8 改、plan/019) */
export async function listPlacementsFrom(start: string): Promise<DataResult<WeekEntry[]>> {
  return listPlacementsBetween(start, addDays(start, 6))
}

/**
 * start から end まで(両端を含む)に置いた項目(plan/019、月のカレンダーは plan/021)。
 * 範囲は暦の週をいくつかまたぐので、その週の分をまとめて読み、日付で絞る。保存の形(暦の週の月曜と曜日)は変えない
 */
export async function listPlacementsBetween(start: string, end: string): Promise<DataResult<WeekEntry[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('placements')
    .select('id, week_start, day, block_id, result, item:items(id, body, status, area, quadrant, due_date, area_source, quadrant_source, ai_reason, deleted_at)')
    .in('week_start', weeksBetween(start, end))
    .order('created_at')
  if (error) return failure(error)
  return {
    ok: true,
    data: data.flatMap((p) => {
      const date = addDays(p.week_start, p.day)
      return p.item && !p.item.deleted_at && date >= start && date <= end
        ? [{ placementId: p.id, day: p.day, date, blockId: p.block_id, result: p.result as PlacementResult | null, item: toItem(p.item) }]
        : []
    }),
  }
}

/** ブロックに置ける候補: 完了しておらず、「いつか/やらない」でもない項目 */
export async function listCandidates(): Promise<DataResult<Item[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .in('status', ['inbox', 'candidate'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return failure(error)
  return { ok: true, data: data.map(toItem) }
}

export type ClassifyChange = { area: string | null } | { quadrant: Quadrant | null }

/**
 * 仕分け: 本人が領域か象限を書き換える(R4)。触れたほうは本人の判断になる(R25 改、plan/017)。Google ToDo には送らない
 */
export async function classifyItem(itemId: string, change: ClassifyChange): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const update = 'area' in change ? { area: change.area, area_source: 'user' } : { quadrant: change.quadrant, quadrant_source: 'user' }
  const { error } = await supabase.from('items').update(update).eq('id', itemId)
  return toResult(null, error)
}

/**
 * その期間に完了になった項目(省みるの「ほかに終えたこと」に使う。配置の有無は呼ぶ側で見る)。
 * 「完了した時刻」として updated_at を使う。updated_at は Google ToDo に関係する変更(完了かどうかを含む)のときだけ進む
 * (マイグレーション 20261124040000)ので成り立つ。その条件を変えたら、ここも見直す(PR #7 のレビューの Nit)。
 */
export async function listCompletedBetween(start: Date, end: Date): Promise<DataResult<Item[]>> {
  const res = await listCompletedWithTimes(start, end)
  return res.ok ? { ok: true, data: res.data.map((d) => d.item) } : res
}

/** その期間に完了になった項目と、完了した時刻(月のカレンダーで、終えた日に置くため。plan/021) */
export async function listCompletedWithTimes(start: Date, end: Date): Promise<DataResult<{ item: Item; at: Date }[]>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase
    .from('items')
    .select(`${ITEM_COLUMNS}, updated_at`)
    .eq('status', 'done')
    .is('deleted_at', null)
    .gte('updated_at', start.toISOString())
    .lt('updated_at', end.toISOString())
  if (error) return failure(error)
  return { ok: true, data: data.map((r) => ({ item: toItem(r), at: new Date(r.updated_at) })) }
}

/** 手放したことを選び直す(R17): やることに戻す、または「いつか/やらない」に */
export async function reconsider(itemId: string, to: 'inbox' | 'someday'): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').update({ status: to }).eq('id', itemId)
  return toResult(null, error)
}

/** 柱を消したとき、その柱が付いていた項目とリストの結びつきを、柱なしに戻す(plan/022)。AI はもう見立てない(見立てを試みた印が残るため) */
export async function clearPillar(pillarId: string): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('items').update({ area: null, area_source: 'user' }).eq('area', pillarId)
  if (error) return failure(error)
  // Google ToDo のリストとの結びつきからも外す(同期で入る項目に、消した柱が付かないように。PR #20 のレビューの Nit)
  const links = await supabase.from('task_list_links').update({ area: null }).eq('area', pillarId)
  return toResult(null, links.error)
}
