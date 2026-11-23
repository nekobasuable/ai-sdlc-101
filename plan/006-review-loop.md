# plan/006-review-loop: PR レビューの流れ(Stage 5 の軽量版)

- 元: プレイブック Stage 5「PR レビューループにおける AI」と「CI/CD の統合」。spec の変更ではなく、開発の進め方の変更
- 状態: 承認済み(承認者: リポジトリオーナー、2026-11-23)
- 承認後、この内容を `plan/006-review-loop.md` としてコミットしてから実装に入る。

## Context
今は、Claude が作業ブランチに push すると、レビューを通らずにそのまま本番(GitHub Pages と Supabase)に反映される。plan/004 と plan/005 で権限の書き忘れが本番で2回見つかったが、これはレビューで捕まえやすい種類の間違いだった。
記事の Stage 5 に沿って、「main からだけ本番に出す」「変更は PR を通す」「別の Claude がレビューする」「人間が承認してマージする」という最小の流れを作る。個人用なので、大企業向けの形(管理者設定、複数の承認者)は真似しない。

## 新しい流れ
```
作業ブランチに push ─▶ PR(作業ブランチ → main)
                         ├─ CI: lint、単体テスト、ビルド、DB テスト(自動)
                         └─ AI レビュー: REVIEW.md の観点で別の Claude がコメント(自動)
                               │  必要なら「@claude 直して」で修正を依頼
                               ▼
                       あなたが読んで、マージ(= 承認)
                               ▼
                       main への push で本番に配信(今と同じ deploy.yml)
```
職務の分離: コードを書くのはこの会話の Claude、レビューするのは GitHub Actions 上の別の Claude、承認するのはあなた。

## あなたにお願いする準備
1. **Anthropic の API キー**: console.anthropic.com で API キーを作り、GitHub の Secrets に `ANTHROPIC_API_KEY` として登録する。あわせて、console の利用上限(月の上限額)を低めに設定する。
2. **GitHub Pages の配信元に main を追加**: Environments → github-pages の配信可能ブランチに `main` を足す(種類は Branch)。
3. **main の保護(実装後)**: Settings → Rules → Rulesets で main に「PR を必須にする」「CI の合格を必須にする」「強制 push を禁止」を設定する。承認の人数は 0 にする(PR はあなたのアカウントで作られるため、自分の PR を承認できない GitHub の仕様に引っかかる。マージする行為そのものを承認とみなす)。

## 変更されるファイル
- `.github/workflows/deploy.yml`: 本番への配信を `main` への push(と手動実行)だけにする。作業ブランチへの push では配信しない。
- `.github/workflows/ci.yml`(新規): PR で lint、単体テスト、ビルド、DB テスト(GitHub のランナー上で開発用の Supabase を起動)を実行する。
- `.github/workflows/review.yml`(新規): `anthropics/claude-code-action` で、PR の作成と更新のときに自動でレビューし、コメントに「@claude」があれば修正を push する。
- `REVIEW.md`(新規): レビューの観点。記事の例にならい、次の3つのパスを持つ。
  - Bugs: 論理の誤り、境界条件、タイムゾーン、同期の重複や消失(C13)
  - Security: RLS、権限(GRANT)の書き忘れ(authenticated と service_role)、秘密の情報、ブラウザに渡る鍵
  - Compliance: spec と plan への準拠、設計原則(余白 P1/P2、今ここ P7、評価色を使わない R16、命令形にしない R23)
  - Important と Nit の区別、Nit は5件まで、生成ファイル(`database.types.ts`、`package-lock.json`)と CI で強制済みのもの(lint)は対象外。
- `CLAUDE.md`: 進め方に「作業ブランチで作業し、main には PR でだけ入れる。Claude は main に直接 push しない」を追記。
- `README.md`: 進捗表の Stage 4、5 を更新。

## 作業の順序
1. `main` ブランチを、最初のコミット(`35b5f35 Add roadmap and intent template`)から作る。ここまでの作業がすべて最初の PR に入るようにするため。
2. 上のファイルを作り、作業ブランチにコミットする(この push からは本番に配信されない)。
3. 作業ブランチ → main の PR を作る。CI と AI レビューが自動で動く。
4. AI レビューの指摘を一緒に読み、直すものは直す(自分で直すか、「@claude」で依頼する)。
5. あなたがマージする。main への push で本番に配信されることを確かめる。
6. main の保護(準備 3)を設定してもらう。

## リスク
- **最初の PR が大きい**: ここまでの全作業(コミット41件、ファイル64個)が入る。レビューの質と費用に響く。REVIEW.md で生成ファイルを除外し、プロンプトで「重要な指摘を優先」と絞る。2回目以降の PR は plan 1本ぶんの小さな差分になる。
- **費用**: API の利用額は Anthropic の console で上限を設定して守る。
- **claude-code-action の設定の誤り**: 動かなければログを見て直す(今回も初めて使う仕組み)。
- **DB テストを CI で回す時間**: Supabase の起動に数分かかる。PR のときだけ実行する。
- **作業ブランチの名前**: この会話の作業ブランチは決められている(`claude/ai-native-sdlc-playbook-3yqzzp`)。今後の plan も、当面はこのブランチから PR を作る。

## 選ばなかった案
- この会話の Claude が自分でレビューする: 書いた本人がレビューすることになり、職務の分離にならない。
- マネージドの Code Review: 管理者による有効化が必要で、個人の環境では使えるかが不確か。
- 承認の人数を1にする: PR の作成者があなたのアカウントになるため、自分で承認できず、マージできなくなる。

## 証明(Proof)
- 作業ブランチへの push では、本番への配信が動かない。
- PR に、CI の4つのチェック(lint、単体テスト、ビルド、DB テスト)の合格が表示される。
- PR に、AI レビューのコメントが付き、指摘に REVIEW.md のパス名(Bugs、Security、Compliance)が付いている。
- あなたがマージすると、main への push で本番への配信が成功し、アプリが今までどおり動く。
