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
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/event-og.png`; // c
const LIST_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-list-og.png`; // d
const CALENDAR_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-calendar-og.png`; // e
const DAY_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-day-og.png`; // f

const TITLE = 'KADO！抽卡機在哪｜活動情報';
const DESCRIPTION = '抽卡機、相卡機、快閃店、展覽、聯名餐廳 / CAFÉ 、特典活動，持續更新中！';

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

// 只在有帶 event 時才會真的打 Google Sheet（絕大多數流量是「搜尋結果」分享連結
// 或一般訪客，沒有帶 event，這樣才不會每次載入都多打一次 Sheet API）。
// 找不到、欄位空白、或抓取失敗都回傳「純預設狀態」該用的那張圖，任何失敗都不應該
// 讓頁面整個掛掉。
async function getShareImageUrl(id, query) {
  if (!id) return pickPageDefaultImage(query);
  try {
    const response = await fetch(EVENTS_SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      parsed.push(parseCSVRow(rows[i]));
    }
    // ?event= 只認永久ID（O欄），跟 /api/event-share 現在的規則一致，不比對 A 欄流水號
    const match = parsed.find((cols) => cols[PERMANENT_ID_COL] === id);
    if (match) {
      return pickShareImage(match[SHARE_IMAGE_COL], query.from || 'grid');
    }
    return pickPageDefaultImage(query);
  } catch (err) {
    return pickPageDefaultImage(query);
  }
}

function buildOgTags(ogImageUrl) {
  return `
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESCRIPTION}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${SITE_URL}/events.html">
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
  const ogImageUrl = await getShareImageUrl(eventId, req.query);

  const htmlPath = path.join(process.cwd(), 'events-app.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const finalHtml = html.replace('</head>', buildOgTags(ogImageUrl));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 跟 api/index.js 對 "/" 的規則一致：頁面殼層永遠不快取，避免瀏覽器快取到舊版本。
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(finalHtml);
};
