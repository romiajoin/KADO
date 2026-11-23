// events-scroll.js — 照抄 js/scroll.js 的 #topBar 邏輯，差異見 CLAUDE.md「手機版頂部工具列滑動隱藏」

const MOBILE_BREAKPOINT = 991;
const HIDE_THRESHOLD = 8;   // 累積往下滑動超過這個值才隱藏，避免手抖誤觸
const TOP_SAFE_ZONE = 24;   // 捲動位置在最頂端這個範圍內一律保持顯示，避免抵達頂部時抖動

let topBar = null;
let scrollTargets = [];
const trackers = new Map(); // el -> { lastScrollTop, downAccum }

// 用 matchMedia 判斷而不是讀 window.innerWidth：樣式失效後讀 innerWidth 會強制同步排版
// （Lighthouse 手機版「強制自動重排」在 isMobile() 這行就吃掉 500 多毫秒）。
const mobileMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
function isMobile() {
  return mobileMql.matches;
}

function showBar() {
  if (topBar) topBar.classList.remove('bar-hidden');
}

function hideBar() {
  if (topBar) topBar.classList.add('bar-hidden');
}

// 量測 #eventsTopBar 實際高度，寫進 CSS variable 給 .events-page-body 當
// padding-top 用，避免內容一開始被固定定位的 top bar 蓋住。只有 mobile 才需要
// 這個空間（桌機 #eventsTopBar 本來就是一般文件流，不用補 padding）。
function updateTopBarHeight() {
  if (!topBar) return;
  const h = isMobile() ? topBar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty('--events-top-bar-height', h + 'px');
}

// reset 時不要同步量測：init／切換子模式剛寫完 DOM，樣式還是失效的，這時讀 getBoundingClientRect 會強制重排
// （Lighthouse 手機版約 400 ms）。改成 unobserve → observe 讓 ResizeObserver 再觸發一次初始回呼，
// 回呼在瀏覽器排版完成後才跑，讀尺寸不會強制重排。不支援 ResizeObserver 的舊瀏覽器退回直接量測。
let topBarRO = null;
function requestTopBarMeasure() {
  if (!topBar) return;
  if (!topBarRO) { updateTopBarHeight(); return; }
  topBarRO.unobserve(topBar);
  topBarRO.observe(topBar);
}

// 月曆模式（#eventsDayGrid）刻意排除在 hide-on-scroll 之外：週幾標題列／每週
// 日期數字列都要在捲動時保持可見（跟月曆內部的 sticky 日期列搭配），所以
// 月曆捲動時 topbar 永遠顯示，不走下面的隱藏判斷；拼貼格狀／拼貼列表兩種
// 子模式維持原本的 hide-on-scroll 行為不變。
const ALWAYS_VISIBLE_TARGET_ID = 'eventsDayGrid';

function handleScroll(e) {
  const el = e.currentTarget;
  let tracker = trackers.get(el);
  if (!tracker) {
    tracker = { lastScrollTop: el.scrollTop, downAccum: 0 };
    trackers.set(el, tracker);
  }

  // reset 後 lastScrollTop 先設成 -1（不在 reset 當下讀 scrollTop，避免強制重排），第一次 scroll 時再補讀
  if (tracker.lastScrollTop < 0) { tracker.lastScrollTop = el.scrollTop; return; }

  if (!isMobile() || el.id === ALWAYS_VISIBLE_TARGET_ID) {
    showBar();
    tracker.downAccum = 0;
    tracker.lastScrollTop = el.scrollTop;
    return;
  }

  const st = el.scrollTop;
  const delta = st - tracker.lastScrollTop;

  // 頂部安全區：一律顯示，避免捲到頂端時因為零星 delta 抖動
  if (st <= TOP_SAFE_ZONE) {
    showBar();
    tracker.downAccum = 0;
    tracker.lastScrollTop = st;
    return;
  }

  if (delta > 0) {
    // 往下滑：累積到門檻才隱藏
    tracker.downAccum += delta;
    if (tracker.downAccum > HIDE_THRESHOLD) hideBar();
  } else if (delta < 0) {
    // 往上滑：哪怕滑一點點，立刻出現
    tracker.downAccum = 0;
    showBar();
  }

  tracker.lastScrollTop = st;
}

// 切換子模式（月曆／拼貼格狀／拼貼列表）或跨越 breakpoint 時呼叫，確保狀態
// 乾淨、bar 一定可見——三個容器的追蹤狀態一起重置，不只重置目前可見那個。
export function resetEventsTopBarScrollState() {
  trackers.forEach((tracker, el) => {
    tracker.downAccum = 0;
    tracker.lastScrollTop = -1;
  });
  showBar();
  requestTopBarMeasure();
}

export function initEventsTopBarScroll() {
  topBar = document.getElementById('eventsTopBar');
  scrollTargets = ['eventsDayGrid', 'eventsCollageGrid', 'eventsCollageListWrap']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!topBar || !scrollTargets.length) return;

  // 這裡刻意不讀任何版面屬性（scrollTop／getBoundingClientRect）：init 跑在 renderAll() 剛寫完
  // 整批卡片 DOM 之後，這時讀取會強制同步重排（Lighthouse「強制自動重排」約 294 ms）。
  // tracker 留到第一次 scroll 事件才建立（handleScroll 已有這個後備邏輯，起點就是當下的 scrollTop）；
  // 頂欄高度交給下面 ResizeObserver 的初始回呼（瀏覽器排版完才觸發，不會強制重排）。
  scrollTargets.forEach((el) => {
    el.addEventListener('scroll', handleScroll, { passive: true });
  });

  // 用 ResizeObserver 直接盯 #eventsTopBar 本身的尺寸變化：
  // 訪客 banner 非同步出現、螢幕旋轉、filter pill 選取後高度變化都會自動觸發
  // 重新量測，不用為每個成因各自補監聽。
  if (typeof ResizeObserver !== 'undefined') {
    topBarRO = new ResizeObserver(() => updateTopBarHeight());
    topBarRO.observe(topBar);
  } else {
    updateTopBarHeight();
    window.addEventListener('resize', updateTopBarHeight);
  }

  window.addEventListener('resize', () => {
    // 從 mobile 切到桌機（或反過來）時，確保 bar 狀態重置乾淨
    if (!isMobile()) showBar();
  });
}
