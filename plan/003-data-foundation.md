# plan/003-data-foundation: データの土台(テーブル定義、本人だけが読み書きできる制限、そのテスト)

- 元: [spec/life-dashboard.md](../spec/life-dashboard.md)(受理済み、変更 1 を含む)の 4.3 データモデル、N6、C12
- 状態: 実装済み(承認者: リポジトリオーナー、2026-11-23)
- 承認後、この内容を `plan/003-data-foundation.md` としてコミットしてから実装に入る。

## Context
画面や同期を作る前に、データの入れ物を決める。spec の N6(本人の行しか読み書きできない)はセキュリティの要なので、テーブルを作るのと同時にテストで証明する。
plan/002 で、Google の長期の鍵をサーバー側に保管する方式(A 案)に決まったため、その置き場所もここで用意する(C12)。

## スコープ
やる: 開発用 Supabase へのマイグレーション、全テーブルの行単位アクセス制御(RLS)、その制限のテスト、TypeScript の型の生成。
やらない(後の plan に回す): 画面からの読み書き、Google の鍵の暗号化と保存の処理、Google ToDo の同期、通知の宛先のテーブル、Supabase クラウドへのマイグレーションの適用(手順がアカウントの操作を伴うため、配信の plan でまとめて行う)。

## テーブル(spec 4.3 との対応)
全テーブルに `user_id`(既定値は `auth.uid()`、ユーザー削除で連動して削除)を持たせる。

| テーブル | spec の対応 | 主な列 |
|---|---|---|
| `items` | Item(+ 変更 1) | 本文、領域(5種、省略可)、象限(1〜4、省略可)、締め切り(日付、省略可)、状態(inbox / candidate / someday / done)、Google ToDo のタスク ID とリスト ID、Google 側の最終更新時刻、作成と更新の時刻 |
| `placements` | Slot と Result | 項目、週の開始日、曜日(0〜6)、ブロック ID、結果(done / partial / not_done、省略可) |
| `daily_notes` | DailyNote | 日付、一言 |
| `weekly_reviews` | WeeklyReview | 週の開始日、メモ |
| `settings` | Settings | タイムゾーン、ブロックの区切り(JSON)、通知の設定(JSON)、カレンダーへの書き込み(既定オフ)、AI 仕分け(既定オン) |
| `task_list_links` | TaskListLink | Google ToDo のリスト ID、結びつける領域、既定のリストかどうか |
| `google_credentials` | GoogleCredential | 暗号化した長期の鍵、更新時刻 |

- `items` には、同じ Google ToDo のタスクが二重に入らないよう、`(user_id, google_task_id)` に一意の制約をかける(C13 の重複対策)。
- 更新時刻は、トリガーで自動更新する(R32 の「あとから変更したほうを正」に使う)。
- Quote(哲学者の言葉)は個人データではないため、テーブルにせず、あとでリポジトリ内のファイルとして持つ。

## 行単位アクセス制御(RLS)
- `google_credentials` 以外: 全テーブルで RLS を有効にし、ログイン中のユーザーが `user_id = auth.uid()` の行だけを読み書きできるポリシーを1つずつ付ける。
- `google_credentials`: RLS を有効にし、ポリシーを1つも付けない。ブラウザからは本人でも読めず、サーバー側の関数(service role)だけが読み書きできる(C12)。

## 変更されるファイル
- 新規: `supabase/migrations/<日時>_init.sql`(テーブル、制約、トリガー、RLS)
- 新規: `supabase/tests/rls.test.sql`(pgTAP によるテスト)
- 新規: `src/data/database.types.ts`(`supabase gen types` で生成)
- 更新: `src/data/supabase.ts`(クライアントに型を付ける)
- 更新: `package.json`(`test:db` と `gen:types` を追加)、`CLAUDE.md`(Commands に追記)

## 作業の順序
1. Docker と開発用 Supabase を起動する(CLAUDE.md の手順どおり)。
2. マイグレーションを書き、`npx supabase db reset` で適用する。
3. pgTAP のテストを書き、`npx supabase test db` で実行する。
4. `npx supabase gen types typescript --local` で型を生成し、`src/data/supabase.ts` に適用する。
5. `npm run lint`、`npm test`、`npm run build`、`npm run test:db` を通す。CLAUDE.md を更新し、Supabase を止めて、コミットする。

## リスク
- **RLS の付け忘れ**: 1つでも抜けると、他人のデータが読める穴になる。テストで「RLS が有効でないテーブルが public スキーマに1つもない」ことを確かめる。
- **テストの重さ**: データベースのテストには Supabase の起動(約数十秒〜2.5分)が要る。`npm test` には入れず、`npm run test:db` として分ける。
- **構造の作り直し**: 画面を作る段階で列の過不足が出る可能性がある。マイグレーションを足していく形で対応する。

## 選ばなかった案
- Supabase Vault で長期の鍵を暗号化する: 仕組みが重く、ローカルとクラウドでの扱いの違いを調べる必要がある。今回は「ブラウザから読めない置き場所」だけを用意し、暗号化の方式は鍵を保存する plan で決める。
- RLS のテストを supabase-js から2人のユーザーでログインして行う: 認証の準備が増える。pgTAP なら SQL だけで、ユーザーを切り替えて確かめられる。
- Slot と Result を別テーブルにする: 1つの配置に結果は1つなので、まとめたほうが単純になる(spec の 4.3 からのずれとして記録する)。

## 証明(Proof)
`npm run test:db` で、次のテストが合格する。
- public スキーマの全テーブルで RLS が有効である。
- ユーザー A が作った項目は、A からは読めて、B からは読めない(全テーブルの代表として `items` と `placements`)。
- B は A の項目を更新も削除もできない。
- ログインしていない人(anon)は何も読めない。
- `google_credentials` は、本人でも読めない。
- 同じ Google ToDo のタスク ID は、同じユーザーの中で二重に登録できない。

あわせて `npm run lint`、`npm test`、`npm run build` が通る。

## 実装の結果
実装日: 2026-11-23

### 証明の結果
- `npm run test:db`: 11件すべて合格(RLS が全テーブルで有効、他人の行を読めない、更新も削除もできない、他人の名義で作れない、anon は読めない、google_credentials は本人でも読み書きできない、Google ToDo のタスクの重複を防ぐ)。
- `npm run lint`: 警告ゼロ。`npm test`: 9件合格。`npm run build`: 成功。

### 計画からのずれ
- テストを1件追加した: 「A は B の名義で項目を作れない」。読み取りだけでなく、書き込み時の名義の検査(RLS の with check)も確かめるため。
- 作業環境の再起動のあと、Docker が古い PID ファイルのせいで起動しなかった。古い `/var/run/docker.pid` を消して解決し、手順を CLAUDE.md に追記した。
