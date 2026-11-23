# plan/002-google-login-spike: Google ログインとカレンダー読み取りの試作(C4)

- 元: [spec/life-dashboard.md](../spec/life-dashboard.md)(受理済み)の懸念 C4
- 状態: 承認済み(承認者: リポジトリオーナー、2026-11-23)
- 承認後、この内容を `plan/002-google-login-spike.md` としてコミットしてから実装に入る。

## Context
spec の懸念 C4: Google の OAuth 設定は手間がかかり、個人用の未審査アプリでは警告画面やログイン切れが起きうる。Stage 2 の出口で「Stage 3 の最初に、ログインとカレンダーの読み取りだけを小さく試す」と合意した。
この試作で、本番の構成(GitHub Pages + Supabase クラウド + Google)で次の3点を確かめ、カレンダー連携の作り方を決める。
1. スマホと PC で Google ログインができるか。
2. 今週のカレンダーの予定を読めるか。
3. ログインとカレンダーの読み取りが、どのくらい続くか(1時間後、翌日)。

## 先に言っておく最大のリスク
Supabase の Google ログインは、ログイン自体のセッションは自動で延長されるが、カレンダーを読むための Google の鍵(provider token)は約1時間で切れ、Supabase は延長してくれない。つまり「ログインは続くのに、1時間後にカレンダーが読めなくなる」可能性が高い。
この試作の一番の目的は、これが実際に起きるかを確かめ、対策(下の「試作のあとに決めること」)を選ぶ材料を得ること。

## あなたにお願いする準備(実装の前に必要)
クラウドの作業環境からは、あなたの Google アカウントでのログイン操作はできない。そのため、アカウントの作成と、最後の動作確認はあなたにお願いする。手順は、実装に入るときに画面ごとに案内する。
1. **Supabase**: 無料アカウントとプロジェクトを作る。プロジェクトの URL と publishable キーを教えてもらう(publishable キーはブラウザに置く前提の公開用の鍵)。
2. **Google Cloud**: プロジェクトを作り、Calendar API を有効にし、OAuth 同意画面(外部、テストユーザーに自分を追加)と OAuth クライアント(ウェブアプリ)を作る。
   - リダイレクト URI に Supabase のコールバック URL を登録する。
   - クライアントシークレットは私に渡さず、Supabase の管理画面に直接入力してもらう。
