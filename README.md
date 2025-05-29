# Moodle Quiz Helper

Moodleのクイズ問題をAIを活用して解答を予測するChrome拡張機能です。

## 機能

- Moodleのクイズページで問題文を自動的に検出
- OpenAI APIを使用して問題の解答を予測
- 予測された解答を問題の近くに表示
- オプションページでAPIキーの設定が可能

## インストール方法

1. [Releases](https://github.com/TMed-IT/moodle-quiz-helper/releases/latest)ページから最新の`moodle-quiz-export.crx`ファイルをダウンロード
2. Chromeブラウザで `chrome://extensions/` を開きます
3. 右上の「デベロッパーモード」をオンにします
4. ダウンロードした`.crx`ファイルを拡張機能ページにドラッグ＆ドロップ

## 使用方法

1. 拡張機能のオプションページでGemini APIキーを設定します
2. Moodleのクイズページにアクセスします
3. 問題が表示されると、自動的に解答の予測が開始されます
4. 予測された解答は問題の近くに表示されます

## 注意事項

- 予測された解答は参考情報であり、必ずしも正解とは限りません
- APIキーは安全に管理してください
- Geminiの無料利用枠には制限があります。詳細は[公式ドキュメント](https://ai.google.dev/pricing)をご確認ください。

## APIキーの取得方法

この拡張機能を使用するには、Gemini APIキーが必要です。以下の手順で取得できます。

1. Google AI Studioにアクセスします ([https://aistudio.google.com/](https://aistudio.google.com/))
2. Googleアカウントでログインします。
3. 「Get API key in Google AI Studio」を選択します。
4. 「Create API key in new project」をクリックして新しいプロジェクトでAPIキーを作成するか、既存のプロジェクトを選択します。
5. 生成されたAPIキーをコピーします。

## ライセンス

MITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。
