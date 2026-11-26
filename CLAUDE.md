# life-dashboard

週の計画と振り返りを通じて、人生の優先順位に沿って「今」を選ぶための個人用ダッシュボード。
何を作るかは [intent](intent/life-dashboard.md) と [spec](spec/life-dashboard.md) が正本。迷ったら spec を読む。

## 進め方
- このリポジトリは AI ネイティブ SDLC で進める: intent → spec → plan → コード。
- 承認済みの `plan/*.md` がない実装は始めない。実装が plan から外れたら、同じコミットで plan を更新する。
- 作業ブランチで作業し、main には PR でだけ入れる。Claude は main に直接 push しない。PR は CI と AI レビュー(`REVIEW.md` の観点)を通り、人間がマージする(plan/006)。本番への配信は main への push でだけ動く。
- 判断に迷ったら spec の設計原則 P1〜P7 に照らす。特に、余白(P2)と今ここ(P7)を損なう提案をしない。

## Commands
- `npm run dev`: 開発サーバー
- `npm run build`: ビルド(`tsc -b && vite build`)
- `npm run lint`: lint(oxlint)と型チェック。警告があっても失敗する(`--deny-warnings`)。終了コードだけでなく出力も見る
- `npm test`: 単体テスト(Vitest)。`src/domain` と `supabase/functions/_shared` が対象
- `npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,supavisor,realtime,storage-api,mailpit,postgres-meta`: 開発用の Supabase を最小構成で起動(初回は約2.5分、イメージ約4GB)。止めるときは `npx supabase stop`
  - 作業環境では Docker デーモンが止まっていることがある。`docker info` が失敗したら、先に `dockerd` をバックグラウンドで起動する。起動が「process with PID ... is still running」で失敗したら、古い `/var/run/docker.pid` を消してから起動し直す。
- `npm run test:db`: データベースのテスト(pgTAP、`supabase/tests/`)。開発用の Supabase の起動が必要。マイグレーションを変えたら `npx supabase db reset` で適用してから実行する
- `npm run eval:reflect`: 話して省みるの AI の評価(evals、plan/011)。`GEMINI_API_KEY` と `GEMINI_MODEL` が要る。AI への指示(`supabase/functions/_shared/reflect.ts`)や窓口(`_shared/ai.ts`)、`evals/` を変えたら回す。PR では `.github/workflows/evals.yml` が回す。キーがないと「評価は回っていない」の警告だけで合格扱いになるので、AI への指示を変えた PR では、マージの前に Evals の ○× の表が出ていることを人が確かめる
- `npm run eval:classify`: AI の見立て(領域と、大切なこと / 急ぐこと)の評価(plan/017)。AI への指示(`_shared/classify.ts`)、窓口(`_shared/ai.ts`)、`evals/classify/` を変えたら回す。PR では `.github/workflows/evals-classify.yml` が回す。注意は eval:reflect と同じ
- `npm run gen:types`: データベースの型を `src/data/database.types.ts` に生成する。マイグレーションを変えたら実行する(手で編集しない)
- `.claude/hooks/block-secrets.sh`: 秘密の情報を止めるフック。鍵の形の文字列を含む書き込みと `git commit` を止める。止められたら鍵を `.env.local` に移す。

## 構成
- `src/domain/`: 純粋な計算(今のブロックの判定、余白の割合、振り返りの集計など)。React と Supabase に依存しない。単体テスト必須。
- `src/data/`: Supabase とのやり取り。Supabase のクライアントはここ以外から呼ばない。
- `src/ui/`: React の画面と部品。
- `supabase/migrations/`: テーブル定義。スキーマの変更は必ずマイグレーションで行う。
- `supabase/functions/`: サーバー側の関数(Google の鍵の保管、Google ToDo の同期、将来は通知と AI 仕分け)。判断の処理は `_shared/` に純粋な関数として置き、Vitest でテストする。関数の秘密(Google のクライアントシークレット、暗号化用の鍵、Gemini の API キー)は Supabase の Edge Functions の Secrets にあり、コードやリポジトリには置かない。

## 規約
- TypeScript は strict。
- 時刻は UTC で保存し、表示とブロックの判定は設定のタイムゾーンで行う。
- 全テーブルに行単位のアクセス制御(RLS)をかけ、本人の行だけを読み書きできるようにする(spec N6)。
- テーブルを足すときは、RLS の有効化、ポリシー、権限(GRANT)をテーブルごとに明示的に書く(ループで書かない。読み手やツールが確かめられるように)。権限は `authenticated` と `service_role`(サーバー側の関数)に付け、`anon` には付けない。Supabase クラウドはどの役割にも権限を自動で付けないが、開発用の Supabase は付けるため、書き忘れても手元のテストでは気づけない。新しいテーブルには、権限のテスト(`has_table_privilege`)も足す。
- 本番(Supabase クラウド)へのマイグレーションとサーバー側の関数は、push すると GitHub Actions(`.github/workflows/deploy.yml` の `supabase` ジョブ)が自動で適用する。SQL Editor に手で貼らない(手で貼ると、適用の記録がずれて自動の適用が失敗する)。
- 画面の文言は日本語。命令形や警告の口調にしない。目標値、合否、赤や緑の評価色を使わない(spec R16、R23)。

## 秘密の情報(公開リポジトリ)
- API キー、Supabase の service role キー、Web Push の秘密鍵はコミットしない。`.env.local` に置く(git の管理外)。
- service role キーと Claude API キーはサーバー側の関数だけで使う。ブラウザ側のコードに入れない。

## Claude が間違えやすいこと
同じ間違いを2回したら、ここに追記する。
- lint の結果を終了コードだけで判断し、警告を見落とした(plan/004)。今は警告でも失敗する設定にしてある。
- CI で本番を変える Supabase CLI のコマンドに `--yes` を付け忘れた(2回、plan/005)。CI では確認に答えられないので、本番を変えるコマンドには必ず `--yes` を付け、データベースを対象にするものには `--remote` も付ける。
- テーブルの権限(GRANT)の書き忘れ(2回、plan/004 で authenticated、plan/005 で service_role)。開発用の Supabase は権限を自動で付けるので、手元では気づけない。規約の節を参照。
- 空いている枠を自動で埋める、詰め込みを促す、といった「効率化」の機能を提案しない(P1、P2)。

## 完了の定義
完了を報告する前に `npm run lint`、`npm test`、`npm run build` をすべて実行し、出力を貼る。
テストが失敗したら、テストではなくコードを直す。テストを飛ばしたり消したりしない。
