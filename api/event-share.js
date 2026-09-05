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
// 分享圖分兩種：預設圖（找不到、沒填、抓取失敗都 fallback 這張）跟指定圖
// （活動分頁 N 欄「分享圖」，Cloudinary 網址，選填）。

const SITE_URL = 'https://kadotw.vercel.app';
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/event-og.png`;
const TITLE = 'KADO！抽卡機在哪｜活動情報';
const DESCRIPTION = '抽卡機、相卡機、快閃店、展覽、聯名餐廳 / CAFÉ 、特典活動，持續更新中！';

// 跟 js/events-data.js 的 EVENTS_SHEET_CSV_URL 是同一份，兩邊各自獨立宣告
// （一個是 ES Module 給前端用，一個是這支 CommonJS serverless function，無法互相 import）
const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

// 欄位索引跟 js/events-data.js 的 COL 對照要保持一致：
// cols[0] id, cols[1] 類型, cols[2] 活動標題, cols[3] 期間限定, ..., cols[10] 圖片,
// cols[11] 更多資訊連結, cols[12] 營業時間, cols[13] 分享圖（N欄，選填），
// cols[14] 永久ID（O欄，Apps Script 自動產生，一旦存在絕不改動/重複使用）
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

// 依 id 到活動分頁 CSV 裡找永久ID對應的列。
// status:
//   'matched'     → 永久ID 比對成功，imageUrl 為該活動指定的分享圖（沒填就用預設圖）
//   'not-found'   → 表格抓取成功，但找不到任何永久ID等於 id 的列（A 欄舊格式 id、
//                    已下架、或根本不存在的 id，一律歸在這裡）
//   'fetch-error' → 表格抓取失敗（網路問題等），無法判斷 id 是否存在
//   'no-id'       → 沒有帶 id 參數
async function getShareInfo(id) {
  if (!id) return { status: 'no-id', imageUrl: DEFAULT_OG_IMAGE_URL };
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
      const shareImage = (match[SHARE_IMAGE_COL] || '').trim();
      return { status: 'matched', imageUrl: shareImage || DEFAULT_OG_IMAGE_URL };
    }
    return { status: 'not-found', imageUrl: DEFAULT_OG_IMAGE_URL };
  } catch (err) {
    return { status: 'fetch-error', imageUrl: DEFAULT_OG_IMAGE_URL };
  }
}

module.exports = async function handler(req, res) {
  const id = req.query.id || '';

  const info = await getShareInfo(id);
  const ogImageUrl = info.imageUrl;

  // 只有「確定比對到永久ID」或「抓表失敗、不確定是否存在」時才帶 id 導去活動頁
  // （fetch-error 保守處理成可能有效，讓前端重新抓資料自己判斷，避免把暫時性
  // 網路問題誤判成連結失效）；確定找不到（not-found）或根本沒帶 id，導回行事曆首頁。
  const targetUrl = (info.status === 'matched' || info.status === 'fetch-error')
    ? `${SITE_URL}/events.html?event=${encodeURIComponent(id)}`
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
