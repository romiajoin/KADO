// api/share.js
//
// 專門給社群平台的爬蟲（LINE / Threads / Discord）讀取這個網址時看到的內容。
// 這些爬蟲不會執行 JavaScript，只會讀 <head> 裡寫死的 og:title / og:image。
//
// 卡片內容固定：不管分享哪個機台，標題/描述/圖片都一樣，只有真人點進去
// 跳轉的目標網址（/?id=xxx）會依機台不同。

const SITE_URL = 'https://kadotw.vercel.app';
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/og.png`;
const TITLE = 'KADO！抽卡機在哪';
const DESCRIPTION = '全台抽卡機／相卡機資訊持續更新中！';

// 跟 js/main.js 的 SHEET_CSV_URL 是同一份，兩邊各自獨立宣告
// （一個是 ES Module 給前端用，一個是這支 CommonJS serverless function，無法互相 import）
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=0&single=true&output=csv';

// 欄位索引跟 js/main.js 的 parseCSVRow 之後的 cols 對照要保持一致：
// cols[0] id, ..., cols[13] image, cols[14] note, cols[15] 分享圖, cols[16] 最後更新時間
const SHARE_IMAGE_COL = 15;

// 跟 js/main.js 同一套解析規則（CommonJS 環境無法 import 那邊的 function，故重複一份）
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

// 依 id 到 Google Sheet CSV 裡找專屬分享圖網址；找不到、欄位空白、或抓取失敗都回傳預設圖，
// 任何失敗都不應該讓整個分享頁面掛掉。
async function getShareImageUrl(id) {
  if (!id) return DEFAULT_OG_IMAGE_URL;
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    for (let i = 1; i < rows.length; i++) {
      const cols = parseCSVRow(rows[i]);
      if (cols[0] === id) {
        const shareImage = (cols[SHARE_IMAGE_COL] || '').trim();
        return shareImage || DEFAULT_OG_IMAGE_URL;
      }
    }
    return DEFAULT_OG_IMAGE_URL;
  } catch (err) {
    return DEFAULT_OG_IMAGE_URL;
  }
}

module.exports = async function handler(req, res) {
  const id = req.query.id || '';
  // 只白名單允許 view=map，其餘值一律忽略（避免把任意 query 原封轉發，保守一點）
  const view = req.query.view === 'map' ? '&view=map' : '';
  const targetUrl = `${SITE_URL}/?id=${encodeURIComponent(id)}${view}`;
  const ogImageUrl = await getShareImageUrl(id);

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
