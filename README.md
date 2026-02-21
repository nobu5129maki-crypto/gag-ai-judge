# ギャグ判定アプリ

AIがあなたのギャグを0〜100点で採点するWebアプリです。

## 機能

- **得点形式**: 0〜100点で採点
- **ベスト3履歴**: 過去の判定結果から上位3件を表示（ブラウザのlocalStorageに保存）
- **テキスト入力**: テキストエリアに直接入力
- **マイク入力**: 音声認識で話した内容を入力（Web Speech API）

## セキュリティ

- **APIキーはサーバー側のみ**: Google AI APIキーはVercelの環境変数で管理し、HTMLやクライアントには一切含まれません

## Vercelへのデプロイ

### 1. リポジトリをGitにプッシュ

### 2. Vercelでプロジェクトをインポート

[Vercel](https://vercel.com) にログインし、Gitリポジトリをインポートします。

### 3. 環境変数の設定

Vercelのプロジェクト設定 → Environment Variables で以下を追加：

| 名前 | 値 |
|------|-----|
| `GOOGLE_API_KEY` | あなたのGoogle AI (Gemini) APIキー |

- APIキーは [Google AI Studio](https://aistudio.google.com/apikey) で無料取得できます
- 既存の `OPENAI_API_KEY` がある場合は削除し、`GOOGLE_API_KEY` に置き換えてください

### 4. デプロイ

デプロイが完了すると、URLが発行されます。

## ローカル開発

```bash
npm install
npm run dev
```

ローカルでは `.env` に `GOOGLE_API_KEY` を設定するか、Vercel CLI でリンクして環境変数を同期してください。

## スマホにインストール

ブラウザの「ホーム画面に追加」または「アプリをインストール」で、スマホのホーム画面にアイコン付きで追加できます。アイコンはオレンジ色の笑い顔と採点のハンマーをモチーフにしたデザインです。

## 技術スタック

- **ホスティング**: Vercel（サーバーレス）
- **API**: Vercel Serverless Functions（`/api/judge`）
- **AI**: Google AI (Gemini) API
- **フロントエンド**: HTML, CSS, JavaScript
- **音声認識**: Web Speech API
