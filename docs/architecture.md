# main.js の各ロジック解説

main.js を主要な機能ごとに分割して、詳しく解説します。

## 1. **初期化と状態管理**

### startApp() - アプリケーション起動
```javascript
async function startApp() {
  bindEvents();
  setLoadingState(true, "データを読み込み中です...");

  try {
    const [itemsResponse, exploreResultsResponse] = await Promise.all([
      fetch("items.json"),
      fetch("explore-results.json"),
    ]);
    // ...
  }
}
```
**役割**: アプリの起動処理
- **イベントバインディング**: UI要素にクリックハンドラを登録
- **JSONファイル読み込み**: `Promise.all()` で 2 つのファイルを並列取得
- **状態初期化**: `ITEMS`、`EXPLORE_RESULTS`、`itemMap` を設定
- **エラーハンドリング**: ファイルがない場合はエラーメッセージを表示

---

### loadState() / saveState() - ローカルストレージ連携
```javascript
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);  // データの妥当性チェック
    }
  } catch (error) {
    console.error("save load failed", error);
  }
  
  const initial = createInitialState();
  saveState(initial);
  return initial;
}
```
**役割**: ゲームデータの永続化
- **初回プレイ**: 新規保存データを作成して返す
- **再プレイ**: 前回のセッションから復元
- **normalizeState()**: 破損したデータを修正（無効なアイテムID を除外）

---

## 2. **タブ管理**

### switchTab() - タブ切り替え
```javascript
function switchTab(tabName) {
  const validTab = ["book", "explore", "shop"].includes(tabName) ? tabName : "explore";

  elements.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === validTab);
  });

  Object.entries(elements.screens).forEach(([key, screen]) => {
    screen.classList.toggle("active", key === validTab);
  });

  localStorage.setItem(TAB_STORAGE_KEY, validTab);
}
```
**役割**: タブの表示/非表示を制御
- **バリデーション**: 不正なタブ名が渡された場合は「探索」タブにデフォルト
- **CSSクラス操作**: `active` クラスで表示状態を管理
- **永続化**: 最後に開いていたタブをローカルストレージに保存

---

## 3. **レンダリング（UI更新）**

### render() - 全体の再描画
```javascript
function render() {
  if (!state) return;
  renderStatus();      // 所持金・発見数の表示
  renderBookList();    // 図鑑リスト
  renderBookDetail();  // 図鑑詳細
  renderExplore();     // 探索結果
  renderShopList();    // ショップリスト
  renderShopDetail();  // ショップ詳細
}
```
**役割**: 状態変更を画面に反映（MVC の View 層）

### renderBookList() - 図鑑リスト生成
```javascript
function renderBookList() {
  elements.bookList.innerHTML = "";

  ITEMS.forEach((item) => {
    const discovered = state.discoveredItemIds.includes(item.id);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = discovered ? item.name : "？？？";  // 未発見は「？？？」
    button.classList.toggle("selected", state.selectedBookItemId === item.id);
    button.addEventListener("click", () => {
      state.selectedBookItemId = item.id;
      saveState();
      renderBookList();
      renderBookDetail();
    });
    li.appendChild(button);
    elements.bookList.appendChild(li);
  });
}
```
**役割**: 図鑑の左パネルに各アイテムのボタンを生成
- **発見チェック**: `discoveredItemIds` に含まれていれば名前表示、なければ「？？？」
- **選択状態**: 選ばれたアイテムに `selected` クラスを追加
- **クリックハンドラ**: アイテム選択時に詳細を更新

