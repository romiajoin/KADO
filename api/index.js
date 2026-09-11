// api/index.js
//
// 攔截首頁 `/` 的請求（見 vercel.json 的 rewrite），目的是讓直接分享
// `/?id=永久ID`、以及搜尋結果分享連結（`/?q=...`）這類網址時，
// Threads/LINE/Discord 等爬蟲也能看到 OG 預覽圖，不只是走 /api/share 那條路徑才有圖。
//
// 跟 api/share.js 不同：這支不是導轉頁，回傳的就是真正的 SPA 內容本身
// （原封不動的 app.html），只是動態把 og:title / og:image 等標籤塞進
// <head>。真人訪客看到的頁面內容完全不受影響，js/main.js 原本讀取
// window.location.search 裡 id/view/q 等參數的邏輯也不用改。
//
// ⚠️ SPA 殼層檔案刻意命名為 app.html、不叫 index.html：Vercel 的路由優先權是
// 「同路徑的靜態檔案 > vercel.json 的 rewrites」——如果專案根目錄真的有一個
// index.html，`/` 這個請求會直接被當成靜態檔案原樣回傳，vercel.json 裡
// `"/" -> "/api/index"` 的 rewrite 規則永遠不會被觸發（這支 function 形同虛設）。
// 這正是 v30.7 上線後，`/` 的 OG 標籤實際上從未生效過的根因（不管是 `/?id=`
// 還是 `/?q=` 分享連結，社群平台爬蟲抓到的都是完全沒有 og:image 的殼層）。
// 把 SPA 殼層改名成 app.html，讓 `/` 不再對應任何實體檔案，rewrite 才會真的接手。

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://kadotw.vercel.app';
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/og.png`; // a：grid 檢視（含搜尋結果）預設圖
const MAP_DEFAULT_OG_IMAGE_URL = `${SITE_URL}/map-og.png`; // b：map 檢視（含搜尋結果）預設圖
const TITLE = 'KADO！抽卡機在哪';
const DESCRIPTION = '抽卡機、相卡機、快閃店、展覽、聯名餐廳 / CAFÉ 、特典活動，持續更新中！';

// 跟 js/main.js / api/share.js 的 SHEET_CSV_URL 是同一份，三邊各自獨立宣告
// （CommonJS serverless function 跟前端 ES Module 沒辦法互相 import）
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=0&single=true&output=csv';

// 欄位索引跟 api/share.js 保持一致
const SHARE_IMAGE_COL = 15;
const PERMANENT_ID_COL = 16;

// P 欄可以用「,」或「、」分兩張圖：第一張給 grid 檢視、第二張給 map 檢視分享用。
// 一定要湊滿兩張才會分別套用；只填一張或完全空白，grid 用 a、map 用 b（跟 api/share.js
// 的 pickShareImage() 同一套規則，各自獨立宣告，環境不同無法共用）。
function pickShareImage(raw, isMapView) {
  const fallback = isMapView ? MAP_DEFAULT_OG_IMAGE_URL : DEFAULT_OG_IMAGE_URL;
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return fallback;
  return (isMapView ? parts[1] : parts[0]) || fallback;
}

// 跟 api/share.js / js/main.js 同一套解析規則（各自獨立一份，環境不同無法共用）
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

// 只在有帶 id 時才會真的打 Google Sheet（首頁絕大多數流量是沒帶 id 的一般訪客，
// 這樣才不會每次載入首頁都多打一次 Sheet API）。
// 找不到、欄位空白、或抓取失敗都回傳預設圖，任何失敗都不應該讓首頁整個掛掉。
async function getShareImageUrl(id, isMapView) {
  const fallback = isMapView ? MAP_DEFAULT_OG_IMAGE_URL : DEFAULT_OG_IMAGE_URL;
  if (!id) return fallback;
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      parsed.push(parseCSVRow(rows[i]));
    }
    // /?id= 只認永久ID（Q欄），跟 /api/share 現在的規則一致，不比對 A 欄流水號
    const match = parsed.find(cols => cols[PERMANENT_ID_COL] === id);
    if (match) {
      return pickShareImage(match[SHARE_IMAGE_COL], isMapView);
    }
    return fallback;
  } catch (err) {
    return fallback;
  }
}

function buildOgTags(ogImageUrl) {
  return `
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESCRIPTION}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${SITE_URL}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${TITLE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESCRIPTION}">
  <meta name="twitter:image" content="${ogImageUrl}">
</head>`;
}

module.exports = async function handler(req, res) {
  const id = req.query.id || '';
  const isMapView = req.query.view === 'map';
  const ogImageUrl = await getShareImageUrl(id, isMapView);

  const htmlPath = path.join(process.cwd(), 'app.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const finalHtml = html.replace('</head>', buildOgTags(ogImageUrl));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 跟原本 vercel.json 對 "/" 的規則一致：首頁殼層永遠不快取，避免 PWA/瀏覽器
  // 快取到舊版本（詳見 docs/spec.md 的 Service Worker 快取版本管理）。
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(finalHtml);
};
