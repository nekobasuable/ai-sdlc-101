-- PR #6 のレビューの指摘: 仕分け(領域、象限)や「今やる」に置いたときの状態の変化でも updated_at が進み、
-- 同期が「アプリ側の変更」とみなして Google ToDo に書き込んでいた(R32 で Google 側の編集を上書きするおそれ。spec C13)。
-- items の updated_at は、Google ToDo に関係する変更(題名、締め切り、完了かどうか、削除)のときだけ進める。

create or replace function public.set_items_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.body is distinct from old.body
     or new.due_date is distinct from old.due_date
     or (new.status = 'done') is distinct from (old.status = 'done')
     or new.deleted_at is distinct from old.deleted_at then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger set_updated_at on public.items;
create trigger set_updated_at before update on public.items
  for each row execute function public.set_items_updated_at();
