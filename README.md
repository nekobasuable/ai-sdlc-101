# ai-sdlc-101

「AI ネイティブの SDLC プレイブック」(Anthropic, 2026-08-21)を順に実践する学習用リポジトリ。
https://claude.com/ja/resources/articles/the-ai-native-sdlc-playbook

原則: 各ステージは、次のステージが読めるバージョン管理済みの成果物をコミットして終わる。

| Stage | 成果物 | 状態 |
|---|---|---|
| 1 Plan | intent/*.md | 完了 |
| 2 Design | spec/*.md | 完了 |
| 3 Build | CLAUDE.md, hooks, plan/*.md | 進行中(スキルとサブエージェントは未経験) |
| 4 Test | npm run lint / test / test:db, evals | 進行中(evals は未経験) |
| 5 Deploy | REVIEW.md, CI, AI レビュー, main からの自動配信 | PR レビューの流れが完成(承認ゲートのフックは未経験) |
| 6 Maintain | bands.yaml, スキャン | 未着手 |
