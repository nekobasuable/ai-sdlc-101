-- plan/005 の確認で判明: Supabase クラウドでは、サーバー側の関数が使う service_role にも
-- テーブルの権限が自動では付かない(本番で「permission denied for table google_credentials」)。
-- 開発用の Supabase と同じ状態になるよう、いったん外してからテーブルごとに明示する。
-- service_role は RLS を通らないため、使うのはサーバー側の関数だけにする(ブラウザには渡さない)。

revoke all on all tables in schema public from service_role;

grant select, insert, update, delete on table public.items to service_role;
grant select, insert, update, delete on table public.placements to service_role;
grant select, insert, update, delete on table public.daily_notes to service_role;
grant select, insert, update, delete on table public.weekly_reviews to service_role;
grant select, insert, update, delete on table public.settings to service_role;
grant select, insert, update, delete on table public.task_list_links to service_role;
grant select, insert, update, delete on table public.google_credentials to service_role;
