# plan/018-name-and-icon: 名前を「ふくろう手帳」に、タブのアイコンをふくろうに

- 元: プロダクトオーナーの指摘(タブの稲妻のアイコンを直したい、「life-dashboard」は安直)。名前は候補から「ふくろう手帳」を選んだ
- 状態: 承認済み(承認者: リポジトリオーナー、2026-11-26)
- 進め方: plan/017(AI の見立て)より先に出す(小さいため)

## Context
ブラウザのタブに、Vite のひな形のアイコン(紫の稲妻、`public/favicon.svg`)と、仮の名前「life-dashboard」(`index.html` の `<title>`)がそのまま出ている。手帳の見た目と合わない。

## 変更
- `public/favicon.svg`: 画面のふくろう(`src/ui/Owl.tsx` の線画)をもとに、16px でも形がわかるよう線を太く、描き込みを減らしたものにする。紙の色の角丸の四角に墨の線で描く(暗いタブの上でも見えるように)。
- `index.html`: `<title>` を「ふくろう手帳」に。`<meta name="application-name">`、`<meta name="apple-mobile-web-app-title">`、`<meta name="theme-color" content="#f3efe7">` を足す。スマホのホーム画面用に `public/apple-touch-icon.png`(180px、同じ絵)を足す。
- `public/privacy.html` に出ているアプリの名前も「ふくろう手帳」に。
- 変えないもの: リポジトリ名、`package.json` の名前、CLAUDE.md の見出し、spec と intent の題名(中の呼び名で、画面には出ないため)。Google の同意画面に出るアプリ名は Google Cloud の設定にあるので、あなたに変えてもらう(任意)。
- spec の 5.5(見た目と手触り)に「名前は ふくろう手帳」を一行足す。スキルにも書く。

## 証明(Proof)
- `npm run lint`、`npm test`、`npm run build` が通る。ビルドした `dist/index.html` で、アイコンの参照が `/ai-sdlc-101/` の下を指していることを確かめる。
- アイコンを 16px と 32px で画像にして、形がわかるか私が見る(Playwright)。
- あなたの確認(マージ後): タブに「ふくろう手帳」とふくろうが出る。

## 計画からのずれ
- `index.html` の Google Fonts の読み込みから、使わなくなった Zen Kaku Gothic New の 300 を外した(plan/016 で本文を 400 にしたため)。
- ホーム画面用の画像は、角を紙の色で塗った正方形にした(角の丸めは端末がする)。
