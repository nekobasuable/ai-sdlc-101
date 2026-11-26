// plan/005 段階 C: Google ToDo との同期で「どちらに何をするか」を決める純粋な関数。
// 通信やデータベースには触れない。結果の適用は supabase/functions/google-tasks/ が行う。

/** 人生の柱の id(plan/022 で、固定の5つから本人が決める柱に改めた) */
export type Area = string

/** アプリの項目(同期に関係する列だけ) */
export type LocalItem = {
  id: string
  body: string
  area: Area | null
  dueDate: string | null // YYYY-MM-DD
  status: 'inbox' | 'candidate' | 'someday' | 'done'
  googleTaskId: string | null
  googleListId: string | null
  googleUpdatedAt: string | null // 前回の同期で見た Google 側の更新時刻
  updatedAt: string
  syncedAt: string | null // 最後に同期した時刻(同期の書き込みでは updatedAt と同じになる)
  deletedAt: string | null
}

/** Google ToDo のタスク(必要な項目だけに整えたもの) */
export type RemoteTask = {
  id: string
  listId: string
  title: string
  due: string | null // YYYY-MM-DD
  completed: boolean
  deleted: boolean
  updated: string
}

export type ListLink = { listId: string; area: Area | null; isDefault: boolean }

export type SyncOp =
  | { kind: 'createLocal'; task: RemoteTask; area: Area | null }
  | { kind: 'updateLocal'; item: LocalItem; task: RemoteTask }
  | { kind: 'deleteLocal'; item: LocalItem }
  | { kind: 'createRemote'; item: LocalItem; listId: string }
  | { kind: 'updateRemote'; item: LocalItem; taskId: string; listId: string }
  | { kind: 'deleteRemote'; item: LocalItem; taskId: string; listId: string }

const time = (iso: string) => Date.parse(iso)

/** アプリ側の内容が、前回の同期のあとに変わったか */
function localChanged(item: LocalItem): boolean {
  return item.syncedAt === null || time(item.updatedAt) > time(item.syncedAt)
}

/** Google 側の内容が、前回の同期のあとに変わったか */
function remoteChanged(item: LocalItem, task: RemoteTask): boolean {
  return item.googleUpdatedAt === null || time(task.updated) !== time(item.googleUpdatedAt)
}

/**
 * 既定のリスト。明示的に選んだものがなければ、同期しているリストの最初の1つ(R31)。
 * 「つなげば、そのまま双方向に同期される」ことを優先する(plan/005 の確認で、プロダクトオーナーの指摘を受けて変更)。
 */
export function defaultList(links: ListLink[]): string | null {
  return (links.find((l) => l.isDefault) ?? links[0])?.listId ?? null
}

/** アプリの項目を作る先のリスト。領域に結びついたリスト、なければ既定のリスト(R31) */
function targetList(item: LocalItem, links: ListLink[]): string | null {
  const byArea = item.area ? links.find((l) => l.area === item.area) : undefined
  return byArea?.listId ?? defaultList(links)
}

export function planSync(items: LocalItem[], tasks: RemoteTask[], links: ListLink[]): SyncOp[] {
  const ops: SyncOp[] = []
  const linkedLists = new Set(links.map((l) => l.listId))
  const tasksById = new Map(tasks.filter((t) => linkedLists.has(t.listId)).map((t) => [t.id, t]))
  const knownTaskIds = new Set<string>()

  for (const item of items) {
    if (item.googleTaskId) knownTaskIds.add(item.googleTaskId)

    // Google ToDo と結びついていない項目: Google に作る(完了済みと削除済みは送らない)
    if (!item.googleTaskId) {
      if (item.deletedAt || item.status === 'done') continue
      const listId = targetList(item, links)
      if (listId) ops.push({ kind: 'createRemote', item, listId })
      continue
    }

    // 同期の対象から外したリストの項目は、触らない
    if (!item.googleListId || !linkedLists.has(item.googleListId)) continue
    const task = tasksById.get(item.googleTaskId)
    const taskAlive = task !== undefined && !task.deleted

    // アプリで削除した(R33)
    if (item.deletedAt) {
      if (taskAlive) ops.push({ kind: 'deleteRemote', item, taskId: task.id, listId: task.listId })
      continue
    }
    // Google で削除された(R33)
    if (!taskAlive) {
      ops.push({ kind: 'deleteLocal', item })
      continue
    }

    const local = localChanged(item)
    const remote = remoteChanged(item, task)
    if (!local && !remote) continue
    // 両方変わっていたら、あとから変更したほうを正とする(R32)
    const remoteWins = remote && (!local || time(task.updated) >= time(item.updatedAt))
    ops.push(
      remoteWins
        ? { kind: 'updateLocal', item, task }
        : { kind: 'updateRemote', item, taskId: task.id, listId: task.listId },
    )
  }

  // Google にだけあるタスク: アプリに作る。完了済みのタスクは取り込まない(過去の課題で Inbox を埋めないため)
  for (const task of tasksById.values()) {
    if (knownTaskIds.has(task.id) || task.deleted || task.completed) continue
    const area = links.find((l) => l.listId === task.listId)?.area ?? null
    ops.push({ kind: 'createLocal', task, area })
  }
  return ops
}

/** Google のタスクの内容を、アプリの項目の状態に直す。完了の解除は Inbox に戻す */
export function statusFromTask(task: RemoteTask, current: LocalItem['status']): LocalItem['status'] {
  if (task.completed) return 'done'
  return current === 'done' ? 'inbox' : current
}

export type StoredLink = ListLink

/**
 * Google から取ったリストの一覧を、同期の対象のリストにする(spec 変更 3、R29、R31)。
 * すべてのリストを対象にし、保管された結びつきは領域の上書きにだけ使う。
 * 既定のリストは、保管された既定(今もあるもの)、なければ一覧の最初。
 */
export function linksFromLists(lists: { id: string }[], stored: StoredLink[]): ListLink[] {
  const storedDefault = stored.find((s) => s.isDefault && lists.some((l) => l.id === s.listId))?.listId
  const defaultId = storedDefault ?? lists[0]?.id
  return lists.map((l) => ({
    listId: l.id,
    area: stored.find((s) => s.listId === l.id)?.area ?? null,
    isDefault: l.id === defaultId,
  }))
}
