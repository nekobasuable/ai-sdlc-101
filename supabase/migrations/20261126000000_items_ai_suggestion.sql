-- AI の見立て(plan/017、spec R24〜R26 改)。
-- 領域と象限が、AI の見立てか本人の判断かを覚える。見立ての理由と、見立てを試みた時刻(何度も AI を呼ばないため)も残す。
-- 列を足すだけなので、RLS と権限(テーブル単位)は変わらない。updated_at のトリガー(Google ToDo に関係する変更だけで進む)にも影響しない。
alter table public.items
  add column area_source text check (area_source in ('ai', 'user')),
  add column quadrant_source text check (quadrant_source in ('ai', 'user')),
  add column ai_reason text check (char_length(ai_reason) <= 80),
  add column ai_tried_at timestamptz;

-- これまでに付けた領域と象限は、本人の判断
update public.items set area_source = 'user' where area is not null;
update public.items set quadrant_source = 'user' where quadrant is not null;
