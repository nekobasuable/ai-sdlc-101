-- plan/004 の確認で判明: Supabase クラウドの新しいプロジェクトでは、SQL で作ったテーブルに
-- ログインユーザー(authenticated)の権限が自動では付かない。開発用の Supabase では自動で付くため、
-- 開発と本番で挙動がずれていた。権限をテーブルごとに明示し、両方で同じ状態にする。

-- いったん、ブラウザから使う2つのロールの権限をすべて外す
revoke all on all tables in schema public from anon, authenticated;

-- ログインユーザーは、本人の行だけを扱える(行の制限は RLS のポリシーが担う)
grant select, insert, update, delete on table public.items to authenticated;
grant select, insert, update, delete on table public.placements to authenticated;
grant select, insert, update, delete on table public.daily_notes to authenticated;
grant select, insert, update, delete on table public.weekly_reviews to authenticated;
grant select, insert, update, delete on table public.settings to authenticated;
grant select, insert, update, delete on table public.task_list_links to authenticated;

-- google_credentials には、anon にも authenticated にも権限を付けない(サーバー側の関数だけが使う、spec C12)
-- ログインしていない人(anon)には、どのテーブルの権限も付けない