### renderBookDetail() - 図鑑詳細表示
```javascript
function renderBookDetail() {
  if (!state.selectedBookItemId) {
    elements.bookName.textContent = "未選択";
    return;
  }

  const item = itemMap.get(state.selectedBookItemId);
  const discovered = state.discoveredItemIds.includes(item.id);
  
  if (!discovered) {
    elements.bookName.textContent = "？？？";
    elements.bookEffect.textContent = "未発見";  // 未発見は詳細を隠す
    return;
  }

  elements.bookName.textContent = item.name;
  elements.bookEffect.textContent = `${item.effectText} / ${item.rarity} / ${item.category}`;
  elements.bookDescription.textContent = item.description;
}
```
**役割**: 選択アイテムの詳細情報を表示
- **未発見状態**: 情報を隠してネタバレを防止
- **発見済み状態**: 完全な情報を表示

---

## 4. **ゲームロジック**

### handleExplore() - 探索処理
```javascript
function handleExplore() {
  const result = weightedPick(EXPLORE_RESULTS, (entry) => entry.weight);
  
  if (result.type === "money") {
    const amount = randomInt(result.minValue, result.maxValue) + getMoneyBonus();
    state.money += amount;
    // ...
  }

  if (result.type === "item") {
    const item = rollExploreItem(result.id);
    if (item) {
      addOwnedItem(item.id);
      // ...
    }
  }

  state.shopItemIds = rollShopItems(state, 3);
  saveState();
  render();
}
```
**役割**: 探索ボタンクリック時の処理
1. **結果抽選**: `EXPLORE_RESULTS` から重み付けで結果を選択
2. **お金獲得**: `getMoneyBonus()` で報酬追加
3. **アイテム獲得**: `rollExploreItem()` で未所持アイテムを抽選
4. **ショップ更新**: 探索後にショップの品揃えをリロール

### handleBuy() - 購入処理
```javascript
function handleBuy() {
  const item = itemMap.get(state.selectedShopItemId);
  const actualPrice = getActualPrice(item);  // 割引を適用
  
  if (state.money < actualPrice) {
    elements.shopMessage.textContent = `所持金が足りません。必要金額：${actualPrice}円`;
    return;
  }

  state.money -= actualPrice;
  addOwnedItem(item.id);
  state.shopItemIds = rollShopItems(state, 3);
  // ...
}
```
**役割**: 購入ボタンクリック時の処理
- **価格計算**: `getActualPrice()` で割引を適用
- **残高確認**: 所持金が不足していないかチェック
- **更新**: 所持金を減らし、アイテムを追加

---

## 5. **ボーナス計算システム**

### getMoneyBonus() - お金ボーナス計算
```javascript
function getMoneyBonus(currentState = state) {
  return getOwnedItems(currentState)
    .filter((item) => item.effectType === "money_bonus_flat")
    .reduce((sum, item) => sum + item.effectValue, 0);
}
```
**役割**: 所持アイテムから合計ボーナスを計算
- **効果タイプで絞込**: `money_bonus_flat` タイプのアイテムのみ対象
- **合計計算**: `reduce()` で全ボーナスを加算

### 他のボーナス関数
```javascript
getRareBonus()         // レアアイテム出現率アップ
getDiscountBonus()     // ショップ割引
getShopRefreshBonus()  // ショップ更新時の未発見アイテム優先度
```

---

## 6. **抽選ロジック**

### rollExploreItem() - 探索アイテム抽選
```javascript
function rollExploreItem(resultId) {
  const unowned = ITEMS.filter((item) => {
    return !state.ownedItemIds.includes(item.id)
      && item.discoverFrom.includes("explore")
      && item.exploreWeight > 0;
  });

  if (resultId === "item_common") {
    const pool = unowned.filter((item) => item.rarity !== "rare");
    return weightedPick(pool.length > 0 ? pool : unowned, (item) => item.exploreWeight);
  }

  // レアアイテムの場合、ボーナスを適用
  const rareBonus = getRareBonus();
  const boostedPool = unowned.map((item) => {
    const bonus = item.rarity === "rare" ? rareBonus : 0;
    return {
      item,
      weight: item.exploreWeight + bonus,
    };
  });

  const picked = weightedPick(boostedPool, (entry) => entry.weight);
  return picked ? picked.item : null;
}
```
**役割**: 探索で獲得するアイテムを決定
- **未所持フィルタ**: すでに持っているアイテムは除外
- **コモン結果**: レア度が「rare」以外のアイテムからのみ抽選
- **その他**: レアボーナスを加算して重み付けを調整

