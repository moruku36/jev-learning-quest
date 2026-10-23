# システム構成と図

Jev Learning Quest の構成図です。図は [Pele](https://pele.run)（Mermaid → SVG のレンダラー）で [`docs/diagrams/*.mmd`](diagrams)（Mermaid）から SVG にしています。作り直す手順は末尾を参照してください。

## 1. システム構成（クラウド版）

ブラウザは静的ファイル（Vercel CDN）と `/api/*`（Vercel Function）、ログイン（Supabase Auth）の3か所とやり取りします。Function は利用者本人のトークンで Postgres に読み書きし（`service_role` キーは使わない）、Jev API と Claude API はサーバー内からだけ呼びます。

![system-architecture](diagrams/system-architecture.svg)

<sub>元データ: [system-architecture.mmd](diagrams/system-architecture.mmd)</sub>

ローカル版（`npm start`）は `server.js` が 127.0.0.1 で待ち受け、認証なしで `data/store.json` に保存します。

## 2. コードの構成

`lib/bootstrap.js` が環境変数から local / cloud を判定し、クラウド設定が不足していれば全 API を 503 で拒否します（fail closed）。

![code-structure](diagrams/code-structure.svg)

<sub>元データ: [code-structure.mmd](diagrams/code-structure.mmd)</sub>

## 3. ログインから今日のクエストまで

![login-quest-sequence](diagrams/login-quest-sequence.svg)

<sub>元データ: [login-quest-sequence.mmd](diagrams/login-quest-sequence.mmd)</sub>

## 4. 一問一答の学習フロー

NW 午前・支援士・AWS 共通の「答えを見る → 自己判定」です。答えを見ただけでは正解扱いにならず、次の問題へは自動で進みません。詳細は [暗記のための学習画面](memorization-ui.md)。

![recall-flow](diagrams/recall-flow.svg)

<sub>元データ: [recall-flow.mmd](diagrams/recall-flow.mmd)</sub>

## 5. 学習分野の範囲

詳細は [AWS・GCP の資格別一問一答](cloud-courses.md) と [AWSコースと旧分野の整理](aws-courses.md)。

![learning-scope](diagrams/learning-scope.svg)

<sub>元データ: [learning-scope.mmd](diagrams/learning-scope.mmd)</sub>

## 6. テストとデプロイ

![ci-and-deploy](diagrams/ci-and-deploy.svg)

<sub>元データ: [ci-and-deploy.mmd](diagrams/ci-and-deploy.mmd)</sub>

旧分野の週次更新（[weekly-reading-updates.md](weekly-reading-updates.md)）は 2026-10-22 に停止しました（GitHub Actions 上で無効化し、`update-content.yml` から schedule を外し、手動実行のみ）。図中の点線はその停止済みの経路です。

## 図を Pele で SVG にする

[Pele](https://pele.run) は Mermaid を SVG にするライブラリ（MIT、依存なし）です。`.mmd` を編集したら次を実行すると（日本語の幅を測る処理を含む）、同じ場所に `.svg` が出力されます。

```bash
npm install --no-save pele
node scripts/render-diagrams.mjs
```
