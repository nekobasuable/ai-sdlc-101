-- plan/006 の PR レビューの指摘: 同期が重なると Google ToDo に同じタスクが2つできる(spec C13)。
-- 同期を始めるときにこの時刻を書き込み(リース)、終わったら消す。
-- 書き込みは「空か、期限(関数側の LEASE_MS)より古いとき」だけ成功するので、同じ利用者の同期は同時に1つだけになる。
-- 期限より古いものは、途中で止まった同期の残りとみなして上書きする。
alter table public.google_credentials add column sync_started_at timestamptz;
