import { describe, expect, it } from 'vitest'
import { linksFromLists, planSync, statusFromTask, type ListLink, type LocalItem, type RemoteTask } from './sync.ts'

const T0 = '2026-11-20T00:00:00.000Z' // 前回の同期
const T1 = '2026-11-21T00:00:00.000Z'
const T2 = '2026-11-22T00:00:00.000Z'

const UNIV: ListLink = { listId: 'univ', area: 'school', isDefault: false }
const DEFAULT: ListLink = { listId: 'life', area: null, isDefault: true }

const task = (over: Partial<RemoteTask> = {}): RemoteTask => ({
  id: 't1',
  listId: 'univ',
  title: '統計のレポート',
  notes: null,
  due: '2026-11-27',
  completed: false,
  deleted: false,
  updated: T0,
  ...over,
})

/** 前回の同期の直後の状態の項目(どちらも変わっていない) */
const synced = (over: Partial<LocalItem> = {}): LocalItem => ({
  id: 'i1',
  body: '統計のレポート',
  notes: null,
  area: 'school',
  dueDate: '2026-11-27',
  status: 'inbox',
  googleTaskId: 't1',
  googleListId: 'univ',
  googleUpdatedAt: T0,
  updatedAt: T0,
  syncedAt: T0,
  deletedAt: null,
  ...over,
})

/** Google と結びついていない、アプリで作った項目 */
const appOnly = (over: Partial<LocalItem> = {}): LocalItem =>
  synced({ id: 'i2', body: '牛乳を買う', area: 'private', googleTaskId: null, googleListId: null, googleUpdatedAt: null, syncedAt: null, ...over })

const kinds = (ops: ReturnType<typeof planSync>) => ops.map((o) => o.kind)

describe('planSync', () => {
  it('Google にだけあるタスクは、リストに結びついた領域でアプリに作る', () => {
    const ops = planSync([], [task()], [UNIV])
    expect(ops).toEqual([{ kind: 'createLocal', task: task(), area: 'school' }])
  })

  it('Google で完了済みのタスクは、新しく取り込まない', () => {
    expect(planSync([], [task({ completed: true })], [UNIV])).toEqual([])
  })

  it('同期しないリストのタスクは無視する', () => {
    expect(planSync([], [task({ listId: 'other' })], [UNIV])).toEqual([])
  })

  it('アプリにだけある項目は、領域に結びついたリストに作る', () => {
    const item = appOnly({ area: 'school' })
    expect(planSync([item], [], [UNIV, DEFAULT])).toEqual([{ kind: 'createRemote', item, listId: 'univ' }])
  })

  it('領域に結びついたリストがなければ、既定のリストに作る', () => {
    const item = appOnly()
    expect(planSync([item], [], [UNIV, DEFAULT])).toEqual([{ kind: 'createRemote', item, listId: 'life' }])
  })

  it('既定のリストを選んでいなければ、同期しているリストの最初の1つに作る', () => {
    const item = appOnly()
    expect(planSync([item], [], [UNIV])).toEqual([{ kind: 'createRemote', item, listId: 'univ' }])
  })

  it('同期しているリストがなければ、Google には送らない', () => {
    expect(planSync([appOnly()], [], [])).toEqual([])
  })

  it('完了済みや削除済みの、アプリにだけある項目は送らない', () => {
    expect(planSync([appOnly({ status: 'done' }), appOnly({ id: 'i3', deletedAt: T1 })], [], [DEFAULT])).toEqual([])
  })

  it('Google 側だけが変わったら、アプリに反映する', () => {
    expect(kinds(planSync([synced()], [task({ title: '統計のレポート(第2回)', updated: T1 })], [UNIV]))).toEqual(['updateLocal'])
  })

  it('アプリ側だけが変わったら、Google に反映する', () => {
    expect(kinds(planSync([synced({ body: '統計のレポートを出す', updatedAt: T1 })], [task()], [UNIV]))).toEqual(['updateRemote'])
  })

  it('両方変わっていて Google が新しければ、Google を正とする', () => {
    const ops = planSync([synced({ updatedAt: T1 })], [task({ updated: T2 })], [UNIV])
    expect(kinds(ops)).toEqual(['updateLocal'])
  })

  it('両方変わっていてアプリが新しければ、アプリを正とする', () => {
    const ops = planSync([synced({ updatedAt: T2 })], [task({ updated: T1 })], [UNIV])
    expect(kinds(ops)).toEqual(['updateRemote'])
  })

  it('Google で削除されたら、アプリでも削除の記録を付ける', () => {
    expect(kinds(planSync([synced()], [task({ deleted: true, updated: T1 })], [UNIV]))).toEqual(['deleteLocal'])
    expect(kinds(planSync([synced()], [], [UNIV]))).toEqual(['deleteLocal'])
  })

  it('アプリで削除したら、Google でも削除する。Google 側がもうなければ何もしない', () => {
    const item = synced({ deletedAt: T1, updatedAt: T1 })
    expect(kinds(planSync([item], [task()], [UNIV]))).toEqual(['deleteRemote'])
    expect(planSync([item], [], [UNIV])).toEqual([])
  })

  it('同期の対象から外したリストの項目は、削除もしない', () => {
    expect(planSync([synced()], [], [DEFAULT])).toEqual([])
  })

  it('どちらも変わっていなければ、何もしない(2回続けて同期しても重複を作らない)', () => {
    expect(planSync([synced()], [task()], [UNIV, DEFAULT])).toEqual([])
  })
})

