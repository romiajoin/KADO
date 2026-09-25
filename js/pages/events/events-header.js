// events-header.js — events.html 專用，只抓「最後更新」時間戳，不 import main.js，理由見 CLAUDE.md「為什麼是獨立頁面、獨立一批模組」
// 比對機台分頁（R 欄）跟活動分頁（P 欄）兩個時間戳，取較新的那個顯示——轉換／比較邏輯
// （to24Hour／parseUpdateDate／buildLastUpdatedText）已搬到零依賴的 utils.js 共用，main.js
// 也是 import 同一份，不再各自複製一份；這裡仍各自獨立 fetch 兩份 CSV（延續專案既有
// 「各檔案自帶所需常數」的慣例，理由同上，不 import main.js）。

import { buildLastUpdatedText } from '../../shared/utils.js';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=0&single=true&output=csv';
const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

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

(async function loadLastUpdated() {
  try {
    // 活動分頁 fetch 失敗不該讓「最後更新」整個消失，獨立 catch 成 null，
    // 後面比較時當作「沒有活動分頁時間可比」處理，退回只顯示機台分頁那欄。
    const [res, eventsRes] = await Promise.all([
      fetch(SHEET_CSV_URL, { cache: 'no-store' }),
      fetch(EVENTS_SHEET_CSV_URL, { cache: 'no-store' }).catch(() => null),
    ]);
    const csvText = await res.text();
    const rows = csvText.trim().split('\n');
    const firstRow = parseCSVRow(rows[1] || '');
    const machineLastUpdatedRaw = firstRow[17] || ''; // R 欄

    let eventsLastUpdatedRaw = '';
    if (eventsRes && eventsRes.ok) {
      const eventsCsvText = await eventsRes.text();
      const eventsRows = eventsCsvText.trim().split('\n');
      const eventsFirstRow = parseCSVRow(eventsRows[1] || '');
      eventsLastUpdatedRaw = eventsFirstRow[15] || ''; // P 欄
    }

    const text = buildLastUpdatedText(machineLastUpdatedRaw, eventsLastUpdatedRaw);
    // #lastUpdated（桌機）／#eventsListLastUpdated（手機列表排列模式）同步更新
    ['lastUpdated', 'eventsListLastUpdated'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  } catch (err) {
    console.error('最後更新時間載入失敗：', err);
  }
})();