3. **Supabase の Google ログインを有効化**: 上のクライアント ID とシークレットを入力し、リダイレクト先に GitHub Pages の URL を登録する。
4. **GitHub Pages**: リポジトリの Settings → Pages で配信元を「GitHub Actions」にする。作業ブランチから配信できるよう、`github-pages` 環境の配信可能ブランチにこのブランチを追加する。
5. **GitHub のリポジトリ変数**: `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を登録する(どちらも公開前提の値なので Variables でよい)。

## 変更されるファイル
- 新規: `src/data/supabase.ts`(Supabase のクライアント。CLAUDE.md の規約どおり、ここ以外から呼ばない)
- 新規: `src/data/calendar.ts`(provider token で今週の予定を取得する)
- 新規: `src/domain/week.ts` と `src/domain/week.test.ts`(今週の開始と終了の計算。カレンダーの取得範囲に使う)
- 更新: `src/ui/App.tsx`(試作用に、ログインボタン、今週の予定の一覧、診断情報を表示)
- 新規: `.github/workflows/deploy.yml`(ビルドして GitHub Pages に配信)
- 新規: `.env.example`(必要な環境変数の名前だけ)
- 更新: `vite.config.ts`(GitHub Pages のサブパス `/ai-sdlc-101/` に対応)、`package.json`(`@supabase/supabase-js` を追加)

## 作業の順序
1. `@supabase/supabase-js` を入れ、`src/data/supabase.ts` でクライアントを作る。URL と鍵は `import.meta.env` から読む。
2. ログイン: `signInWithOAuth({ provider: 'google' })` に、スコープ `calendar.readonly`、`access_type=offline`、`prompt=consent` を付ける(Google の長期の鍵 provider refresh token も受け取れるか確かめるため)。
3. `src/domain/week.ts`: 設定のタイムゾーンで今週(月曜0時〜翌月曜0時)の範囲を返す関数。テスト3件程度(週の途中、月曜0時ちょうど、日曜の夜)。
4. `src/data/calendar.ts`: provider token で Google Calendar API の events.list を呼び、今週の予定を返す。鍵が切れていたら、それとわかるエラーを返す。
5. 試作の画面: ログイン状態、今週の予定の一覧、診断情報(ログインした時刻、provider token と provider refresh token を受け取れたか(鍵の中身は表示しない)、最後にカレンダーを読めた時刻とその結果)。
6. `.github/workflows/deploy.yml`: このブランチへの push で、lint → test → build → GitHub Pages へ配信。
7. あなたに動作確認をしてもらい、結果をこの plan の末尾に記録する。

## リスク
- **provider token が1時間で切れる**(上記)。試作で確かめる本題。
- **Google の「テスト」状態の制限**: 同意画面がテスト状態のままだと、Google の長期の鍵が7日で失効する可能性がある。1週間後にも確認できれば理想だが、今回は翌日までの確認にとどめ、本番の plan で扱う。
- **リダイレクト URL の不一致**: Google、Supabase、GitHub Pages の3か所の URL が1文字でも違うとログインに失敗する。準備の段階で URL を一覧にして渡す。
- **作業ブランチから Pages に配信できない**: 既定では既定ブランチ以外は配信できない。準備4で許可してもらう。
- **公開リポジトリと鍵**: publishable キーは公開前提だが、他の鍵(service role、Google のクライアントシークレット)は扱わない。フックがコミットを止める。

## 選ばなかった案
- 作業環境の中だけで試す: あなたのブラウザから作業環境の開発サーバーには届かず、本物のログインを試せない。
- Supabase を通さず、Google のライブラリ(Google Identity Services)で直接ログインする: ログインとデータ保存の仕組みが二重になる。provider token の問題が実際に起きた場合の対策候補として残す。

## 証明(Proof)
- `npm run lint`、`npm test`、`npm run build` が通り、GitHub Actions の配信が成功する。
- あなたの確認(スマホと PC):
  - Google ログインができる。警告画面が出たかどうかも記録する。
  - 今週の予定が、Google カレンダーと一致して表示される。
  - 1時間以上たってから開き直したとき: ログインは続いているか、カレンダーは読めるか。
  - 翌日に開き直したとき: 同上。

## 試作のあとに決めること
provider token の結果に応じて、次の plan でカレンダー連携の方式を決める。
- A: サーバー側の関数が Google の長期の鍵を安全に保管し、必要なときに鍵を更新する。
- B: カレンダーを開くときだけ、ブラウザで Google に再度許可を求める。
- C: 1時間で切れても困らない使い方に絞る(例: 週の計画のときだけ読む)。

## 計画からのずれ
- タイムゾーンの計算を `src/domain/time.ts` に切り出し、`blocks.ts` と `week.ts` で共有した。週の範囲の計算で、同じ処理が2か所に必要になったため。
- `week.test.ts` に、夏時間のあるタイムゾーンのテストを1件足した(計3件の予定が4件)。0時を UTC に直す処理が夏時間で壊れやすいため。
- Supabase は再読み込みやセッションの更新で provider token を落とすことがある。そのため、ログイン直後の provider token をブラウザに控え、Google 側でいつ切れるかを測れるようにした(試作用の記録。長期の鍵そのものは保存しない)。

## 試作の結果
### 2026-11-23 13:26 の初回確認(プロダクトオーナーが実施)
- PC: Google ログインに成功。カレンダー用の鍵(provider token)と長期の鍵(provider refresh token)の両方を受け取れた。
- 今週の予定が Google カレンダーと一致して表示された。
- スマホ: ログインと予定の読み取りの両方に成功。
- 未審査アプリの警告画面は出た(想定どおり。「詳細」から進める)。
- 設定でつまずいた点: 初回は `redirect_uri_mismatch`。Google Cloud のリダイレクト URI を、Supabase の Google の設定画面にある Callback URL をコピーして貼り直して解決した。準備の手順は、Callback URL を手で組み立てさせず、Supabase の画面からコピーさせる形にすべきだった。
- 範囲外の発見: Google ToDo リスト(Google Tasks)のタスクは表示されない。Calendar API の予定とは別の API のため。spec の変更として扱う。

### 時間をおいた確認
(1時間後、翌日の結果を追記)
