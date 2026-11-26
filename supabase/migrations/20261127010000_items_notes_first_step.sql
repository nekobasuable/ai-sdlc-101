-- やることの詳細(plan/022 C、spec R49)。メモ(Google ToDo の「詳細」と同期する)と、最初の一歩(アプリだけ)。
-- 列を足すだけなので、RLS と権限は変わらない。
alter table public.items
  add column notes text check (char_length(notes) <= 8000),
  add column first_step text check (char_length(first_step) <= 80);

-- updated_at は、Google ToDo に送る変更のときだけ進める(マイグレーション 20261124040000)。メモも送るので条件に足す。
-- 最初の一歩は送らないので足さない
create or replace function public.set_items_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.body is distinct from old.body
     or new.due_date is distinct from old.due_date
     or new.notes is distinct from old.notes
     or (new.status = 'done') is distinct from (old.status = 'done')
     or new.deleted_at is distinct from old.deleted_at then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
