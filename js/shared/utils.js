// 零依賴共用工具：裝置判斷／縣市清單／倒數 badge／圖片網址轉換／距離計算。
// 搬到這裡是為了讓 events.js 也能直接 import，不用拖進 main.js/filters.js/grid.js
// 那條鏈（那些模組的初始化預期 app.html 才有的 DOM），詳見 CLAUDE.md「共用工具搬遷到 utils.js」
export const TW_CITY_ORDER = [
  '臺北市', '新北市', '基隆市', '桃園市',
  '新竹市', '臺中市', '嘉義市', '臺南市',
  '高雄市', '新竹縣', '宜蘭縣', '苗栗縣',
  '彰化縣', '雲林縣', '南投縣', '嘉義縣',
  '屏東縣', '花蓮縣', '臺東縣', '澎湖縣',
  '金門縣', '連江縣',
];

export function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// GA 用的裝置判斷：用輸入裝置類型（觸控 vs 滑鼠），不受視窗寬度縮放影響，
// 跟排版用的 isMobileFilterLayout() 分開（那個留在 main.js，跟篩選 UI 邏輯放一起）。
export function getDeviceType() {
  const base = window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  return isStandaloneMode() ? `${base}_pwa` : base;
}

// 期限倒數 badge：locations 的 limited／events 的 period 共用同一套格式判斷

const URGENT_DAYS = 3; // 幾天內才顯示 badge，之後要調就改這裡

