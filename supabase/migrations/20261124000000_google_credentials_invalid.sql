-- plan/005 段階 B: Google の長期の鍵が使えなくなった時刻(取り消された、期限切れなど)。
-- 使えなくなったら、画面で「つなぎ直し」を案内する。
alter table public.google_credentials add column invalid_at timestamptz;
