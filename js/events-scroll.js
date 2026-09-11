// events-scroll.js — 照抄 js/scroll.js 的 #topBar 邏輯，差異見 CLAUDE.md「手機版頂部工具列滑動隱藏」

const MOBILE_BREAKPOINT = 900;
const HIDE_THRESHOLD = 8;   // 累積往下滑動超過這個值才隱藏，避免手抖誤觸
const TOP_SAFE_ZONE = 24;   // 捲動位置在最頂端這個範圍內一律保持顯示，避免抵達頂部時抖動

let topBar = null;
let scrollTargets = [];
const trackers = new Map(); // el -> { lastScrollTop, downAccum }

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
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

function handleScroll(e) {
  const el = e.currentTarget;
  let tracker = trackers.get(el);
  if (!tracker) {
    tracker = { lastScrollTop: el.scrollTop, downAccum: 0 };
    trackers.set(el, tracker);
  }

  if (!isMobile()) {
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
    tracker.lastScrollTop = el.scrollTop;
  });
  showBar();
  updateTopBarHeight();
}

export function initEventsTopBarScroll() {
  topBar = document.getElementById('eventsTopBar');
  scrollTargets = ['eventsDayGrid', 'eventsCollageGrid', 'eventsCollageListWrap']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!topBar || !scrollTargets.length) return;

  updateTopBarHeight();

  scrollTargets.forEach((el) => {
    trackers.set(el, { lastScrollTop: el.scrollTop, downAccum: 0 });
    el.addEventListener('scroll', handleScroll, { passive: true });
  });

  // 用 ResizeObserver 直接盯 #eventsTopBar 本身的尺寸變化：
  // 訪客 banner 非同步出現、螢幕旋轉、filter pill 選取後高度變化都會自動觸發
  // 重新量測，不用為每個成因各自補監聽。
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => updateTopBarHeight());
    ro.observe(topBar);
  } else {
    window.addEventListener('resize', updateTopBarHeight);
  }

  window.addEventListener('resize', () => {
    // 從 mobile 切到桌機（或反過來）時，確保 bar 狀態重置乾淨
    if (!isMobile()) showBar();
  });
}
