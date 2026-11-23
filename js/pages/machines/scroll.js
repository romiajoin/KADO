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

// 用 matchMedia 判斷而不是讀 window.innerWidth：樣式失效後讀 innerWidth 會強制同步排版
// （Lighthouse 手機版「強制自動重排」在這一行吃掉約 250 ms）。
const mobileMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
function isMobile() {
  return mobileMql.matches;
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
//
// 量測本身放進 ResizeObserver 回呼：回呼在瀏覽器排版完成後、繪製前才觸發，讀取尺寸不會強制同步重排。
// 每次要重新量測就 unobserve → observe，讓它再觸發一次初始回呼（量測時才判斷手機／列表模式，
// 所以切換 view 或跨斷點後呼叫也會拿到最新狀態）。不支援 ResizeObserver 的舊瀏覽器退回直接量測。
let topBarRO = null;
function measureTopBarHeight() {
  if (!topBar) return;
  const h = (isMobile() && isListMode()) ? topBar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty('--top-bar-height', h + 'px');
}
function updateTopBarHeight() {
  if (!topBar) return;
  if (typeof ResizeObserver === 'undefined') { measureTopBarHeight(); return; }
  if (!topBarRO) topBarRO = new ResizeObserver(measureTopBarHeight);
  topBarRO.unobserve(topBar);
  topBarRO.observe(topBar);
}

function handleScroll() {
  if (!gridView) return;

  if (lastScrollTop < 0) { lastScrollTop = gridView.scrollTop; return; }

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

// 供外部（main.js）在 #topBar 實際高度可能變動之後（例如 filter-bar 非同步塞入篩選 pill）
// 重新量測一次，避免 CSS variable 卡在初次量測時的舊值，導致 fixed top-bar 蓋住底下內容。
export function updateTopBarHeightExternal() {
  updateTopBarHeight();
}

// 切換 view（grid ↔ map）或跨越 breakpoint 時呼叫，確保狀態乾淨、bar 一定可見
export function resetTopBarScrollState() {
  downAccum = 0;
  lastScrollTop = -1; // 延後到第一次 scroll 事件再讀：此時樣式剛失效，讀 scrollTop 會強制重排
  showBar();
  updateTopBarHeight();
}

export function initTopBarScroll() {
  topBar = document.getElementById('topBar');
  gridView = document.getElementById('gridView');
  if (!topBar || !gridView) return;

  updateTopBarHeight();
  lastScrollTop = 0; // 不在初始化時讀 scrollTop（會強制重排）；頁面剛載入一定在頂端

  gridView.addEventListener('scroll', handleScroll, { passive: true });

  window.addEventListener('resize', () => {
    updateTopBarHeight();
    // 從 mobile 切到 desktop（或反過來）時，確保 bar 狀態重置乾淨
    if (!isMobile()) showBar();
  });
}
