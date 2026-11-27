// api/events.js
//
// 攔截 /events.html 的請求（見 vercel.json 的 rewrite），目的是讓直接分享
// `/events.html?event=永久ID`、以及「搜尋結果」分享連結（`/events.html?q=...`、
// `?category=..&ip=..&city=..&view=..&day=..` 等）這類網址時，Threads/LINE/Discord
// 等爬蟲也能看到 OG 預覽圖，不只是走 /api/event-share 那條路徑才有圖。
//
// 跟 api/event-share.js 不同：這支不是導轉頁，回傳的就是真正的 SPA 內容本身
// （原封不動的 events-app.html），只是動態把 og:title / og:image 等標籤塞進
// <head>。真人訪客看到的頁面內容完全不受影響，js/events.js 原本讀取
// window.location.search 裡 event/q/category/city/ip/view/layout/day 等參數的
// 邏輯也不用改。
//
// 跟 api/index.js 是同一套做法的活動版對照組：
// ⚠️ SPA 殼層檔案刻意命名為 events-app.html、不叫 events.html：Vercel 的路由
// 優先權是「同路徑的靜態檔案 > vercel.json 的 rewrites」——如果專案根目錄真的
// 有一個 events.html，`/events.html` 這個請求會直接被當成靜態檔案原樣回傳，
// vercel.json 裡 `"/events.html" -> "/api/events"` 的 rewrite 規則永遠不會被
// 觸發（這支 function 形同虛設）。這正是「分享搜尋結果」連結一直沒有預覽圖的
// 根因：events.html 本身完全沒有 og:image 標籤，而搜尋結果分享連結就是直接把
// 網址列（/events.html?q=...）複製出去，沒有經過 /api/event-share 那條導轉路徑。

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://kadotw.vercel.app';

// 四種「純預設狀態」各自一張預覽圖（沒有 ?event=、沒有搜尋/篩選時才會用到）：
//   c＝總覽·拼貼格（也是完全沒帶任何參數時的最終 fallback）
//   d＝總覽·列表版面
//   e＝月曆（不管是月曆本身、還是月曆搜尋結果，都用這張）
//   f＝月曆點日期展開的 day-events-panel
// 目前四張都先放一份跟 event-og.png 相同的暫用檔案，之後有正式設計圖時，直接覆蓋對應
// 檔名（events-list-og.png／events-calendar-og.png／events-day-og.png）即可，不用再動
// 這支程式。
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/images/event-og.png`; // c
const LIST_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/images/events-list-og.png`; // d
const CALENDAR_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/images/events-calendar-og.png`; // e
const DAY_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/images/events-day-og.png`; // f

const TITLE = '動漫快閃店・展覽・CAFÉ・特典活動情報｜KADO！';
const DESCRIPTION = '動漫快閃店、展覽、CAFÉ / 餐廳 、特典活動、路跑、聯名活動、音樂會 / 演唱會、實境解謎，持續更新中！';

// 跟 js/events-data.js 的 EVENTS_SHEET_CSV_URL 是同一份，兩邊各自獨立宣告
// （一個是 ES Module 給前端用，一個是這支 CommonJS serverless function，無法互相 import）
const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

// 欄位索引跟 api/event-share.js 保持一致
const SHARE_IMAGE_COL = 13;
const PERMANENT_ID_COL = 14;

// 跟 api/event-share.js / js/events-data.js 同一套解析規則（各自獨立一份，環境不同無法共用）
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

// 沒有 ?event=（一般訪客／搜尋結果／純切換版面）時，依目前是哪一種「純預設狀態」
// 決定要用哪張預設圖。優先權：day-events-panel（?day=）> 月曆（?view=calendar）>
// 總覽·列表（?layout=list）> 總覽·拼貼格（其餘情況，最終 fallback）。
function pickPageDefaultImage(query) {
  if (query.day) return DAY_DEFAULT_OG_IMAGE_URL;
  if (query.view === 'calendar') return CALENDAR_DEFAULT_OG_IMAGE_URL;
  if (query.layout === 'list') return LIST_DEFAULT_OG_IMAGE_URL;
  return DEFAULT_OG_IMAGE_URL;
}

// 單一活動的分享圖選圖規則，跟 api/event-share.js 的 pickShareImage() 同一套（各自獨立宣告）：
// N 欄用「,」或「、」分四張圖，依「從哪裡點開分享」分別對應：
//   grid＝總覽·拼貼格卡片　list＝總覽·列表卡片　bar＝月曆的 events-bar
//   card＝月曆 day-events-panel 裡的 events-card
// 一定要湊滿四張才會分別套用；沒湊滿四張（不管是完全空白、還是只填了一兩張）都視為
// 「這個情境沒有專屬圖」，直接退回對應情境的預設圖（grid→c／list→d／bar→e／card→f），
// 不會誤把其中一張套到別的情境。
const SHARE_IMAGE_FALLBACK_BY_FROM = {
  grid: DEFAULT_OG_IMAGE_URL,
  list: LIST_DEFAULT_OG_IMAGE_URL,
  bar: CALENDAR_DEFAULT_OG_IMAGE_URL,
  card: DAY_DEFAULT_OG_IMAGE_URL,
};
const SHARE_IMAGE_INDEX_BY_FROM = { grid: 0, list: 1, bar: 2, card: 3 };

function pickShareImage(raw, from) {
  const fallback = SHARE_IMAGE_FALLBACK_BY_FROM[from] || DEFAULT_OG_IMAGE_URL;
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 4) return fallback;
  const idx = SHARE_IMAGE_INDEX_BY_FROM[from] ?? 0;
  return parts[idx] || fallback;
}