### rollShopItems() - ショップ品揃え抽選
```javascript
function rollShopItems(currentState, count) {
  const candidates = ITEMS.filter((item) => {
    return !currentState.ownedItemIds.includes(item.id) && item.shopWeight > 0;
  });

  const results = [];
  const refreshBonus = getShopRefreshBonus(currentState);
  const temp = [...candidates];

  while (results.length < count && temp.length > 0) {
    const picked = weightedPick(temp, (item) => {
      const undiscoveredBonus = !currentState.discoveredItemIds.includes(item.id)
        ? refreshBonus * 10
        : 0;
      return item.shopWeight + undiscoveredBonus;  // 未発見アイテムを優先
    });

    if (!picked) break;
    results.push(picked.id);
    
    // 選ばれたアイテムを候補から除外（重複なし）
    const index = temp.findIndex((item) => item.id === picked.id);
    if (index >= 0) {
      temp.splice(index, 1);
    }
  }

  return results;
}
```
**役割**: ショップに並べるアイテムを 3 個選択
- **未発見優先**: プレイヤーが未発見のアイテムを重点的に表示
- **重複回避**: 同じアイテムが複数並ばないよう、選ばれたら除外

### weightedPick() - 重み付け抽選
```javascript
function weightedPick(array, weightFn) {
  const weighted = array.map((item) => ({
    item,
    weight: Math.max(0, weightFn(item)),
  }));

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return null;
  }

  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.item;
    }
  }

  return weighted[weighted.length - 1]?.item ?? null;
}
```
**役割**: 重み付き抽選アルゴリズム（ルーレット方式）
- **重みの正規化**: すべてのウェイトを合計
- **確率計算**: ランダムな値を重みで分割
- **選択**: どの領域に落ちたかで結果を決定

**例**: `[A(weight:30), B(weight:20), C(weight:50)]` の場合
- 0～30: A が選ばれる（30%）
- 30～50: B が選ばれる（20%）
- 50～100: C が選ばれる（50%）

---

## 7. **ユーティリティ関数**

### addOwnedItem() - アイテム追加
```javascript
function addOwnedItem(itemId) {
  if (!state.ownedItemIds.includes(itemId)) {
    state.ownedItemIds.push(itemId);      // 所持アイテムに追加
  }
  if (!state.discoveredItemIds.includes(itemId)) {
    state.discoveredItemIds.push(itemId); // 発見済みアイテムに追加
  }
}
```
**役割**: アイテム入手時の状態更新
- **所持追加**: `ownedItemIds` に追加（重複チェック）
- **発見追加**: `discoveredItemIds` に追加（図鑑に掲載）

### getActualPrice() - 実際の価格計算
```javascript
function getActualPrice(item) {
  return Math.max(0, item.price - getDiscountBonus());
}
```
**役割**: ボーナスによる割引を適用
- **マイナス防止**: `Math.max(0, ...)` で負の値を防止

---

## 全体フロー図

```
[ゲーム開始]
    ↓
[startApp()で初期化]
    ↓
[ローカルストレージからデータ読み込み] ← normalizeState()で検証
    ↓
[render()で画面描画]
    ↓
[ユーザー操作]
    ├─ [探索]→ handleExplore() → 抽選 → 報酬獲得 → rollShopItems() → render()
    ├─ [購入]→ handleBuy() → 所持金チェック → addOwnedItem() → rollShopItems() → render()
    └─ [リセット]→ handleReset() → 初期状態復帰
    ↓
[saveState()で自動保存] ← localStorage に JSON 保存
```

このアーキテクチャにより、**状態管理が明確**で、**ボーナスシステムが柔軟**に拡張可能な構造になっています。
