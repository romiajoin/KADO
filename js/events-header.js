// events-header.js — events.html 專用，只抓「最後更新」時間戳，不 import main.js，理由見 CLAUDE.md「為什麼是獨立頁面、獨立一批模組」
// 比對機台分頁（R 欄）跟活動分頁（P 欄）兩個時間戳，取較新的那個顯示——跟 main.js 同一份邏輯，
// 因為這裡刻意不 import main.js（見上），重複一份是延續專案既有「各檔案自帶所需常數/邏輯」的慣例。

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

function to24Hour(raw) {
  const match = raw.match(/^(\d{4}\/\d{1,2}\/\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;
  const [, datePart, ampm, hStr, mStr] = match;
  let h = parseInt(hStr, 10);
  if (ampm === '下午' && h !== 12) h += 12;
  if (ampm === '上午' && h === 12) h = 0;
  return `${datePart} ${String(h).padStart(2, '0')}:${mStr}`;
}

// 同一格原始字串轉成可比較的 Date；格式跟預期不符就回傳 null，呼叫端 fallback 成只信任機台分頁那欄。
function parseUpdateDate(raw) {
  const match = (raw || '').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, yStr, mStr, dStr, ampm, hStr, minStr, sStr] = match;
  let h = parseInt(hStr, 10);
  if (ampm === '下午' && h !== 12) h += 12;
  if (ampm === '上午' && h === 12) h = 0;
  return new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), h, parseInt(minStr, 10), sStr ? parseInt(sStr, 10) : 0);
}

(async function loadLastUpdated() {
  try {
    // 活動分頁 fetch 失敗不該讓「最後更新」整個消失，獨立 catch 成 null，
    // 後面比較時當作「沒有活動分頁時間可比」處理，退回只顯示機台分頁那欄。
    const [res, eventsRes] = await Promise.all([
      fetch(SHEET_CSV_URL),
      fetch(EVENTS_SHEET_CSV_URL).catch(() => null),
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

    const machineDate = parseUpdateDate(machineLastUpdatedRaw);
    const eventsDate = parseUpdateDate(eventsLastUpdatedRaw);
    let lastUpdated = machineLastUpdatedRaw;
    if (machineDate && eventsDate) {
      if (eventsDate > machineDate) lastUpdated = eventsLastUpdatedRaw;
    } else if (!machineDate && eventsDate) {
      lastUpdated = eventsLastUpdatedRaw;
    }

    const text = lastUpdated ? '最後更新：' + to24Hour(lastUpdated) : '社群共建 · 持續更新';
    // #lastUpdated（桌機）／#eventsListLastUpdated（手機列表排列模式）同步更新
    ['lastUpdated', 'eventsListLastUpdated'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  } catch (err) {
    console.error('最後更新時間載入失敗：', err);
  }
})();
