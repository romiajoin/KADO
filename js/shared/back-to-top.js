// =============================================
// back-to-top.js — 「回到頂端」浮動按鈕（首頁列表＋活動頁共用）
// 這兩頁的捲動都發生在內層容器（#gridView、活動頁的月曆／拼貼／列表），不是 window，
// 所以不能用 window.scrollY：改成對每個「目前看得到」的捲動容器檢查 scrollTop，
// 任何一個捲過門檻就顯示按鈕，點下去把它們全部平滑捲回最上面。
// 地圖模式（body.map-view）沒有這種長列表，按鈕一律隱藏。
// =============================================

import { getDeviceType } from './utils.js';

const SHOW_AFTER_PX = 400; // 捲超過這個距離才出現，短列表或剛進頁面不打擾
const TARGET_SELECTORS = ['#gridView', '#eventsDayGrid', '#eventsCollageGrid', '#eventsCollageListWrap', '.events-page-body'];

const targets = TARGET_SELECTORS.flatMap((sel) => Array.from(document.querySelectorAll(sel)));

if (targets.length) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', '回到頂端');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg><span class="back-to-top-label">回到頂部</span>';
  document.body.appendChild(btn);

  // 容器被 hidden／display:none（切換檢視模式）時 offsetParent 為 null，視為不在畫面上
  const scrolledTargets = () => targets.filter((el) => el.offsetParent !== null && el.scrollTop > SHOW_AFTER_PX);

  function update() {
    const show = !document.body.classList.contains('map-view') && scrolledTargets().length > 0;
    btn.classList.toggle('show', show);
  }

  // scroll 事件不會冒泡，用 capture 在 document 一次接住所有內層容器的捲動
  document.addEventListener('scroll', (e) => {
    if (targets.includes(e.target)) update();
  }, { capture: true, passive: true });

  // 切換檢視（列表／地圖／月曆／拼貼）時，容器的 hidden／class 會變，重新判斷一次
  const observer = new MutationObserver(update);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  targets.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] }));
  window.addEventListener('resize', update);

  btn.addEventListener('click', () => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrolledTargets().forEach((el) => el.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
    gtag('event', 'back_to_top_click', { device: getDeviceType() });
  });
}
