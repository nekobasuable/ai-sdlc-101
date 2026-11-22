# plan/001-foundation: 土台づくり(雛形、最小のテスト、秘密情報のフック、Supabase の試作)

- 元: [spec/life-dashboard.md](../spec/life-dashboard.md)(受理済み)
- 状態: 承認済み(承認者: リポジトリオーナー、2026-11-22)
- 承認後、この内容を `plan/001-foundation.md` としてコミットしてから実装に入る。

## Context
spec が受理され、Stage 3 に入った。機能を作り始める前に、記事が自動モードの前提とするガードレール(Claude が自分で回せるテスト、危険を止めるフック)と、Stage 2 で持ち越した高リスク項目 C8(Supabase がこの環境で動くか)を片づける。
プロダクトオーナーの方針: 個人用かつ検証用なので、テストとフックは軽めにする。トークンも節約する。

## スコープ
やる: 雛形、`src/domain` の最初の関数とテスト、最小の画面、秘密情報のフック1本、Supabase のローカル起動の確認、CLAUDE.md のコマンド更新。
やらない(後の plan に回す): Playwright、PWA 化、dnd-kit、Google ログイン(C4)、テーブル定義、通知、AI 仕分け、Docker の自動起動。

## 変更されるファイル
- 新規: `package.json`、`vite.config.ts`、`tsconfig*.json`、`eslint.config.js`、`index.html`(Vite の React + TypeScript 雛形から)
- 新規: `src/main.tsx`、`src/ui/App.tsx`、`src/index.css`(Tailwind を読み込む)
- 新規: `src/domain/blocks.ts`、`src/domain/blocks.test.ts`
- 新規: `.claude/settings.json`、`.claude/hooks/block-secrets.sh`
- 新規: `supabase/config.toml`(`supabase init` で生成)
- 更新: `CLAUDE.md`(Commands を実物に合わせる)、`README.md`(進捗表)

## 作業の順序
1. **雛形**: `npm create vite@latest . -- --template react-ts` 相当で作り、`src/App.tsx` を `src/ui/App.tsx` に移す。Tailwind(`@tailwindcss/vite`)と Vitest を追加する。
   - `package.json` の scripts: `dev`、`build`(`tsc -b && vite build`)、`lint`(`eslint . && tsc -b --noEmit`)、`test`(`vitest run`)。
2. **最初の中身の計算**: `src/domain/blocks.ts`
   - `DEFAULT_BLOCKS`: 早朝 5–8時、午前 8–11時、昼 11–14時、午後 14–17時、夕方 17–20時、夜 20–24時(0–5時はブロックなし)。区切りは引数で差し替え可能にする(spec R8a)。
   - `currentBlock(now: Date, timeZone: string, blocks = DEFAULT_BLOCKS)`: 指定タイムゾーンでの時刻から、今のブロックを返す。該当なしは `null`。タイムゾーン変換は `Intl.DateTimeFormat` を使い、ライブラリは足さない。
   - テストは5件程度: 各境界(8:00 は午前)、夜中(null)、タイムゾーンの違い(同じ UTC 時刻が東京とロンドンで別のブロック)、区切りの差し替え。
3. **最小の画面**: `App.tsx` に「今は〇〇の時間です」と、今のブロック名だけを表示する。配線の確認用で、見た目は作り込まない。
4. **秘密情報のフック**: `.claude/hooks/block-secrets.sh` を PreToolUse で登録する(`Write|Edit` と `Bash`)。
   - Write / Edit: 書き込む内容に、実際の鍵の形をした文字列があれば exit 2 で止め、理由を Claude に返す。対象は `sk-ant-` で始まる文字列、`-----BEGIN ... PRIVATE KEY-----`、JWT の形をした長い文字列。`.env*` への書き込みは対象外(git の管理外のため)。
   - Bash: コマンドが `git commit` のときだけ、`git diff --cached` に同じ検査をかける。
   - 速さ優先で `grep` だけを使う(gitleaks などは入れない)。「キー」という単語ではなく、鍵の形だけに反応させる。
5. **Supabase の試作(C8)**: `supabase` CLI を devDependency に入れ、`npx supabase init` → `dockerd` を起動 → `npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,supavisor` で必要最小限だけ起動する。所要時間と増えたディスク使用量を記録し、`npx supabase stop` で止める。
   - 時間の上限: 失敗したら深追いせず、結果を記録して次の plan で方針を決める(データ層をテストで差し替える方式に寄せる)。
6. **後片づけ**: CLAUDE.md の Commands を実物に合わせて更新、README の進捗表を更新、試作の結果をこの plan の末尾に追記してコミットする。

## リスク
- **フックの誤検知**: 正当な編集を止めてしまうと作業が詰まる。鍵の形に限定し、ドキュメント中の「API キー」などの単語には反応させない。手順4の確認で誤検知がないことを見る。
- **Supabase のイメージが大きい**: 数 GB の取得になりうる。ディスクの空きは約 61GB あるので収まる見込み。不要なサービスを `-x` で外す。
- **タイムゾーンの扱いの誤り**: ブロックの判定がずれると「今」の画面が根本から狂う。境界とタイムゾーン違いをテストで押さえる。
- **雛形のバージョン差**: Tailwind や ESLint の設定方法がバージョンで変わる。動かなければ公式の現行手順に合わせ、この plan を更新する。

## 選ばなかった案
- Next.js: サーバーを前提とする機能が多く、静的配信(GitHub Pages)と P6 に合わない。
- gitleaks などの専用ツール: 精度は高いが、バイナリの取得や設定が増える。軽さを優先して grep にした。
- Playwright を今入れる: 画面がほぼない段階では費用対効果が低い。画面ができてから入れる。
- Supabase の試作を省く: C8 を Stage 3 の最初に確かめると Stage 2 の出口で合意したため、省かない。

## 証明(Proof)
- `npm run lint`、`npm test`、`npm run build` がすべて通る(出力を貼る)。
- フックの確認(JSON を標準入力に流して直接実行):
  - 鍵の形の文字列を含む Write → exit 2 と理由が出る。
  - 普通のコードの Write、および「API キーはコミットしない」という文の Write → exit 0。
  - 鍵を含むファイルをステージした状態での `git commit` → exit 2。
- `npx supabase start` が成功し、`npx supabase status` に API の URL が出る。その後 `npx supabase stop` で止まる。

## 試作の結果
(実装後に追記)
