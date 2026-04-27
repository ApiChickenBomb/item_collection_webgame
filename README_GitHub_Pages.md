# GitHub Pages 配置手順

## 1. 置くファイル
以下の5ファイルをリポジトリのルート直下に置きます。

- index.html
- style.css
- main.js
- items.json
- explore-results.json

例:

```text
your-repo/
├─ index.html
├─ style.css
├─ main.js
├─ items.json
└─ explore-results.json
```

## 2. GitHub に push
main ブランチへ push します。

## 3. GitHub Pages を有効化
1. GitHub の対象リポジトリを開く
2. `Settings`
3. 左メニューの `Pages`
4. `Build and deployment` の `Source` を `Deploy from a branch` にする
5. Branch は `main`
6. Folder は `/ (root)`
7. `Save`

## 4. 公開URL
通常は次の形式です。

```text
https://<ユーザー名>.github.io/<リポジトリ名>/
```

## 5. 動作確認
公開後に以下を確認します。

- ページが開く
- 「探索」に出るボタンが押せる
- 図鑑タブへ切り替えられる
- 購入タブで商品が表示される
- リロードしても所持金や取得アイテムが残る
- 「データを初期化する」で初期状態へ戻る

## 6. よくある注意点
- JSON を `data/` に移した場合は `main.js` の `fetch()` パス変更が必要
- Pages 公開直後は反映まで少し時間がかかることがある
- ローカルで HTML を直接ダブルクリックして開くと、環境によっては `fetch()` が制限されることがある
- 確認用ローカルサーバーを使うなら VS Code の Live Server などが簡単
