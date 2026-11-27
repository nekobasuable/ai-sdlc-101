# plan/027-small-fixes: 持ち越した小さな直し5つ

- 元: プロダクトオーナー「小さな直しを修正しようか」(2026-11-27)。PR #19〜#26 のレビューの Nit と、前からの型エラー。
- 状態: 承認済み(2026-11-27)

## Context
持ち越していた5つを、まとめて片付ける。どれも画面の見た目や仕様の意味は変えない。

## 変更
1. **plan/026 の文言(PR #26 の Nit)**
   - 「変更」の節の `DueField` の説明を、実際の決まりに直す。「何も選んでいないときは、欄の外を押したとき、またはほかの欄へ移ったときに閉じる」。
2. **月の日の一覧から、やることの詳細を開く(PR #19 からの持ち越し。plan/022 C で予定していたもの)**
   - `src/domain/month-grid.ts` の `collectByDate`: 「〆」の一覧に、文字だけでなく項目そのもの(`Item`)を持たせる。テストを直す。
   - `src/ui/MonthView.tsx`:
     - 「〆」の行を押すと、やることの一覧と同じ `ItemDetail` が開く。
     - 予定、置いた予定、終えたことの行は、今のまま押せない。中身を進める手がかりが要らないため。
   - 詳細で変えたら(終えた、メモ、締め切り)、月の画面も読み直す(`ItemActionsContext` の `refresh` → `version`)。
3. **メモの取り込みの取りこぼし(PR #22 の Nit)**
   - 起きること: メモを取り込むようにした直後、アプリ側で直したばかりの項目は、Google ToDo の「詳細」を取り込まない。アプリ側が新しいので Google へ送る側(`updateRemote`)になり、メモは「まだ知らない」(`null`)ので送らず、取り込みもしないため。
   - 直し方: `_shared/sync.ts` の `planSync` で、`updateRemote` のときに、アプリのメモが `null` で Google にメモがあれば、そのメモを `adoptNotes` として持たせる。
   - `google-tasks/index.ts`: Google へ送ったあとの記録(`recordAfterRemote`)で、利用者がそのあいだに項目を変えていないときだけ、`notes` も書く。変えていたら書かない(本人の入力を上書きしない)。
   - `sync.test.ts` にテストを足す。
     - メモが `null` でアプリ側が新しいとき、`adoptNotes` に Google のメモが入る。
     - アプリにメモがあるときは `adoptNotes` を持たない。
4. **AI への指示のファイルの余分な空行(PR #20 の Nit)**
   - `_shared/classify.ts` の関数のあいだの空行を1つにする。AI への指示の文には触れない。
   - このファイルを変えると Evals(classify)が回る。○×の表が出て合格することを確かめてからマージする。
5. **`_shared/crypto.ts` の型エラー2件(前から)**
   - Deno の型チェックで、`Uint8Array<ArrayBufferLike>` は `BufferSource` に渡せない、と出ている。
   - `fromBase64` が `Uint8Array<ArrayBuffer>` を返すように直す。動きは変えない。今のテスト(`crypto.test.ts`)で確かめる。
   - `npx deno check` で、サーバー側の関数がすべて通ることを確かめる。

## やらないこと
- 見た目、文言、仕様の意味は変えない。spec は直さない。

## 証明(Proof)
- `npm run lint`、`npm test`、`npm run build` が通る。
- `npx deno check supabase/functions/*/index.ts` が型エラーなしで通る。
- CI と AI レビュー(Important 0 件)を通る。Evals(classify)の○×の表が出て合格する。
- Playwright(ダミーのデータ)で、月の画面の日を押し、「〆」の行から詳細が開くことを確かめる。
- あなたの確認(マージ後): 月の画面で、締め切りの日を押して、やることを押すと詳細が開くか。
