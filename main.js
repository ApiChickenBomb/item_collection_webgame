const STORAGE_KEY = "collectionGameSave";
const TAB_STORAGE_KEY = "collectionGameCurrentTab";

let ITEMS = [];
let EXPLORE_RESULTS = [];
let itemMap = new Map();
let state = null;

const elements = {
  tabs: document.querySelectorAll(".tab-button"),
  screens: {
    book: document.getElementById("screen-book"),
    explore: document.getElementById("screen-explore"),
    shop: document.getElementById("screen-shop"),
  },
  bookMoney: document.getElementById("book-money"),
  bookCount: document.getElementById("book-count"),
  exploreMoney: document.getElementById("explore-money"),
  exploreCount: document.getElementById("explore-count"),
  shopMoney: document.getElementById("shop-money"),
  shopCount: document.getElementById("shop-count"),
  bookList: document.getElementById("book-list"),
  shopList: document.getElementById("shop-list"),
  bookName: document.getElementById("book-name"),
  bookEffect: document.getElementById("book-effect"),
  bookDescription: document.getElementById("book-description"),
  exploreMessage: document.getElementById("explore-message"),
  exploreItemName: document.getElementById("explore-item-name"),
  exploreItemEffect: document.getElementById("explore-item-effect"),
  exploreItemDescription: document.getElementById("explore-item-description"),
  exploreButton: document.getElementById("explore-button"),
  exploreSubMessage: document.getElementById("explore-sub-message"),
  shopName: document.getElementById("shop-name"),
  shopEffect: document.getElementById("shop-effect"),
  shopPrice: document.getElementById("shop-price"),
  buyButton: document.getElementById("buy-button"),
  shopMessage: document.getElementById("shop-message"),
  resetButton: document.getElementById("reset-button"),
};

startApp();

async function startApp() {
  bindEvents();
  setLoadingState(true, "データを読み込み中です...");

  try {
    const [itemsResponse, exploreResultsResponse] = await Promise.all([
      fetch("items.json"),
      fetch("explore-results.json"),
    ]);

    if (!itemsResponse.ok || !exploreResultsResponse.ok) {
      throw new Error("JSONファイルの取得に失敗しました。");
    }

    ITEMS = await itemsResponse.json();
    EXPLORE_RESULTS = await exploreResultsResponse.json();
    itemMap = new Map(ITEMS.map((item) => [item.id, item]));
    state = loadState();

    render();
    switchTab(loadCurrentTab());
    setLoadingState(false, "");
  } catch (error) {
    console.error(error);
    setLoadingState(true, "データの読み込みに失敗しました。items.json と explore-results.json の配置を確認してください。");
  }
}

function bindEvents() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  elements.exploreButton.addEventListener("click", handleExplore);
  elements.buyButton.addEventListener("click", handleBuy);
  elements.resetButton.addEventListener("click", handleReset);
}

function setLoadingState(isLoading, message) {
  elements.exploreButton.disabled = isLoading;
  elements.buyButton.disabled = isLoading;
  elements.exploreSubMessage.textContent = message;
  elements.shopMessage.textContent = message;
}

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

function loadCurrentTab() {
  const saved = localStorage.getItem(TAB_STORAGE_KEY);
  return ["book", "explore", "shop"].includes(saved) ? saved : "explore";
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    }
  } catch (error) {
    console.error("save load failed", error);
  }

  const initial = createInitialState();
  saveState(initial);
  return initial;
}

function normalizeState(data) {
  const initial = createInitialState();
  return {
    money: Number.isFinite(data.money) ? data.money : initial.money,
    ownedItemIds: Array.isArray(data.ownedItemIds) ? data.ownedItemIds.filter((id) => itemMap.has(id)) : [],
    discoveredItemIds: Array.isArray(data.discoveredItemIds) ? data.discoveredItemIds.filter((id) => itemMap.has(id)) : [],
    shopItemIds: Array.isArray(data.shopItemIds) ? data.shopItemIds.filter((id) => itemMap.has(id)) : initial.shopItemIds,
    selectedBookItemId: data.selectedBookItemId ?? null,
    selectedShopItemId: data.selectedShopItemId ?? null,
    lastExploreResult: data.lastExploreResult ?? initial.lastExploreResult,
  };
}

function createInitialState() {
  const initial = {
    money: 0,
    ownedItemIds: [],
    discoveredItemIds: [],
    shopItemIds: [],
    selectedBookItemId: null,
    selectedShopItemId: null,
    lastExploreResult: {
      message: "探索に出ると結果がここに表示されます。",
      itemId: null,
      subMessage: "",
    },
  };

  initial.shopItemIds = rollShopItems(initial, 3);
  initial.selectedShopItemId = initial.shopItemIds[0] ?? null;
  return initial;
}

