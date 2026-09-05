// events-data.js — 活動行事曆共用資料層，被 events.js import

const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

// 分頁欄位順序，見 README.md「活動行事曆分頁」；用欄位順序而非表頭文字對應，避免表頭調整打斷解析
const COL = {
  id: 0, category: 1, title: 2, period: 3,
  venue: 4, city: 5, addr: 6, lat: 7, lng: 8,
  character: 9, image: 10, note: 11, hours: 12,
  // N（分享圖）目前前端不需要解析，api/event-share.js 另外直接讀 CSV 那一份；
  // O 欄是永久ID，比照機台 Q 欄機制，分享連結/機台↔活動跨頁連結真正比對的依據
  permId: 14,
};

// ⚠️ label 同時是顯示文字也是跟 Google Sheet B 欄比對的依據，改了要連同 Google 表單下拉選單一起改，詳見 README.md「活動行事曆分頁」
// POP-UP／CAFÉ・餐廳原本是 #EA580C／#16A34A，跟機台的 type-badge 撞色
// （抽卡機 --fill-orange #EA580C、相卡機 --fill-green #16A34A，見 style.css）——
// events.html 卡片加了「有抽卡機/相卡機」徽章後兩者會同一排出現，才改掉這兩個分類的顏色，其餘不動。
export const EVENT_CATEGORIES = [
  { key: 'flash',   label: 'POP-UP',      color: '#2BADB9' },
  { key: 'expo',    label: '展覽',        color: '#0066FF' },
  { key: 'other',   label: '其他',        color: '#1B813D' },
  { key: 'cafe',    label: 'CAFÉ / 餐廳', color: '#BE185D' },
  { key: 'tokuten', label: '特典活動',      color: '#7C3AED' },
];

export let allEvents = [];
export let eventsLoaded = false;

// 跟 main.js 的 parseCSVRow 邏輯完全一樣（處理欄位內含逗號的引號情況），
// 沒有 export 出來給外部用，這裡本來就是各自獨立的小工具，重複一份比互相 import 私有函式乾淨。
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

function parseDateSlash(str) {
  if (!str) return null;
  const [y, m, d] = str.split('/').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function parsePeriod(period) {
  const [startStr, endStr] = String(period || '').split('～').map((s) => s.trim());
  const start = parseDateSlash(startStr);
  const end = parseDateSlash(endStr) || start;
  return { start, end };
}

export async function loadEvents() {
  if (eventsLoaded) return allEvents;
  try {
    const res = await fetch(EVENTS_SHEET_CSV_URL);
    const text = await res.text();
    const rows = text.split('\n').slice(1).filter((r) => r.trim());
    allEvents = rows.map((row) => {
      const cols = parseCSVRow(row);
      const period = cols[COL.period] || '';
      const { start, end } = parsePeriod(period);
      return {
        id: cols[COL.id],
        title: cols[COL.title],
        category: cols[COL.category],
        character: cols[COL.character],
        period,
        start,
        end,
        venue: cols[COL.venue],
        city: cols[COL.city],
        addr: cols[COL.addr],
        lat: parseFloat(cols[COL.lat]),
        lng: parseFloat(cols[COL.lng]),
        // K 欄可能是逗號分隔多張圖，轉換/拆分留給實際用圖片的地方（eventThumbUrl()／eventImages()）處理
        image: cols[COL.image] || '',
        note: cols[COL.note],
        hours: cols[COL.hours],
        // 永久ID：一旦產生絕不能改，分享連結（shareEvent）跟機台端「期間活動」標題連結
        // （event-match.js 的 eventUrl()）都靠這個欄位比對，不是 A 欄流水號
        permId: cols[COL.permId] || '',
      };
    }).filter((ev) => ev.id && ev.start);
    eventsLoaded = true;
  } catch (err) {
    console.error('活動資料載入失敗：', err);
    allEvents = [];
  }
  return allEvents;
}