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
// cols[0] id, cols[3] limited, ..., cols[12] image, cols[13] note, cols[14] hours,
// cols[15] 分享圖, cols[16] 永久ID（Q欄，Apps Script 自動產生，一旦存在絕不改動/重複使用）,
// cols[17] 最後更新時間
const SHARE_IMAGE_COL = 15;
const PERMANENT_ID_COL = 16;

// 分享連結的 id 現在只認「永久ID」（Q欄），不是 A 欄流水號——這樣即使管理者
// 事後重新整理 A 欄編號，舊的分享連結還是能對應到同一台機台，不會失效也不會顯示成別台。
//
// 過去這裡曾經有「找不到永久ID就 fallback 比對 A 欄流水號」的相容邏輯，是為了
// 支援上線前產生的舊格式分享連結。現在改成：只要不是永久ID比對成功，一律視為
// 無效連結（不管是舊格式的 A 欄 ID、A 欄編號後來被改掉、還是根本不存在的 id），
// 統一顯示預設圖、導回首頁，不再嘗試導去（可能對應到別台機器的）機台頁。

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

// 依 id 到 Google Sheet CSV 裡找永久ID對應的列。
// status:
//   'matched'     → 永久ID 比對成功，imageUrl 為該機台專屬分享圖（沒填就用預設圖）
//   'not-found'   → 表格抓取成功，但找不到任何永久ID等於 id 的列（A 欄舊格式 id、
//                    已下架、或根本不存在的 id，一律歸在這裡）
//   'fetch-error' → 表格抓取失敗（網路問題等），無法判斷 id 是否存在
//   'no-id'       → 沒有帶 id 參數
async function getShareInfo(id) {
  if (!id) return { status: 'no-id', imageUrl: DEFAULT_OG_IMAGE_URL };
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      parsed.push(parseCSVRow(rows[i]));
    }
    const match = parsed.find(cols => cols[PERMANENT_ID_COL] === id);
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
  // 只白名單允許 view=map，其餘值一律忽略（避免把任意 query 原封轉發，保守一點）
  const view = req.query.view === 'map' ? '&view=map' : '';

  const info = await getShareInfo(id);
  const ogImageUrl = info.imageUrl;

  // 只有「確定比對到永久ID」或「抓表失敗、不確定是否存在」時才導去機台頁
  // （fetch-error 保守處理成可能有效，讓前端重新抓資料自己判斷，避免把暫時性
  // 網路問題誤判成連結失效）；確定找不到（not-found）或根本沒帶 id，一律導回首頁。
  const targetUrl = (info.status === 'matched' || info.status === 'fetch-error')
    ? `${SITE_URL}/?id=${encodeURIComponent(id)}${view}`
    : `${SITE_URL}/`;

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
