-- 人生の柱(plan/022 A、spec R4 改)。領域を、本人が決める「人生の柱」に改める。
-- 柱の一覧は settings.pillars(id と名前)に持ち、items と task_list_links の area には柱の id を入れる。
-- 列の追加と制約の変更なので、RLS と権限は変わらない。

-- 柱の一覧。最初は6つ
alter table public.settings
  add column pillars jsonb not null default '[
    {"id": "health", "label": "健康"},
    {"id": "work", "label": "仕事"},
    {"id": "learning", "label": "学び"},
    {"id": "people", "label": "人とのつながり"},
    {"id": "venture", "label": "新規事業"},
    {"id": "life", "label": "暮らし"}
  ]'::jsonb
  check (jsonb_typeof(pillars) = 'array');

-- 固定の5つの値の制約を外し、柱の id を入れられるようにする(長さだけ見る)
alter table public.items drop constraint if exists items_area_check;
alter table public.items add constraint items_area_length check (area is null or char_length(area) between 1 and 40);
alter table public.task_list_links drop constraint if exists task_list_links_area_check;
alter table public.task_list_links add constraint task_list_links_area_length check (area is null or char_length(area) between 1 and 40);

-- 今ある値を移す: 仕事 → 仕事、スキル強化と学校 → 学び、プライベート → 暮らし、新規ビジネス → 新規事業
update public.items set area = case area when 'skill' then 'learning' when 'school' then 'learning' when 'private' then 'life' when 'business' then 'venture' else area end
  where area in ('skill', 'school', 'private', 'business');
update public.task_list_links set area = case area when 'skill' then 'learning' when 'school' then 'learning' when 'private' then 'life' when 'business' then 'venture' else area end
  where area in ('skill', 'school', 'private', 'business');
