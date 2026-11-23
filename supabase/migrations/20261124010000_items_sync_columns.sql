-- plan/005 段階 C: Google ToDo との同期のための列
alter table public.items add column deleted_at timestamptz;  -- 削除の記録(削除を Google 側にも伝えるため)
alter table public.items add column synced_at timestamptz;   -- 最後に同期した時刻

-- 同期の処理が synced_at を書いたときは、その値を updated_at と同じ時刻にそろえる。
-- こうすると「updated_at > synced_at」が「同期のあとに、利用者が変更した」を正確に表す。
create or replace function public.stamp_synced_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.synced_at is not null)
     or (tg_op = 'UPDATE' and new.synced_at is distinct from old.synced_at) then
    new.synced_at = now();
  end if;
  return new;
end;
$$;

-- 名前の順でトリガーが動くため、set_updated_at のあとに動く
create trigger sync_stamp before insert or update on public.items
  for each row execute function public.stamp_synced_at();
