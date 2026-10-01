// api/sheet.js
//
// Google Sheet 公開 CSV 的快取中繼（v36.2 新增）。
//
// 為什麼要有這支：前端原本每次載入都直接打 docs.google.com 的公開 CSV，速度完全取決於 Google
// 當下的回應時間（實測從 0.3 秒到 8 秒以上都有，還要多一次 307 轉址）。改成打自己網域的
// /api/sheet，讓 Vercel CDN 把結果快取起來：
//   - s-maxage=30：30 秒內所有人直接吃 CDN 快取，幾十毫秒回應
//   - stale-while-revalidate=300：快取過期後 5 分鐘內，先回舊的、背景重新向 Google 抓一份更新快取，
//     使用者不用等 Google。代價是資料最多晚約 30 秒～5 分鐘出現（機台資料是人工維護，可以接受）
// 前端（js/shared/utils.js 的 fetchSheetCsv()）打這支失敗時會自動退回直連 Google，所以這支掛掉不影響網站。
//
// 只開放白名單分頁（tab 參數），不接受任意網址，避免被當成開放式 proxy。

const SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub';

// 跟 js/core/main.js 的 SHEET_CSV_URL／EVENTS_SHEET_CSV_URL 的 gid 對應，兩邊各自獨立宣告
const TAB_GIDS = {
  machines: '0',
  events: '1540199365',
};

module.exports = async (req, res) => {
  const gid = TAB_GIDS[(req.query && req.query.tab) || ''];
  if (!gid) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(400).send('unknown tab');
    return;
  }

  try {
    const upstream = await fetch(`${SHEET_BASE_URL}?gid=${gid}&single=true&output=csv`, { redirect: 'follow' });
    if (!upstream.ok) throw new Error('upstream HTTP ' + upstream.status);
    const csv = await upstream.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    res.status(200).send(csv);
  } catch (err) {
    console.error('api/sheet 抓取失敗：', err);
    // 失敗的回應不能被快取，不然一次失敗會卡 30 秒
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).send('upstream error');
  }
};
