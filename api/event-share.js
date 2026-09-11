// api/event-share.js
//
// 專門給社群平台的爬蟲（LINE / Threads / Discord）讀取活動分享連結時看到的內容。
// 這些爬蟲不會執行 JavaScript，只會讀 <head> 裡寫死的 og:title / og:image。
//
// 是 api/share.js（機台分享）的活動版對照組：活動地點現在也有 O 欄永久ID
// （比照機台 Q 欄機制，見「分享連結永久ID機制（活動版）」），這裡跟機台 api/share.js
// 現行做法一樣只認永久ID、不保留 A 欄流水號 fallback——A 欄被管理者重新編號後，
// 分享圖不該抓到別的活動。
//
// 分享圖分兩層：
//   1. 「這個活動有沒有專屬分享圖」——N 欄用「,」或「、」分四張圖，依分享按鈕是從
//      哪裡點開的（grid／list／bar／card，見下方 pickShareImage()）分別對應一張；
//      沒湊滿四張就退回該情境的預設圖。
//   2. 「這個情境的預設圖」——c／d／e／f 四張，見 pickShareImage() 的說明。

const SITE_URL = 'https://kadotw.vercel.app';

// 跟 api/events.js 的四張預設圖是同一份，各自獨立宣告：
//   c＝總覽·拼貼格（也是不認得 from 值時的最終 fallback）　d＝總覽·列表
//   e＝月曆（events-bar）　f＝day-events-panel（events-card）
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/event-og.png`; // c
const LIST_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-list-og.png`; // d
const CALENDAR_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-calendar-og.png`; // e
const DAY_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/events-day-og.png`; // f

const TITLE = 'KADO！抽卡機在哪｜活動情報';
const DESCRIPTION = '抽卡機、相卡機、快閃店、展覽、聯名餐廳 / CAFÉ 、特典活動，持續更新中！';

// 跟 js/events-data.js 的 EVENTS_SHEET_CSV_URL 是同一份，兩邊各自獨立宣告
// （一個是 ES Module 給前端用，一個是這支 CommonJS serverless function，無法互相 import）
const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

// 欄位索引跟 js/events-data.js 的 COL 對照要保持一致：
// cols[0] id, cols[1] 類型, cols[2] 活動標題, cols[3] 期間限定, ..., cols[10] 圖片,
// cols[11] 更多資訊連結, cols[12] 營業時間, cols[13] 分享圖（N欄，選填，格式見下方
// pickShareImage()），cols[14] 永久ID（O欄，Apps Script 自動產生，一旦存在絕不改動/重複使用）
const SHARE_IMAGE_COL = 13;
const PERMANENT_ID_COL = 14;

// 跟 js/events-data.js 同一套解析規則（CommonJS 環境無法 import 那邊的 function，故重複一份）
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

// N 欄用「,」或「、」分四張圖，依分享按鈕是從哪個入口點開的（見 js/events.js 的
// shareEvent()）分別對應：
//   grid＝總覽·拼貼格卡片　list＝總覽·列表卡片
//   bar＝月曆的 events-bar　card＝月曆 day-events-panel 裡的 events-card
// 一定要湊滿四張才會分別套用；沒湊滿四張（完全空白、或只填了一兩三張）都視為
// 「這個情境沒有專屬圖」，直接退回對應情境的預設圖，不會誤把其中一張套到別的情境。
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

// 依 id 到活動分頁 CSV 裡找永久ID對應的列。
// status:
//   'matched'     → 永久ID 比對成功，imageUrl 依 from 挑對應的圖（沒湊滿四張就用該情境預設圖）
//   'not-found'   → 表格抓取成功，但找不到任何永久ID等於 id 的列（A 欄舊格式 id、
//                    已下架、或根本不存在的 id，一律歸在這裡）
//   'fetch-error' → 表格抓取失敗（網路問題等），無法判斷 id 是否存在
//   'no-id'       → 沒有帶 id 參數
async function getShareInfo(id, from) {
  const fallback = SHARE_IMAGE_FALLBACK_BY_FROM[from] || DEFAULT_OG_IMAGE_URL;
  if (!id) return { status: 'no-id', imageUrl: fallback };
  try {
    const response = await fetch(EVENTS_SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      parsed.push(parseCSVRow(rows[i]));
    }
    const match = parsed.find((cols) => cols[PERMANENT_ID_COL] === id);
    if (match) {
      return { status: 'matched', imageUrl: pickShareImage(match[SHARE_IMAGE_COL], from) };
    }
    return { status: 'not-found', imageUrl: fallback };
  } catch (err) {
    return { status: 'fetch-error', imageUrl: fallback };
  }
}

// 分享出去的背景版面（真人點進來後看到的畫面）：
//   grid → 不用額外參數，總覽·拼貼格本來就是預設值
//   list → &layout=list（總覽切成列表版面）
//   bar／card → &view=calendar（切回月曆）
// 這兩個參數是 js/events.js 既有的「搜尋結果分享連結」網址同步機制在用的，這裡沿用
// 同一套，落地後 initEventsPage() 的還原邏輯會自動處理，不用再另外寫一套。
function backgroundParamsFor(from) {
  if (from === 'list') return '&layout=list';
  if (from === 'bar' || from === 'card') return '&view=calendar';
  return '';
}

module.exports = async function handler(req, res) {
  const id = req.query.id || '';
  // 只白名單允許這四個值，其餘一律當成 grid（避免把任意 query 原封轉發，保守一點）
  const allowedFrom = ['grid', 'list', 'bar', 'card'];
  const from = allowedFrom.includes(req.query.from) ? req.query.from : 'grid';

  const info = await getShareInfo(id, from);
  const ogImageUrl = info.imageUrl;

  // 只有「確定比對到永久ID」或「抓表失敗、不確定是否存在」時才帶 id 導去活動頁
  // （fetch-error 保守處理成可能有效，讓前端重新抓資料自己判斷，避免把暫時性
  // 網路問題誤判成連結失效）；確定找不到（not-found）或根本沒帶 id，導回行事曆首頁。
  const targetUrl = (info.status === 'matched' || info.status === 'fetch-error')
    ? `${SITE_URL}/events.html?event=${encodeURIComponent(id)}${backgroundParamsFor(from)}`
    : `${SITE_URL}/events.html`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(`<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:image" content="${ogImageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${targetUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="KADO！抽卡機在哪">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${ogImageUrl}">
<script>location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
<p>正在前往 <a href="${targetUrl}">${TITLE}</a>...</p>
</body>
</html>`);
};