describe('statusFromTask', () => {
  it('Google で完了なら、アプリでも完了', () => {
    expect(statusFromTask(task({ completed: true }), 'candidate')).toBe('done')
  })

  it('Google で完了を外したら、Inbox に戻す。それ以外の状態はそのまま', () => {
    expect(statusFromTask(task(), 'done')).toBe('inbox')
    expect(statusFromTask(task(), 'someday')).toBe('someday')
  })
})

describe('linksFromLists', () => {
  const lists = [{ id: 'mytasks' }, { id: 'univ' }, { id: 'shopping' }]

  it('すべてのリストを対象にし、何も保管されていなければ最初のリストを既定にする', () => {
    expect(linksFromLists(lists, [])).toEqual([
      { listId: 'mytasks', area: null, isDefault: true },
      { listId: 'univ', area: null, isDefault: false },
      { listId: 'shopping', area: null, isDefault: false },
    ])
  })

  it('保管された領域と既定を上書きに使う', () => {
    const links = linksFromLists(lists, [{ listId: 'univ', area: 'school', isDefault: true }])
    expect(links.find((l) => l.listId === 'univ')).toEqual({ listId: 'univ', area: 'school', isDefault: true })
    expect(links.find((l) => l.listId === 'mytasks')?.isDefault).toBe(false)
  })

  it('保管された既定のリストがもうなければ、最初のリストを既定にする', () => {
    const links = linksFromLists(lists, [{ listId: 'deleted', area: null, isDefault: true }])
    expect(links.filter((l) => l.isDefault).map((l) => l.listId)).toEqual(['mytasks'])
  })

  it('リストが1つもなければ、対象もない', () => {
    expect(linksFromLists([], [])).toEqual([])
  })
})

describe('メモ(Google ToDo の「詳細」、plan/022 C)', () => {
  it('Google でメモだけが変わったら、アプリに取り込む', () => {
    const ops = planSync([synced()], [task({ notes: '第3章まで', updated: T1 })], [UNIV])
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'updateLocal', task: { notes: '第3章まで' } })
  })

  it('アプリでメモだけを変えたら(updated_at が進む)、Google に送る', () => {
    const ops = planSync([synced({ notes: '参考文献を足す', updatedAt: T1 })], [task()], [UNIV])
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'updateRemote', item: { notes: '参考文献を足す' } })
  })

  it('両方でメモを変えたら、あとから変えたほうを正とする', () => {
    const ops = planSync([synced({ notes: 'アプリ', updatedAt: T2 })], [task({ notes: 'Google', updated: T1 })], [UNIV])
    expect(ops[0]).toMatchObject({ kind: 'updateRemote' })
  })
})
