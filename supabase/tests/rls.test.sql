-- plan/003 の証明: 本人の行だけを読み書きできる(spec N6)
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- public スキーマに、RLS が無効なテーブルが1つもない
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'public の全テーブルで RLS が有効'
);

-- 権限(GRANT)が本番と同じ状態である(plan/004 で判明した、開発と本番のずれの防止)
select ok(has_table_privilege('authenticated', 'public.settings', 'SELECT'), 'ログインユーザーは settings を使える');
select ok(has_table_privilege('authenticated', 'public.items', 'INSERT'), 'ログインユーザーは items に書ける');
select ok(not has_table_privilege('anon', 'public.items', 'SELECT'), 'anon には items の権限がない');
select ok(not has_table_privilege('authenticated', 'public.google_credentials', 'SELECT'), 'ログインユーザーにも google_credentials の権限がない');

-- 2人のユーザーを用意する
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com');

-- ユーザー A として操作する
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

insert into public.items (id, body, google_task_id)
  values ('11111111-1111-1111-1111-111111111111', '統計のレポート', 'task-1');
insert into public.placements (item_id, week_start, day, block_id)
  values ('11111111-1111-1111-1111-111111111111', '2026-11-23', 0, 'morning');

select is((select count(*) from public.items)::int, 1, 'A は自分の項目を読める');
select throws_ok(
  $$ insert into public.items (body, google_task_id) values ('重複', 'task-1') $$,
  '23505', null, '同じ Google ToDo のタスクは二重に登録できない'
);
select throws_ok(
  $$ insert into public.items (user_id, body) values ('00000000-0000-0000-0000-00000000000b', 'なりすまし') $$,
  '42501', null, 'A は B の名義で項目を作れない'
);

-- ユーザー B に切り替える
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.items)::int, 0, 'B は A の項目を読めない');
select is((select count(*) from public.placements)::int, 0, 'B は A の配置を読めない');

update public.items set body = '書き換え' where id = '11111111-1111-1111-1111-111111111111';
delete from public.items where id = '11111111-1111-1111-1111-111111111111';

-- ログインしていない人(anon)
set local role anon;
select throws_ok($$ select count(*) from public.items $$, '42501', null, 'anon は何も読めない');

-- A に戻って、B の更新と削除が効いていないことを確かめる
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select body from public.items where id = '11111111-1111-1111-1111-111111111111'), '統計のレポート', 'B は A の項目を更新できない');
select is((select count(*) from public.items)::int, 1, 'B は A の項目を削除できない');

-- Google の長期の鍵は、本人でも読み書きできない(サーバー側の関数だけ)
reset role;
insert into public.google_credentials (user_id, encrypted_refresh_token)
  values ('00000000-0000-0000-0000-00000000000a', 'encrypted-placeholder');
set local role authenticated;
select throws_ok($$ select count(*) from public.google_credentials $$, '42501', null, '本人でも google_credentials を読めない');
select throws_ok(
  $$ insert into public.google_credentials (user_id, encrypted_refresh_token) values ('00000000-0000-0000-0000-00000000000a', 'x') $$,
  '42501', null, '本人でも google_credentials に書けない'
);

select * from finish();
rollback;