export function getEndDate(limited) {
  if (!limited) return null; // null 代表無期限（常態機）
  const p = limited.split('～');
  return new Date(p[p.length - 1].trim().replace(/\//g, '-'));
}

// v35.1 新增：開始日排序用，取「～」前半段當開始日；行為/格式假設跟 getEndDate() 完全對稱
export function getStartDate(limited) {
  if (!limited) return null; // null 代表無期限（常態機）
  const p = limited.split('～');
  return new Date(p[0].trim().replace(/\//g, '-'));
}

export function getEndingBadge(limited) {
  const end = getEndDate(limited);
  if (!end) return null;                       // 常態機、無結束日 → 不顯示
  const now = new Date();
  const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const nowD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((endD - nowD) / 86400000); // 只比日期，不看時分
  if (diffDays < 0) return null;               // 已結束
  if (diffDays >= URGENT_DAYS) return null;     // 超過 3 天不顯示
  const remaining = diffDays + 1;              // 今天結束 = 剩 1 天
  return remaining === 1 ? '最後一天' : `倒數 ${remaining} 天`;
}

// 抽卡機／相卡機 type-badge：圖示 SVG 跟顏色 class 判斷，grid.js／main.js／map.js／events.js
// 都要用到同一組「抽卡機／相卡機」徽章圖示，原本各檔案各自複製一份逐字元相同的 inline SVG
// 字串（至少 5-6 處），改用這裡共用一份，以後要換圖示/調整只要改一個地方。
// 這裡只共用「圖示」跟「顏色 class」這兩個最容易對不齊的部分，外層要包 div 還是 span、
// 要不要顯示文字標籤，各呼叫端情境不同（例如緊湊版徽章只顯示圖示不顯示文字），維持各自組裝。
// 圖示來源（Material Symbols，FILL1）：
// '相卡機' -> photo_camera_16dp_000000_FILL1_wght400_GRAD0_opsz20.svg
// '抽卡機' -> playing_cards_16dp_000000_FILL1_wght400_GRAD0_opsz20.svg
// （原始 fill="#000000" 已比照專案 Icon 系統慣例改成 fill="currentColor"）
export const MACHINE_TYPE_BADGE_ICON = {
  '相卡機': '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-264q72 0 120-49t48-119q0-69-48-118.5T480-600q-72 0-120 49.5T312-432q0 70 48 119t120 49Zm0-72q-42 0-69-27t-27-68q0-40 27-68.5t69-28.5q42 0 69 28.5t27 68.5q0 41-27 68t-69 27ZM168-144q-29 0-50.5-21.5T96-216v-432q0-29 21.5-50.5T168-720h120l50-67q11-14 26-21.5t32-7.5h168q17 0 32 7.5t26 21.5l50 67h120q30 0 51 21.5t21 50.5v432q0 29-21 50.5T792-144H168Z"/></svg>',
  '抽卡機': '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m612-404 31-107q3-11-1-22t-14-18l-93-63q-8-5-16.5-2T508-604l-31 107q-3 11 .5 22t13.5 18l93 63q8 5 17 2t11-12ZM168-222l-30-15q-28-13-38-40t3-55l65-140v250Zm148 78q-31 0-53.5-20.5T240-216v-288l134 360h-58Zm206-4q-31 11-56-1t-36-43L259-660q-11-31 .5-56.5T302-753l294-107q31-11 56 .5t36 42.5l172 472q11 31-.5 56T817-253L522-148Z"/></svg>',
};

export function machineTypeClass(type) {
  return type === '相卡機' ? 'photocard' : 'gacha';
}

// 卡片「詳情」展開按鈕圖示：grid.js（首頁列表卡片）／events.js（拼貼列表卡片）原本
// 各自複製一份逐字元相同的 inline SVG 字串，改共用這裡一份。
// 圖示來源：expand_content_20dp_000000_FILL1_wght400_GRAD0_opsz20.svg
// （原始 fill="#000000" 已比照專案 Icon 系統慣例改成 fill="currentColor"，尺寸縮小為 16px）
export const BTN_EXPAND_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M312-312h132q15.3 0 25.65 10.29Q480-291.42 480-276.21t-10.35 25.71Q459.3-240 444-240H276q-15.3 0-25.65-10.35Q240-260.7 240-276v-168q0-15.3 10.29-25.65Q260.58-480 275.79-480t25.71 10.35Q312-459.3 312-444v132Zm336-336H516q-15.3 0-25.65-10.29Q480-668.58 480-683.79t10.35-25.71Q500.7-720 516-720h168q15.3 0 25.65 10.35Q720-699.3 720-684v168q0 15.3-10.29 25.65Q699.42-480 684.21-480t-25.71-10.35Q648-500.7 648-516v-132Z"/></svg>';

// 分享按鈕圖示：main.js（機台 grid modal）／map.js（地圖詳情面板）／events.js（活動詳情 Modal）
// 原本各自複製一份逐字元相同的 inline SVG 字串，改共用這裡一份。
// 圖示來源：share_20dp_000000_FILL0_wght400_GRAD0_opsz20.svg
// （原始 fill="#000000" 已比照專案 Icon 系統慣例改成 fill="currentColor"，尺寸縮小為 16px）
export const SHARE_BTN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-14 13.8-14 13.8-34t-13.8-34q-13.8-14-34.2-14-20.4 0-34.2 14-13.8 14-13.8 34t13.8 34q13.8 14 34.2 14Zm466-277.8q14-13.8 14-34.2 0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 14 34.2 14 13.8 34 13.8t34-13.8ZM648-216ZM216-480Zm432-264Z"/></svg>';

// 輪播圖 prev/next 按鈕圖示：main.js／map.js／grid.js／events.js 四處共用同一顆
// chevron_backward icon，next 方向不另外準備反向 icon，靠 CSS scaleX(-1) 鏡射
// （比照「相關機台」卡片列箭頭按鈕同一套慣例，只是那邊反過來是用 forward 鏡射出 prev）。
// 圖示來源：chevron_backward_20dp_000000_FILL0_wght400_GRAD0_opsz20.svg
// （原始 fill="#000000" 已比照專案 Icon 系統慣例改成 fill="currentColor"，尺寸縮小為 14px）
export const CAROUSEL_CHEVRON_ICON_SVG = '<svg class="carousel-chevron" xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="m438-480 164 164q11 11 11 25.5T602-265q-11 11-25.5 11T551-265L361-455q-5-5-7.5-11.5T351-480q0-7 2.5-13.5T361-505l190-190q11-11 25.5-11t25.5 11q11 11 11 25.5T602-644L438-480Z"/></svg>';

// 關閉按鈕圖示：map.js（地圖詳情面板／cluster popup 關閉鈕）共用這一份；
// 其餘關閉鈕（.grid-modal-close／.filter-sheet-close／.changelog-close／
// .day-events-close）是寫死在 app.html／events-app.html 裡的靜態標記，
// 沒辦法 import JS 常數，改成把同一段 path 字串直接貼進 HTML（比照
// .events-nav-group 月曆導航按鈕的既有慣例）。全站關閉鈕統一改用這顆
// Material Symbols close icon，取代原本各自不一致的 unicode "✕" 字元跟
// 另一款 stroke 風格的 X SVG（24x24 viewBox，兩條 path 畫出叉叉）。
// 圖示來源：close_20dp_000000_FILL1_wght400_GRAD0_opsz20.svg
// （原始 fill="#000000" 已比照專案 Icon 系統慣例改成 fill="currentColor"）
export const CLOSE_BTN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-429 316-265q-11 11-25 10.5T266-266q-11-11-11-25.5t11-25.5l163-163-164-164q-11-11-10.5-25.5T266-695q11-11 25.5-11t25.5 11l163 164 164-164q11-11 25.5-11t25.5 11q11 11 11 25.5T695-644L531-480l164 164q11 11 11 25t-11 25q-11 11-25.5 11T644-266L480-429Z"/></svg>';

// 圖片網址轉換：locations／events 兩份資料都會用到

export function driveUrlToImage(url) {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/w_800,q_auto,f_auto/');
  }
  return url;
}

// 「最後更新」時間戳處理：main.js（機台頁）／events-header.js（活動頁）都要拿機台分頁 R 欄
// 跟活動分頁 P 欄兩個原始字串比較哪個較新、組出顯示文字，原本兩邊各自複製一份完全一樣的
// 邏輯，這裡搬過來共用一份，理由跟上面其他工具函式一致：純字串/日期運算、不摸 DOM，
// 適合放進 utils.js，不受「events.js 不能 import main.js 那條鏈」的限制。詳見 CLAUDE.md
// 「最後更新元素」v32.1 條目。

// Google Sheet 儲存格原始格式是 12 小時制（例如「2026/7/14 下午8:33:00」），轉成 24 小時制
// 顯示，順便拿掉秒數。格式跟預期不符（例如 Sheet 那格被手動改成別的格式）就直接回傳原字串，
// 不讓整個「最後更新」消失。
export function to24Hour(raw) {
  const match = raw.match(/^(\d{4}\/\d{1,2}\/\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;
  const [, datePart, ampm, hStr, mStr] = match;
  let h = parseInt(hStr, 10);
  if (ampm === '下午' && h !== 12) h += 12;
  if (ampm === '上午' && h === 12) h = 0;
  return `${datePart} ${String(h).padStart(2, '0')}:${mStr}`;
}

// 同一格原始字串轉成可比較的 Date，供「機台分頁 R 欄」跟「活動分頁 P 欄」兩個最後更新時間比大小用；
// 格式跟預期不符就回傳 null，呼叫端會 fallback 成只信任機台分頁那欄。
export function parseUpdateDate(raw) {
  const match = (raw || '').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, yStr, mStr, dStr, ampm, hStr, minStr, sStr] = match;
  let h = parseInt(hStr, 10);
  if (ampm === '下午' && h !== 12) h += 12;
  if (ampm === '上午' && h === 12) h = 0;
  return new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), h, parseInt(minStr, 10), sStr ? parseInt(sStr, 10) : 0);
}

// 比較機台分頁／活動分頁兩欄原始字串，回傳格式化好的「最後更新」顯示文字。
// eventsRaw 可為空字串（活動分頁 fetch 失敗或抓不到值時），視為「沒有活動分頁時間可比」，
// 安全退回只信任機台分頁那欄——跟兩邊改動前各自的行為一致。
export function buildLastUpdatedText(machineRaw, eventsRaw) {
  const machineDate = parseUpdateDate(machineRaw);
  const eventsDate = parseUpdateDate(eventsRaw);
  let lastUpdated = machineRaw;
  if (machineDate && eventsDate) {
    if (eventsDate > machineDate) lastUpdated = eventsRaw;
  } else if (!machineDate && eventsDate) {
    lastUpdated = eventsRaw;
  }
  return lastUpdated ? '最後更新：' + to24Hour(lastUpdated) : '社群共建 · 持續更新';
}

// Lightbox（圖片放大)核心開關邏輯：main.js（機台頁）／events.js（活動頁）原本各自
// 複製一份幾乎一樣的「設定 img src、toggle overlay 的 show class」邏輯，搬來這裡共用。
// 只抽出純 DOM 開關這一段，呼叫端（GA 事件、window 掛載給 inline onclick 用等）刻意留在
// 各自檔案裡，因為那些跟兩頁不同的綁定慣例綁在一起，不適合一起搬，見 CLAUDE.md「Lightbox」。
export function createLightbox(overlayId, imgId) {
  const overlay = document.getElementById(overlayId);
  const img = document.getElementById(imgId);
  function open(src) {
    img.src = src;
    overlay.classList.add('show');
  }
  function close() {
    overlay.classList.remove('show');
  }
  return { open, close };
}

// 兩點距離（Haversine 公式，公里）：首頁距離排序／events.js 拼貼距離排序共用；台灣範圍不需要橢球模型

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =============================================
// 📣 機台狀態回報（「這台還在／不在了」按鈕，grid modal／地圖詳情面板共用）
// 一鍵送出、刻意不做表單——痛點是「懶得填表單」，多一步都會流失。
// 本機用 localStorage 記「這台機台最近回報過」防止同一瀏覽器短時間內重複回報；
// 資料實際寫進 Cloudflare Worker 的 KV（跟 visitor-counter 共用同一支 worker，見
// scripts/worker.js 的 /report 路徑），Worker 收到後同步發 Discord 通知。
// 回報清單暫時不做管理頁面／寫進 Sheet，先看 Discord 通知就好，量大了再評估要不要升級。
// =============================================
export const MACHINE_REPORT_API_URL = 'https://visitor-counter.gillsponge-601.workers.dev/report';
export const MACHINE_REPORT_DEDUPE_DAYS = 3; // 同一瀏覽器對同一台機台，這幾天內只能回報一次（不分「還在」／「不在了」）
// 跟 app.html 首頁／活動頁 .report-link 同一份回報表單網址，各自獨立宣告（app.html 是 inline href，
// 這裡是動態產生的 HTML 字串，沒有共用的地方可以 import，故意重複一份，改的話兩邊要一起改）
const MACHINE_REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSefuFSIqJ3qbJ245-snAD5MR6xHYHhkzzGGtpNXBvUVyZoZWQ/viewform?usp=dialog';

function machineReportStorageKey(machineId) {
  return `machineReport:${machineId}`;
}

// 讀本機「這台機台最近有沒有回報過」的狀態；超過防重複窗口就當作沒有（順便清掉過期紀錄）。
// localStorage 不可用時（無痕模式等）一律當作沒回報過，不因此擋住按鈕。
export function getMachineReportState(machineId) {
  try {
    const raw = localStorage.getItem(machineReportStorageKey(machineId));
    if (!raw) return null;
    const state = JSON.parse(raw);
    const ageMs = Date.now() - state.at;
    if (ageMs > MACHINE_REPORT_DEDUPE_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(machineReportStorageKey(machineId));
      return null;
    }
    return state; // { type: 'gone' | 'still', at: timestamp }
  } catch (e) {
    return null;
  }
}

function setMachineReportState(machineId, type) {
  try {
    localStorage.setItem(machineReportStorageKey(machineId), JSON.stringify({ type, at: Date.now() }));
  } catch (e) {
    // 存不進去就算了，不影響這次回報本身有沒有送出
  }
}

// 已回報過的狀態文字：main.js 的委派 click handler 收到回報後，也用這個把按鈕組換成同樣的文字。
// 固定附上「回報表單」連結——一鍵回報只能傳「還在／不在」這個二元訊號，使用者如果有更詳細的
// 資訊想講（例如機台位置搬了、營業時間變了），這裡順手給個管道，不用另外去首頁找連結。
export function machineReportedText(type) {
  const base = type === 'gone' ? '已回報「不在了」，謝謝提醒！' : '已回報「還在」，謝謝確認！';
  return `${base}如有更多資訊，歡迎填<a href="${MACHINE_REPORT_FORM_URL}" target="_blank" rel="noopener" class="popup-report-link" data-report-form-link data-source="machine_report_confirmation">回報表單</a>`;
}

// 判斷「系列」欄位（loc.edition）是不是只填了單一個值——多值分隔符比照 scripts/worker.js
// pickShareImage() 既有的「,」／「、」慣例（P 欄分享圖用同一套分隔規則）。只有單一系列的機台
// 才顯示回報按鈕：Gill 判斷「掛多個系列／沒填系列」的機台歸屬不夠明確，回報時容易搞不清楚
// 「不在了」指的是整台機器還是其中一個系列的活動已經結束，先只開放在單一系列的機台上。
function hasSingleEdition(loc) {
  const parts = (loc.edition || '').split(/[,、]/).map(s => s.trim()).filter(Boolean);
  return parts.length <= 1; // 沒填（0 個）視為單一／不限定，一樣顯示；只有填了 2 個以上才隱藏
}

// grid modal（main.js openGridModal()）／地圖詳情面板（map.js buildDetailContentHtml()）共用：
// 回傳 .popup-actions 下方那排回報按鈕的 HTML。系列欄位填了 2 個以上（多系列聯名）才完全不顯示
// （見上方 hasSingleEdition() 註解，沒填欄位一樣顯示）；已經在防重複窗口內回報過的話，顯示已回報
// 文字，不重複顯示按鈕（避免看起來像可以一直點）。
export function machineReportButtonsHtml(loc, source) {
  if (!hasSingleEdition(loc)) return '';
  const existing = getMachineReportState(loc.id);
  if (existing) {
    return `<div class="popup-report-group popup-report-done">${machineReportedText(existing.type)}</div>`;
  }
  // permId／venue／type 一起帶在按鈕的 data-* 上，回報時原封不動送給 Worker，讓 Discord 通知能
  // 附上機台類型、場地、還有指回這台機台的永久連結（見 submitMachineReport() 註解）。
  return `
    <div class="popup-report-group" data-report-group>
      <button type="button" class="popup-report-btn popup-report-btn-still" data-machine-report data-report-type="still" data-machine-id="${loc.id}" data-machine-name="${loc.name}" data-source="${source}" data-perm-id="${loc.permId || ''}" data-venue="${loc.venue || ''}" data-machine-type="${loc.type || ''}">✓ 機台還在</button>
      <button type="button" class="popup-report-btn popup-report-btn-gone" data-machine-report data-report-type="gone" data-machine-id="${loc.id}" data-machine-name="${loc.name}" data-source="${source}" data-perm-id="${loc.permId || ''}" data-venue="${loc.venue || ''}" data-machine-type="${loc.type || ''}">✕ 機台不在了</button>
    </div>`;
}

// 實際送出：本機立刻標記已回報（樂觀更新，呼叫端不等這支 promise 就能馬上換按鈕文字），
// 背景打 Worker、失敗也不用管使用者——這本來就是「順手回報」的低風險小功能，
// 不值得為了失敗重試/告知使用者增加複雜度，Worker 那邊沒收到，之後使用者路過還會再報一次。
// extra（permId／venue／machineType）是選填的補充資訊，讓 Worker 發的 Discord 通知可以更詳細
// （附機台類型、場地、指回這台機台的永久連結），缺其中任何一項也不影響回報本身送出。
export function submitMachineReport(machineId, machineName, type, source, extra = {}) {
  setMachineReportState(machineId, type);
  fetch(MACHINE_REPORT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machineId, machineName, type, source,
      permId: extra.permId || '', venue: extra.venue || '', machineType: extra.machineType || '',
    }),
  }).catch(() => {});
}
