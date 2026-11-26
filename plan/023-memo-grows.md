# plan/023-memo-grows: メモ欄を中身に合わせて広げる

- 元: プロダクトオーナーの要望「メモ欄が小さいから、内容によって自動で大きくできる？」(PR #22 のマージ後の確認で)。「Claude に相談」は確かめてもらえた
- 状態: 承認済み(2026-11-26)
- あわせて、PR #22 のレビューの Nit「詳細を開いたまま同期が走ると、メモと最初の一歩の欄が新しい内容に変わらない」を直す(同じ部品なので)

## Context
- `src/ui/ItemDetail.tsx` のメモは `rows={2}` の固定で、長いメモ(試験の案内など)は中でスクロールしないと読めない。
- 詳細を開いたまま同期で `item.notes` が変わっても、欄は開いたときの値のまま。

## spec
- R49 に一文を足す: 「メモの欄は、書いた分だけ縦に広がる(とても長いときは、画面の高さの半分ほどで止めて、その中で送る)」。要件の意味は変わらないので、変更番号は振らず補足とする。

## 変更
- `src/ui/ItemDetail.tsx`:
  - メモの `textarea` に ref を付け、`useLayoutEffect` で `notes` が変わるたびに `height = 'auto'` → `height = scrollHeight` にする。最小は今の2行、最大は `max-h-[50vh]`(超えたら中で送る)。開いた直後も中身に合わせる。
  - CSS の `field-sizing: content` は Firefox と古い Safari で効かないので使わない。
  - 同期で `item.notes` / `item.firstStep` が変わったら、その欄を書いている最中(フォーカス中)でなければ新しい値にする。書いている最中は本人の入力を優先する(上書きしない)。
- 動き(高さの変化)は付けない。`--motion` の決まりに触れない。

## やらないこと
- Google ToDo の繰り返しタスクを毎回分見せること。Google ToDo の API は、繰り返しタスクを「今の1回」だけ返し、次の回はそれを終えたときに作られる。カレンダーに毎週並んで見えるのは、カレンダー側が先の回を描いているだけで、API からは取れない(繰り返しの規則も返ってこない)。アプリ側で先の回を作ると、Google 側と食い違って二重になる。
  - 出典(2026-11-26 に確かめた。plan/024 で追記):
    - Google の Tasks API のリファレンス(Task の項目): https://developers.google.com/workspace/tasks/reference/rest/v1/tasks 。繰り返しを表す項目がない(カレンダーの予定にある `recurrence` に当たるものがない)。`tasks.list` にも先の回を広げる指定はない。
    - Stack Overflow「Is it possible to get all the history of reccuring google tasks with google tasks API?」の回答: https://stackoverflow.com/questions/73434762 。API は繰り返しかどうかを判別できず、1つの回しか返さない。
    - Google への要望: https://issuetracker.google.com/issues/273870211
    - プロダクトオーナーは「このままにする」を選んだ。

## 証明(Proof)
- `npm run lint`、`npm test`、`npm run build` が通る。CI と AI レビュー(Important 0 件)を通る。
- Playwright(ダミーのデータ)で、短いメモ・長いメモ・とても長いメモの詳細を PC とスマホ幅で撮り、広がり方と上限を確かめる。横にはみ出さないこと。
- あなたの確認(マージ後): 試験のメモが欄の中で送らずに全部読めるか。

## 計画からのずれ
- 手書きの字(Web フォント)が後から届くと折り返しが変わるため、届いたあとにもう一度高さを合わせるようにした。
