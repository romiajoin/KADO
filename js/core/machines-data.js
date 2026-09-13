// js/machines-data.js — 機台分頁共用資料層，給 events.js 顯示「相關機台」用（見 event-match.js）。
// main.js 的 loadFromSheet() 還要處理篩選/排序/分享連結/自動刷新一大串邏輯，這裡不重用那份，
// 只單純把機台分頁 CSV 轉成陣列；欄位對照沿用 main.js 現有的 cols 索引，改動時兩邊要一起改。
// 跟 events-data.js 是對稱的兩份資料層，寫法刻意一致。

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=0&single=true&output=csv';

// 跟 main.js／events-data.js 的 parseCSVRow 邏輯完全一樣，沒有 export 出來給外部用，
// 這裡本來就是各自獨立的小工具，重複一份比互相 import 私有函式乾淨。
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

export let allMachines = [];
export let machinesLoaded = false;

export async function loadMachines() {
  if (machinesLoaded) return allMachines;
  try {
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1);
    allMachines = rows.map((row) => {
      const cols = parseCSVRow(row);
      return {
        id: cols[0] || '',
        type: (cols[1] || '抽卡機').trim(),
        name: cols[2] || '',
        limited: cols[3] || '',
        venue: cols[4] || '',
        city: cols[5] || '',
        addr: cols[6] || '',
        lat: parseFloat(cols[7]),
        lng: parseFloat(cols[8]),
        character: cols[9] || '',
        edition: cols[10] || '',
        perDraw: cols[11] || '',
        image: cols[12] || '',
        note: cols[13] || '',
        hours: cols[14] || '',
        permId: cols[16] || '', // 永久ID（Q欄），連回機台頁分享連結用
      };
    }).filter((m) => m.name && !Number.isNaN(m.lat) && !Number.isNaN(m.lng));
    machinesLoaded = true;
  } catch (err) {
    console.error('機台資料載入失敗（相關機台用）：', err);
    allMachines = [];
  }
  return allMachines;
}