function saveState(targetState = state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targetState));
}

function render() {
  if (!state) return;
  renderStatus();
  renderBookList();
  renderBookDetail();
  renderExplore();
  renderShopList();
  renderShopDetail();
}

function renderStatus() {
  if (!state) return;
  const countText = `発見アイテム：${state.discoveredItemIds.length} / ${ITEMS.length}`;
  elements.bookMoney.textContent = `所持金：${state.money}`;
  elements.exploreMoney.textContent = `所持金：${state.money}`;
  elements.shopMoney.textContent = `所持金：${state.money}`;
  elements.bookCount.textContent = countText;
  elements.exploreCount.textContent = countText;
  elements.shopCount.textContent = countText;
}

function renderBookList() {
  if (!state) return;
  elements.bookList.innerHTML = "";

  ITEMS.forEach((item) => {
    const discovered = state.discoveredItemIds.includes(item.id);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = discovered ? item.name : "？？？";
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

function renderBookDetail() {
  if (!state) return;

  if (!state.selectedBookItemId) {
    elements.bookName.textContent = "未選択";
    elements.bookEffect.textContent = "-";
    elements.bookDescription.textContent = "図鑑の左側からアイテムを選択してください。";
    return;
  }

  const item = itemMap.get(state.selectedBookItemId);
  if (!item) {
    elements.bookName.textContent = "未選択";
    elements.bookEffect.textContent = "-";
    elements.bookDescription.textContent = "図鑑の左側からアイテムを選択してください。";
    return;
  }

  const discovered = state.discoveredItemIds.includes(item.id);
  if (!discovered) {
    elements.bookName.textContent = "？？？";
    elements.bookEffect.textContent = "未発見";
    elements.bookDescription.textContent = "まだこのアイテムは発見していません。";
    return;
  }

  elements.bookName.textContent = item.name;
  elements.bookEffect.textContent = `${item.effectText} / ${item.rarity} / ${item.category}`;
  elements.bookDescription.textContent = item.description;
}

function renderExplore() {
  if (!state) return;
  const result = state.lastExploreResult ?? {};
  elements.exploreMessage.textContent = result.message || "探索に出ると結果がここに表示されます。";
  elements.exploreSubMessage.textContent = result.subMessage || "";

  if (!result.itemId) {
    elements.exploreItemName.textContent = "-";
    elements.exploreItemEffect.textContent = "-";
    elements.exploreItemDescription.textContent = "-";
    return;
  }

  const item = itemMap.get(result.itemId);
  if (!item) {
    elements.exploreItemName.textContent = "-";
    elements.exploreItemEffect.textContent = "-";
    elements.exploreItemDescription.textContent = "-";
    return;
  }

  elements.exploreItemName.textContent = item.name;
  elements.exploreItemEffect.textContent = `${item.effectText} / ${item.rarity} / ${item.category}`;
  elements.exploreItemDescription.textContent = item.description;
}

function renderShopList() {
  if (!state) return;
  elements.shopList.innerHTML = "";

  if (state.shopItemIds.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = '<button class="empty-button" disabled>購入可能なアイテムがありません</button>';
    elements.shopList.appendChild(li);
    return;
  }

  state.shopItemIds.forEach((itemId) => {
    const item = itemMap.get(itemId);
    if (!item) return;

    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = item.name;
    button.classList.toggle("selected", state.selectedShopItemId === item.id);
    button.addEventListener("click", () => {
      state.selectedShopItemId = item.id;
      elements.shopMessage.textContent = "";
      saveState();
      renderShopList();
      renderShopDetail();
    });
    li.appendChild(button);
    elements.shopList.appendChild(li);
  });
}

function renderShopDetail() {
  if (!state) return;
  const item = itemMap.get(state.selectedShopItemId);
  if (!item) {
    elements.shopName.textContent = "未選択";
    elements.shopEffect.textContent = "-";
    elements.shopPrice.textContent = "-";
    return;
  }

  const actualPrice = getActualPrice(item);
  const discount = Math.max(0, item.price - actualPrice);

  elements.shopName.textContent = item.name;
  elements.shopEffect.textContent = `${item.effectText} / ${item.rarity} / ${item.category}`;
  elements.shopPrice.textContent = discount > 0
    ? `${actualPrice} 円（割引前 ${item.price} 円）`
    : `${actualPrice} 円`;
}

function handleExplore() {
  if (!state) return;
  elements.shopMessage.textContent = "";

  const result = weightedPick(EXPLORE_RESULTS, (entry) => entry.weight);
  if (!result) return;

  if (result.type === "money") {
    const amount = randomInt(result.minValue, result.maxValue) + getMoneyBonus();
    state.money += amount;
    state.lastExploreResult = {
      message: `${result.message} ${amount}円を獲得した。`,
      itemId: null,
      subMessage: "お金を拾ったため、今回はアイテム取得はありません。",
    };
  }

  if (result.type === "item") {
    const item = rollExploreItem(result.id);
    if (item) {
      addOwnedItem(item.id);
      state.lastExploreResult = {
        message: result.message,
        itemId: item.id,
        subMessage: `${item.name} を入手した。`,
      };
    } else {
      state.lastExploreResult = {
        message: "めぼしい物は見つからなかった。",
        itemId: null,
        subMessage: "未取得アイテムが少ないため、探索成果はなかった。",
      };
    }
  }

  state.shopItemIds = rollShopItems(state, 3);
  state.selectedShopItemId = state.shopItemIds[0] ?? null;
  saveState();
  render();
}

function handleBuy() {
  if (!state) return;
  const item = itemMap.get(state.selectedShopItemId);
  if (!item) {
    elements.shopMessage.textContent = "購入するアイテムを選択してください。";
    return;
  }

  const actualPrice = getActualPrice(item);
  if (state.money < actualPrice) {
    elements.shopMessage.textContent = `所持金が足りません。必要金額：${actualPrice}円`;
    return;
  }

  state.money -= actualPrice;
  addOwnedItem(item.id);
  state.shopItemIds = rollShopItems(state, 3);
  state.selectedShopItemId = state.shopItemIds[0] ?? null;
  state.lastExploreResult = {
    message: `${item.name} を購入した。`,
    itemId: item.id,
    subMessage: `${actualPrice}円を支払った。`,
  };
  elements.shopMessage.textContent = `${item.name} を購入しました。`;

  saveState();
  render();
}

function handleReset() {
  if (!state) return;
  const ok = window.confirm("保存データを初期化します。よろしいですか？");
  if (!ok) return;

  const newState = createInitialState();
  Object.assign(state, newState);
  saveState();
  localStorage.setItem(TAB_STORAGE_KEY, "explore");
  render();
  switchTab("explore");
  elements.shopMessage.textContent = "";
}

function addOwnedItem(itemId) {
  if (!state) return;
  if (!state.ownedItemIds.includes(itemId)) {
    state.ownedItemIds.push(itemId);
  }
  if (!state.discoveredItemIds.includes(itemId)) {
    state.discoveredItemIds.push(itemId);
  }
}

function getOwnedItems(currentState = state) {
  return currentState.ownedItemIds.map((id) => itemMap.get(id)).filter(Boolean);
}

function getMoneyBonus(currentState = state) {
  return getOwnedItems(currentState)
    .filter((item) => item.effectType === "money_bonus_flat")
    .reduce((sum, item) => sum + item.effectValue, 0);
}

function getRareBonus(currentState = state) {
  return getOwnedItems(currentState)
    .filter((item) => item.effectType === "rare_bonus_flat")
    .reduce((sum, item) => sum + item.effectValue, 0);
}

function getDiscountBonus(currentState = state) {
  return getOwnedItems(currentState)
    .filter((item) => item.effectType === "shop_discount_flat")
    .reduce((sum, item) => sum + item.effectValue, 0);
}

function getShopRefreshBonus(currentState = state) {
  return getOwnedItems(currentState)
    .filter((item) => item.effectType === "shop_refresh_bonus")
    .reduce((sum, item) => sum + item.effectValue, 0);
}

function getActualPrice(item) {
  return Math.max(0, item.price - getDiscountBonus());
}

function rollExploreItem(resultId) {
  const unowned = ITEMS.filter((item) => {
    return !state.ownedItemIds.includes(item.id)
      && item.discoverFrom.includes("explore")
      && item.exploreWeight > 0;
  });

  if (unowned.length === 0) {
    return null;
  }

  if (resultId === "item_common") {
    const pool = unowned.filter((item) => item.rarity !== "rare");
    return weightedPick(pool.length > 0 ? pool : unowned, (item) => item.exploreWeight);
  }

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
      return item.shopWeight + undiscoveredBonus;
    });

    if (!picked) break;

    results.push(picked.id);
    const index = temp.findIndex((item) => item.id === picked.id);
    if (index >= 0) {
      temp.splice(index, 1);
    }
  }

  return results;
}

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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
