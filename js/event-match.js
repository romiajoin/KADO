// js/event-match.js — 機台（app.html）↔ 活動（events.html）自動比對邏輯。
// 兩邊頁面都是 <script type="module">，這裡刻意抽成共用檔案讓兩邊 import 同一份，
// 不採用專案「各檔案自帶所需邏輯」那套慣例（那是指 main.js／events.js 兩個「頁面」
// 互不依賴，不是指所有工具函式都要複製——utils.js 本來就已經是共用的先例）。
// 這條比對規則屬於「單一事實來源」很重要的類型：機台端判斷「這台有沒有活動」、
// 事件端判斷「這個地點有哪些機台」，如果各自維護一份、其中一邊改了規則忘記同步，
// 就會出現「機台說有活動、活動卻找不到這台機台」的矛盾，且不容易被發現。
//
// 不新增 Google Sheet 欄位：機台分頁「店名」欄如果屬於某檔活動，會直接填該活動的標題，
// 所以靠「標題＋期間」字串比對就能找到對應的活動；但活動分頁「同標題同期間」會把多個地點
// 合併成一組，同一組底下不是每個地點都擺一樣的機台，所以還要用縣市／場地／經緯度
// 進一步比對到「這台機台對應哪一個地點」，不能配對到活動群組就整組全算。

import { haversineKm } from './utils.js';

// ---- 手動排除標記：機台分頁「備註」欄位裡加上這個標記，這台機台就不會被自動比對到任何活動
// （寧可漏標，不要標錯）。全形/半形括號都吃；顯示備註文字時要另外呼叫 stripNoEventLinkTag() 拿掉標記本身。
const NO_EVENT_LINK_MARK = /[【\[]\s*不連結活動\s*[】\]]/;
const NO_EVENT_LINK_MARK_G = /[【\[]\s*不連結活動\s*[】\]]/g;

export function hasNoEventLinkTag(note) {
  return !!(note && NO_EVENT_LINK_MARK.test(note));
}

export function stripNoEventLinkTag(note) {
  if (!note) return note;
  return note.replace(NO_EVENT_LINK_MARK_G, '').trim();
}

// ---- 寬鬆比對用的正規化：全半形空白、括號、標點都忽略，NFKC 順便把全形英數轉半形 ----
const PUNCT_RE = /[\s（）()【】\[\]「」『』《》〈〉,，.。!！?？;；:：、~～\-—－·‧'"“”‘’]/g;

export function normalizeForMatch(str) {
  if (!str) return '';
  return String(str).normalize('NFKC').replace(PUNCT_RE, '').toLowerCase();
}

// ---- 核心比對：給一台機台＋一組候選的活動地點列（未分組的原始列都可以），
// 回傳比對到的那一筆活動地點物件，比不出來回傳 null。
// eventRows 的每一筆至少要有 { id, permId, title, period, city, venue, lat, lng }（events-data.js 的欄位）。
export function matchMachineToEventRow(machine, eventRows) {
  if (!machine || !eventRows || !eventRows.length) return null;
  if (hasNoEventLinkTag(machine.note)) return null;

  const normTitle = normalizeForMatch(machine.name);
  if (!normTitle) return null;
  const normPeriod = normalizeForMatch(machine.limited);

  let candidates = eventRows.filter((ev) => normalizeForMatch(ev.title) === normTitle
    && normalizeForMatch(ev.period) === normPeriod);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 多地點：先用縣市縮小範圍
  if (machine.city) {
    const cityMatches = candidates.filter((ev) => ev.city && ev.city === machine.city);
    if (cityMatches.length === 1) return cityMatches[0];
    if (cityMatches.length > 1) candidates = cityMatches;
  }

  // 場地欄互相包含（機台/活動兩邊填法不一定完全對稱，誰包含誰都算）
  if (machine.venue) {
    const venueMatches = candidates.filter((ev) => ev.venue
      && (ev.venue.includes(machine.venue) || machine.venue.includes(ev.venue)));
    if (venueMatches.length === 1) return venueMatches[0];
    if (venueMatches.length > 1) candidates = venueMatches;
  }

  // 經緯度都有效才比距離，取最近的一筆
  if (!Number.isNaN(machine.lat) && !Number.isNaN(machine.lng)) {
    const withCoords = candidates.filter((ev) => !Number.isNaN(ev.lat) && !Number.isNaN(ev.lng));
    if (withCoords.length > 0) {
      withCoords.sort((a, b) => haversineKm(machine.lat, machine.lng, a.lat, a.lng)
        - haversineKm(machine.lat, machine.lng, b.lat, b.lng));
      return withCoords[0];
    }
  }

  // 全部比不出來：寧可不標，不要標錯
  return null;
}

// ---- 反向查詢：某個活動地點底下有哪些機台。
// groupLocations 要傳「同一檔活動的完整地點清單」（events.js 的 group.locations），
// 不能只傳 eventRow 自己一筆——不然多地點時，同標題同期間的機台會被每個地點都判定成相關，
// 一定要讓 matchMachineToEventRow 用完整候選集合跑一次消歧，再比對結果是不是這一筆。
export function findRelatedMachines(eventRow, machines, groupLocations) {
  if (!eventRow || !machines || !machines.length) return [];
  const candidates = (groupLocations && groupLocations.length) ? groupLocations : [eventRow];
  return machines.filter((m) => {
    const match = matchMachineToEventRow(m, candidates);
    return !!match && match.id === eventRow.id;
  });
}

// ---- events.html 卡片列表用：這檔活動（不分地點，整組）底下出現過哪些機台類型，
// 給 events-card／collage-card／loc-card-grid 三種卡片的徽章列標示「有抽卡機／有相卡機」用。
// 卡片是「整檔活動」層級，還沒細到地點，所以這裡刻意不算數量、只算「有沒有」，
// 精確到地點的清單留給詳情 Modal 的「相關機台」區塊（見 findRelatedMachines）。
export function relatedMachineTypesForGroup(group, machines) {
  const types = new Set();
  if (!group || !group.locations || !machines || !machines.length) return types;
  group.locations.forEach((loc) => {
    findRelatedMachines(loc, machines, group.locations).forEach((m) => types.add(m.type));
  });
  return types;
}

// ---- 機台詳情（modal／sheet／側欄）標題用：機台屬於某檔活動時，標題本身變成連去 events.html
// 對應地點的連結；不屬於任何活動就照原樣輸出。列表卡片（grid 卡片／地圖 loc-card 列表）刻意不顯示
// 這個連結——那些地方版面窄、卡片本身可以點進去看詳情，連結放在詳情標題就好，不用在列表卡再重複一次。
// 網址帶的是永久ID（O欄，見「分享連結永久ID機制（活動版）」），不是 A 欄流水號——
// 這條連結雖然不是「分享」這個主動動作產生的，但一樣是可能被使用者收藏／之後重新點擊的
// 跨頁連結，一樣要避免 A 欄被管理者重新編號後連到別的活動。
export function eventUrl(eventRow) {
  return `events.html?event=${encodeURIComponent(eventRow.permId)}`;
}

export function machineTitleHtml(loc, { className = 'popup-title', source = '' } = {}) {
  if (loc && loc.eventMatch) {
    const title = `這台機台屬於期間活動《${loc.eventMatch.title}》，點擊查看活動詳情`;
    return `<a href="${eventUrl(loc.eventMatch)}" class="${className} event-title-link" title="${title}" onclick="trackEventTitleClick('${loc.id}','${loc.eventMatch.id}','${source}')">${loc.name}</a>`;
  }
  return `<div class="${className}">${loc ? loc.name : ''}</div>`;
}
