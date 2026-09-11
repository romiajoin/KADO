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

// v41 新增：開始日排序用，取「～」前半段當開始日；行為/格式假設跟 getEndDate() 完全對稱
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

// 兩點距離（Haversine 公式，公里）：首頁距離排序／events.js 拼貼距離排序共用；台灣範圍不需要橢球模型

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
