// =============================================
// scroll.js — mobile 列表模式：往下滑隱藏 #topBar（header + toolbar + filter-bar），
// 往上滑（哪怕滑一點點）立刻出現。
//
// 只在「mobile breakpoint + 列表模式（body 沒有 .map-view）」生效；
// 地圖模式底下完全不動 #topBar，避免影響 map.js 依 filter-bar 位置算出來的
// bottom sheet 高度。
// =============================================

const MOBILE_BREAKPOINT = 991;
const HIDE_THRESHOLD = 8;   // 累積往下滑動超過這個值才隱藏，避免手抖誤觸
const TOP_SAFE_ZONE = 24;   // 捲動位置在最頂端這個範圍內一律保持顯示，避免抵達頂部時抖動

let topBar = null;
let gridView = null;
let lastScrollTop = 0;
let downAccum = 0;

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function isListMode() {
  return !document.body.classList.contains('map-view');
}

function showBar() {
  if (topBar) topBar.classList.remove('bar-hidden');
}

function hideBar() {
  if (topBar) topBar.classList.add('bar-hidden');
}

// 量測 #topBar 實際高度，寫進 CSS variable 給 #gridView 當 padding-top 用，
// 避免列表內容一開始被固定定位的 top bar 蓋住。只有 mobile + 列表模式才需要這個空間。
// 訪客 banner 已改為一開始就用 visibility:hidden 保留固定高度（見 app.html/visitor.js），
// 不再有「內容非同步出現、高度中途變動」的情況，所以不用 ResizeObserver 隨時盯著；
// KADO 不需要處理裝置旋轉這種情境，這裡的 window resize 監聽單純是為了手機/桌機
// 斷點切換時重算（例如開發時縮放瀏覽器視窗跨過 991px）。如果之後又出現會動態
// 改變 #topBar 高度的內容，再視情況加回 ResizeObserver。
function updateTopBarHeight() {
  if (!topBar) return;
  const h = (isMobile() && isListMode()) ? topBar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty('--top-bar-height', h + 'px');
}

function handleScroll() {
  if (!gridView) return;

  if (!isMobile() || !isListMode()) {
    showBar();
    downAccum = 0;
    lastScrollTop = gridView.scrollTop;
    return;
  }

  const st = gridView.scrollTop;
  const delta = st - lastScrollTop;

  // 頂部安全區：一律顯示，避免捲到頂端時因為零星 delta 抖動
  if (st <= TOP_SAFE_ZONE) {
    showBar();
    downAccum = 0;
    lastScrollTop = st;
    return;
  }

  if (delta > 0) {
    // 往下滑：累積到門檻才隱藏
    downAccum += delta;
    if (downAccum > HIDE_THRESHOLD) hideBar();
  } else if (delta < 0) {
    // 往上滑：哪怕滑一點點，立刻出現
    downAccum = 0;
    showBar();
  }

  lastScrollTop = st;
}

// 切換 view（grid ↔ map）或跨越 breakpoint 時呼叫，確保狀態乾淨、bar 一定可見
export function resetTopBarScrollState() {
  downAccum = 0;
  lastScrollTop = gridView ? gridView.scrollTop : 0;
  showBar();
  updateTopBarHeight();
}

export function initTopBarScroll() {
  topBar = document.getElementById('topBar');
  gridView = document.getElementById('gridView');
  if (!topBar || !gridView) return;

  updateTopBarHeight();
  lastScrollTop = gridView.scrollTop;

  gridView.addEventListener('scroll', handleScroll, { passive: true });

  window.addEventListener('resize', () => {
    updateTopBarHeight();
    // 從 mobile 切到 desktop（或反過來）時，確保 bar 狀態重置乾淨
    if (!isMobile()) showBar();
  });
}
