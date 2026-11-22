# life-dashboard

週の計画と振り返りを通じて、人生の優先順位に沿って「今」を選ぶための個人用ダッシュボード。
何を作るかは [intent](intent/life-dashboard.md) と [spec](spec/life-dashboard.md) が正本。迷ったら spec を読む。

## 進め方
- このリポジトリは AI ネイティブ SDLC で進める: intent → spec → plan → コード。
- 承認済みの `plan/*.md` がない実装は始めない。実装が plan から外れたら、同じコミットで plan を更新する。
- 判断に迷ったら spec の設計原則 P1〜P7 に照らす。特に、余白(P2)と今ここ(P7)を損なう提案をしない。

## Commands
※ プロジェクトの雛形を作るまでは未整備。雛形の作成時にここを実際のコマンドに合わせて更新する。
- `npm run dev`: 開発サーバー
- `npm run build`: ビルド
- `npm run lint`: lint と型チェック
- `npm test`: 単体テスト(Vitest)
- `npm run e2e`: 画面のテスト(Playwright)
- `npx supabase start`: 開発用の Supabase を起動。Docker が必要。作業環境では Docker デーモンが止まっていることがあるので、先に `dockerd` を起動する。

## 構成
- `src/domain/`: 純粋な計算(今のブロックの判定、余白の割合、振り返りの集計など)。React と Supabase に依存しない。単体テスト必須。
- `src/data/`: Supabase とのやり取り。Supabase のクライアントはここ以外から呼ばない。
- `src/ui/`: React の画面と部品。
- `supabase/migrations/`: テーブル定義。スキーマの変更は必ずマイグレーションで行う。
- `supabase/functions/`: サーバー側の関数(通知の送信、AI 仕分け)。

## 規約
- TypeScript は strict。
- 時刻は UTC で保存し、表示とブロックの判定は設定のタイムゾーンで行う。
- 全テーブルに行単位のアクセス制御(RLS)をかけ、本人の行だけを読み書きできるようにする(spec N6)。
- 画面の文言は日本語。命令形や警告の口調にしない。目標値、合否、赤や緑の評価色を使わない(spec R16、R23)。

## 秘密の情報(公開リポジトリ)
- API キー、Supabase の service role キー、Web Push の秘密鍵はコミットしない。`.env.local` に置く(git の管理外)。
- service role キーと Claude API キーはサーバー側の関数だけで使う。ブラウザ側のコードに入れない。

## Claude が間違えやすいこと
同じ間違いを2回したら、ここに追記する。
- 空いている枠を自動で埋める、詰め込みを促す、といった「効率化」の機能を提案しない(P1、P2)。

## 完了の定義
完了を報告する前に `npm run lint`、`npm test`、`npm run build` をすべて実行し、出力を貼る。
テストが失敗したら、テストではなくコードを直す。テストを飛ばしたり消したりしない。