// 抓活動 CSV 並解析成欄位陣列（每次回源都抓一次：除了 ?event= 的分享圖，
// 現在還要用來在伺服器端輸出活動清單給搜尋引擎，見下方 buildSeoEventList()）。
// 加 3 秒逾時：Google Sheet 偶爾很慢，寧可這次不輸出清單，也不要讓整頁卡住。
// 任何失敗都回傳 null，呼叫端退回原本「沒有資料」的行為，不讓頁面掛掉。
// /events 有 CDN 快取（s-maxage=60），同一個網址每分鐘最多回源一次，不會每個訪客都打 Sheet。
async function fetchEventRows() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(EVENTS_SHEET_CSV_URL, { signal: controller.signal });
    if (!response.ok) return null;
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      parsed.push(parseCSVRow(rows[i].replace(/\r$/, '')));
    }
    return parsed;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ?event= 只認永久ID（O欄），跟 /api/event-share 現在的規則一致，不比對 A 欄流水號。
// 找不到、欄位空白、或抓取失敗都回傳「純預設狀態」該用的那張圖。
function getShareImageUrl(id, query, rows) {
  if (!id || !rows) return pickPageDefaultImage(query);
  const match = rows.find((cols) => cols[PERMANENT_ID_COL] === id);
  if (match) {
    return pickShareImage(match[SHARE_IMAGE_COL], query.from || 'grid');
  }
  return pickPageDefaultImage(query);
}

// ── 伺服器端活動清單（SEO）──────────────────────────────────────────
// events-app.html 原本只有 skeleton（「載入中…」），活動內容全靠前端 JS 抓 Sheet 再畫，
// 搜尋引擎第一輪（不執行 JS）只看得到空殼。這裡把「進行中＋即將開始」的活動輸出成
// 純文字清單，塞進 #eventsCollageGrid 的 skeleton 裡：
//   - 用 .visually-hidden（style.css 既有，同 <h1> 的做法）視覺隱藏，不改變版面、不造成 CLS
//   - 前端 renderCollageGrid() 第一次渲染就會整段覆寫 #eventsCollageGrid 的 innerHTML，
//     所以 JS 執行後畫面／DOM 只剩真正的活動卡片，內容跟這份清單一致，不是隱藏關鍵字
//   - events.js 的 COLLAGE_SKELETON_HTML 會連同這份清單一起快照，只在「資料還在載入」時
//     重新顯示，一樣是視覺隱藏，不影響畫面
// 欄位索引跟 js/core/events-data.js 的 COL 一致（各自獨立宣告，環境不同無法共用）
const COL = { title: 2, category: 1, period: 3, venue: 4, city: 5 };
const SEO_LIST_MAX = 300;

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 'YYYY/M/D' → 可比較的數字 YYYYMMDD；格式不對回傳 null
function dateNum(str) {
  const m = String(str || '').trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

// 台灣時間的今天（YYYYMMDD），Vercel function 跑在 UTC
function todayNumTaipei() {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function buildSeoEventList(rows) {
  if (!rows) return '';
  const today = todayNumTaipei();
  // 同一檔活動多個地點：跟 events.js 的 groupKey() 一樣用「標題＋期間」合併成一筆
  const groups = new Map();
  rows.forEach((cols) => {
    const title = (cols[COL.title] || '').trim();
    const period = (cols[COL.period] || '').trim();
    if (!title || !period) return;
    const [startStr, endStr] = period.split('～').map((s) => s.trim());
    const start = dateNum(startStr);
    const end = dateNum(endStr) || start;
    if (!start || end < today) return; // 已結束的活動不列
    const key = `${title}\u0000${period}`;
    if (!groups.has(key)) {
      groups.set(key, { title, period, start, category: (cols[COL.category] || '').trim(), places: [] });
    }
    const place = [cols[COL.city], cols[COL.venue]].map((s) => (s || '').trim()).filter(Boolean).join(' ');
    const g = groups.get(key);
    if (place && !g.places.includes(place)) g.places.push(place);
  });
  const list = Array.from(groups.values())
    .sort((a, b) => a.start - b.start)
    .slice(0, SEO_LIST_MAX);
  if (!list.length) return '';
  const items = list.map((g) => {
    const meta = [g.category, g.period, g.places.join('、')].filter(Boolean).map(escapeHtml).join('｜');
    return `<li>${escapeHtml(g.title)}｜${meta}</li>`;
  }).join('');
  return `<section class="visually-hidden"><h2>進行中與即將開始的動漫活動</h2><ul>${items}</ul></section>`;
}

function buildOgTags(ogImageUrl) {
  return `
  <link rel="canonical" href="${SITE_URL}/events">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESCRIPTION}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${SITE_URL}/events">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="KADO！抽卡機在哪">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESCRIPTION}">
  <meta name="twitter:image" content="${ogImageUrl}">
</head>`;
}

module.exports = async function handler(req, res) {
  const eventId = req.query.event || '';
  const rows = await fetchEventRows();
  const ogImageUrl = getShareImageUrl(eventId, req.query, rows);

  const htmlPath = path.join(process.cwd(), 'events-app.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const GRID_OPEN = '<div class="events-collage-grid" id="eventsCollageGrid">';
  const finalHtml = html
    .replace('</head>', buildOgTags(ogImageUrl))
    .replace(GRID_OPEN, GRID_OPEN + buildSeoEventList(rows));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 跟 api/index.js 對 "/" 的規則一致：瀏覽器端每次都向 CDN 重新驗證（max-age=0），
  // 但 Vercel CDN 可快取 60 秒並在背景更新（stale-while-revalidate），省下每次回源的
  // function 冷啟動與抓 Google Sheet 的時間。CDN 快取鍵包含完整網址
  // （含 query string），所以各個 ?event=／?q=／?view= 的 OG 標籤不會互相污染。
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=60, stale-while-revalidate=600');
  res.status(200).send(finalHtml);
};
