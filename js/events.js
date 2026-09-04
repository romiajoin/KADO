// =============================================
// events.js — 活動行事曆頁面邏輯（events.html 專用）
// 跟 index.html 是分開的獨立頁面（在同一個分頁導航過去，header 的 logo 點回去就是首頁），
// 所以這裡不是 overlay/modal，是一般頁面，DOMContentLoaded 後直接把內容畫出來即可，
// 不用處理開關動畫、backdrop click 這些 modal 才需要的邏輯。
// 資料層（fetch CSV）拆在 events-data.js。
// =============================================

import { getDeviceType } from './utils.js';
import { getEndingBadge } from './utils.js';
import { TW_CITY_ORDER } from './utils.js';
import { haversineKm } from './utils.js';
import { driveUrlToImage } from './utils.js';
import { EVENT_CATEGORIES, loadEvents, allEvents } from './events-data.js';
import { createFilterWidget } from './filter-widget.js';
import { createSortWidget } from './sort-widget.js';
import { initEventsTopBarScroll, resetEventsTopBarScrollState } from './events-scroll.js';

const state = {
  month: startOfMonth(new Date()),
  selectedGroupKey: null,
  expandedWeeks: new Set(),
  // 'calendar' | 'collage'，預設 'collage'，須跟 events.html 初始 hidden 屬性維持一致，見 CLAUDE.md「月曆檢視 / 總覽（拼貼）檢視」
  view: 'collage',
  collageLayout: 'grid', // 'grid' | 'list'（v34 新增，拼貼內的次要切換，見 setCollageLayout()）
};

// eventsFilterState 獨立於 state 之外，理由見 CLAUDE.md「eventsFilterState／搜尋關鍵字獨立於 state 物件之外」
const eventsFilterState = { category: [], ip: [], city: [] };

// 搜尋關鍵字獨立放，理由同上；比對欄位多比對活動標題（title）

function isMobileFilterLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ---------- 篩選 / 狀態小工具 ----------

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWithin(date, ev) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d >= new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate())
      && d <= new Date(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate());
}

let eventsSearchKeyword = '';

function visibleEvents() {
  const selectedCategories = eventsFilterState.category;
  const selectedIps = eventsFilterState.ip;
  const selectedCities = eventsFilterState.city;
  const kw = eventsSearchKeyword.trim().toLowerCase();
  return allEvents.filter((ev) => (selectedCategories.length === 0 || selectedCategories.includes(ev.category))
      && (selectedIps.length === 0 || selectedIps.includes(ev.character))
      && (selectedCities.length === 0 || selectedCities.includes(ev.city))
      && (!kw
        || (ev.title || '').toLowerCase().includes(kw)
        || (ev.character || '').toLowerCase().includes(kw)
        || (ev.city || '').toLowerCase().includes(kw)
        || (ev.venue || '').toLowerCase().includes(kw)));
}

// ---------- 分組：同一檔活動在多個城市同時開，見 CLAUDE.md「資料分組」----------
let groupKeyMap = null;

function ensureGroupKeyMap() {
  if (groupKeyMap) return groupKeyMap;
  groupKeyMap = new Map();
  let counter = 0;
  allEvents.forEach((ev) => {
    const raw = `${ev.title}\u0000${ev.period}`;
    if (!groupKeyMap.has(raw)) groupKeyMap.set(raw, `g${counter++}`);
  });
  return groupKeyMap;
}

function groupKey(ev) {
  return ensureGroupKeyMap().get(`${ev.title}\u0000${ev.period}`);
}

function buildGroups(events) {
  const map = new Map();
  events.forEach((ev) => {
    const key = groupKey(ev);
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: ev.title,
        category: ev.category,
        period: ev.period,
        start: ev.start,
        end: ev.end,
        image: ev.image,
        locations: [],
      });
    }
    const group = map.get(key);
    // start/end 理論上同一組應該一致，仍取涵蓋範圍最大的一份，避免萬一表單裡
    // 兩個地點日期填得不完全一樣，篩選/月曆判斷仍以最寬的範圍為準。
    if (ev.start < group.start) group.start = ev.start;
    if (ev.end > group.end) group.end = ev.end;
    group.locations.push(ev);
  });
  return Array.from(map.values());
}

function visibleGroups() {
  return buildGroups(visibleEvents());
}

// 詳情 Modal／分享連結還原用：跟 openGroupFromKey 一樣查 allEvents（不受篩選
// 影響）查找同一個道理，避免「篩選中的分類剛好不含這組」時打不開。
function findGroupByKey(key) {
  return buildGroups(allEvents).find((g) => g.key === key);
}

function eventsForDate(date) {
  return visibleGroups().filter((g) => isWithin(date, g));
}

// ---------- 渲染：月曆 ----------
// 橫幅事件條月曆排版，見 CLAUDE.md「月曆橫幅列排版與 hover 外框」

const WEEKDAY_LABELS = ['MON（一）', 'TUE（二）', 'WED（三）', 'THU（四）', 'FRI（五）', 'SAT（六）', 'SUN（日）'];
const MAX_VISIBLE_ROWS = 5;

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startPad = (firstDay.getDay() + 6) % 7; // 週一開頭
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkIntoWeeks(cells) {
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 算出這一週裡每個活動要畫成的橫幅：欄位範圍（colStart／colSpan，只算這一週
// 裡有顯示日期的欄，跨到留白格的部分不延伸過去），以及避免互相重疊的 row。
function weekEventBars(week) {
  const visibleCols = [];
  week.forEach((d, i) => { if (d) visibleCols.push(i); });
  if (!visibleCols.length) return [];

  const bars = [];
  visibleGroups().forEach((group) => {
    let colStart = -1;
    let colEnd = -1;
    visibleCols.forEach((i) => {
      if (isWithin(week[i], group)) {
        if (colStart === -1) colStart = i;
        colEnd = i;
      }
    });
    if (colStart === -1) return;
    bars.push({ group, colStart, colSpan: colEnd - colStart + 1 });
  });

  // 開始欄位小的排前面，同樣開始欄位時橫跨天數多的排前面，排列比較穩定
  bars.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);

  const rowLastCol = []; // rowLastCol[i]：第 i 個 row 目前佔用到的最後一欄
  bars.forEach((bar) => {
    let row = rowLastCol.findIndex((lastCol) => lastCol < bar.colStart);
    if (row === -1) { row = rowLastCol.length; rowLastCol.push(-1); }
    rowLastCol[row] = bar.colStart + bar.colSpan - 1;
    bar.row = row;
  });

  return bars;
}

function barHtml(bar) {
  const group = bar.group;
  const isSelected = group.key === state.selectedGroupKey;
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const style = `grid-column:${bar.colStart + 1} / span ${bar.colSpan};grid-row:${bar.row + 1};--bar-color:${color};`;
  // 同一組涵蓋超過一個地點（例如台北／高雄同時開）時，右側掛一個「N 地」徽章，
  // 取代原本兩條標題完全一樣的橫幅疊在一起。
  const multiBadge = group.locations.length > 1
    ? `<span class="events-bar-multi-badge">${group.locations.length} 地</span>` : '';
  return `<button type="button" class="events-bar${isSelected ? ' selected' : ''}" style="${style}" `
    + `data-group-key="${group.key}">`
    + `<span class="events-bar-cat">${group.category}</span>`
    + `<span class="events-bar-title">${group.title}</span>`
    + multiBadge
    + `</button>`;
}

function renderWeekRow(week, today, weekKey) {
  const dayNumsHtml = week.map((date) => {
    if (!date) return '<div class="events-day-num-cell pad"></div>';
    const isToday = sameDay(date, today);
    const dayEvents = eventsForDate(date);
    const hasEvents = dayEvents.length > 0;
    // data-day-key 掛在格子本身（不是內層數字），因為整個格子都要能點擊
    // （見下面 has-events 的 CSS 跟 renderEventsCalendar 的 click 綁定），不只是
    // 數字那顆小字。
    const attrs = hasEvents
      ? ` data-day-key="${dateKey(date)}"`
      : '';
    return `<div class="events-day-num-cell${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}"${attrs}>`
      + `<span class="events-day-num${hasEvents ? ' clickable' : ''}">${date.getDate()}</span>`
      + `</div>`;
  }).join('');

  const bars = weekEventBars(week);
  const rowCount = bars.reduce((max, b) => Math.max(max, b.row + 1), 0);
  const expanded = state.expandedWeeks.has(weekKey);
  const visibleRowCount = expanded ? rowCount : Math.min(rowCount, MAX_VISIBLE_ROWS);
  const visibleBars = bars.filter((b) => b.row < visibleRowCount);
  const hasMore = rowCount > MAX_VISIBLE_ROWS;

  const barsStyle = `grid-template-rows: repeat(${Math.max(visibleRowCount, 1)}, auto);`;
  const toggleHtml = hasMore
    ? `<button type="button" class="events-week-toggle" data-week-key="${weekKey}">`
      + `${expanded ? '部分顯示' : '全部顯示'}`
      + `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M312-312h132q15.3 0 25.65 10.29Q480-291.42 480-276.21t-10.35 25.71Q459.3-240 444-240H276q-15.3 0-25.65-10.35Q240-260.7 240-276v-168q0-15.3 10.29-25.65Q260.58-480 275.79-480t25.71 10.35Q312-459.3 312-444v132Zm336-336H516q-15.3 0-25.65-10.29Q480-668.58 480-683.79t10.35-25.71Q500.7-720 516-720h168q15.3 0 25.65 10.35Q720-699.3 720-684v168q0 15.3-10.29 25.65Q699.42-480 684.21-480t-25.71-10.35Q648-500.7 648-516v-132Z"/></svg>`
      + `</button>`
    : '';

  return `<div class="events-week-row">`
    // .events-week-body 只包日期數字＋橫幅這兩層 grid，不含「全部顯示」toggle
    // 按鈕——hover 外框（.events-week-hover-col）用 top:0;bottom:0 貼齊這層
    // 的高度，範圍要卡在橫幅區底部，不能連 toggle 按鈕那一列都一起框進去。
    // .events-week-hover-col 放在 .events-week-bars 「之後」：兩者都是
    // position 非 static 的元素、z-index 都是 auto，同一組堆疊順序完全照
    // DOM 順序決定，先出現的畫在下面——放後面讓外框疊在橫幅「上層」，蓋在
    // 橫幅色塊上一樣看得到完整一圈，不會被橫幅擋住切成一段一段。
    + `<div class="events-week-body">`
    + `<div class="events-week-daynums">${dayNumsHtml}</div>`
    + `<div class="events-week-bars" style="${barsStyle}">${visibleBars.map(barHtml).join('')}</div>`
    + `<div class="events-week-hover-col" aria-hidden="true"></div>`
    + `</div>`
    + toggleHtml
    + `</div>`;
}

function renderEventsCalendar() {
  document.getElementById('eventsMonthLabel').textContent =
    `${state.month.getFullYear()}年${state.month.getMonth() + 1}月`;
  document.getElementById('eventsPrevMonth').disabled = state.month.getTime() <= MIN_MONTH.getTime();

  const weekdayRow = document.getElementById('eventsWeekdayRow');
  weekdayRow.innerHTML = WEEKDAY_LABELS.map((l) => `<div>${l}</div>`).join('');

  const today = new Date();
  const weeks = chunkIntoWeeks(buildMonthCells(state.month));
  const monthKey = `${state.month.getFullYear()}-${state.month.getMonth()}`;
  const grid = document.getElementById('eventsDayGrid');
  grid.innerHTML = weeks.map((week, i) => renderWeekRow(week, today, `${monthKey}-${i}`)).join('');

  grid.querySelectorAll('.events-bar').forEach((btn) => {
    btn.addEventListener('click', () => openGroupFromKey(btn.dataset.groupKey, 'calendar_bar'));
  });

  grid.querySelectorAll('.events-week-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.weekKey;
      const expanding = !state.expandedWeeks.has(key);
      if (expanding) state.expandedWeeks.add(key);
      else state.expandedWeeks.delete(key);
      gtag('event', 'events_week_expand', { week_key: key, action: expanding ? 'expand' : 'collapse', device: getDeviceType() });
      renderEventsCalendar();
    });
  });

  grid.querySelectorAll('.events-day-num-cell.has-events').forEach((cell) => {
    cell.addEventListener('click', () => openDayEventsPanel(cell.dataset.dayKey));
    // 欄位外框只在滑鼠裝置開（見 isDesktopPointer()），觸控裝置沒有「移過去
    // 但不點」這個手勢，硬綁 mouseenter/mouseleave 在觸控裝置上行為不一致
    // （有些瀏覽器會在 tap 時補一次幽靈 mouseenter），乾脆不綁。
    if (isDesktopPointer()) {
      cell.addEventListener('mouseenter', () => onDayCellHoverEnter(cell));
      cell.addEventListener('mouseleave', () => onDayCellHoverLeave(cell));
    }
  });
}

// ---------- 日期格子 hover：整欄外框 ----------
// 用獨立絕對定位圖層對齊背景直向格線，做法見 CLAUDE.md「月曆橫幅列排版與 hover 外框」

function isDesktopPointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function dayColumnIndex(cell) {
  return Array.from(cell.parentElement.children).indexOf(cell);
}

function onDayCellHoverEnter(cell) {
  const hoverCol = cell.closest('.events-week-row')?.querySelector('.events-week-hover-col');
  if (!hoverCol) return;
  const col = dayColumnIndex(cell);
  hoverCol.style.left = `calc(${col} * (100% + 1px) / 7)`;
  hoverCol.style.width = `calc((100% + 1px) / 7 - 1px)`;
  hoverCol.classList.add('show');
}

function onDayCellHoverLeave(cell) {
  cell.closest('.events-week-row')?.querySelector('.events-week-hover-col')?.classList.remove('show');
}

// ---------- 渲染：清單 ----------

function eventGroupCardHtml(group) {
  const badge = getEndingBadge(group.period);
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const isSelected = group.key === state.selectedGroupKey;
  const multi = group.locations.length > 1;
  // 多地點時副標題直接列城市（去重，理論上不會同城市出現兩次，但以防萬一還是
  // 去重一次），不再各自出一張卡片；單一地點維持原本「城市 場地」的寫法。
  const venueLabel = multi
    ? [...new Set(group.locations.map((l) => l.city).filter(Boolean))].join('・')
    : `${group.locations[0].city || ''} ${group.locations[0].venue || ''}`;
  const multiPill = multi ? `<span class="events-multi-pill">📍 ${group.locations.length} 地點</span>` : '';
  // 這份卡片只用在「當日活動」drawer 清單（openDayEventsPanel），一次要看
  // 好幾張、寬度只有 400px，縮圖在這個尺寸下太小看不出內容，決定拿掉，卡片
  // 改純文字（分類 pill／標題／地點／期間），資訊優先、掃視速度優先。
  return `
    <div class="events-card${isSelected ? ' selected' : ''}" data-group-key="${group.key}">
      <div class="events-card-body">
        <div class="events-card-pills">
          <span class="events-bar-cat" style="--bar-color:${color}">${group.category}</span>
          ${badge ? `<span class="ending-badge">${badge}</span>` : ''}
          ${multiPill}
        </div>
        <div class="events-card-title">${group.title}</div>
        <div class="events-card-venue">${venueLabel}</div>
        <div class="events-card-period">${group.period}</div>
      </div>
    </div>`;
}

// 活動數量 badge（#eventsCountBadge，events.html 的 .events-search-row 右側，
// 跟 app.html 的 #countBadge 同一套元件／樣式，見 style.css 的 .count-badge）。
// 數字用 visibleGroups().length（目前搜尋／篩選條件下有幾「檔」活動，同一檔
// 活動在多地點開只算一次），不用 visibleEvents().length（那是地點列數）——
// 跟拼貼模式「還沒結束／已結束」分組用的是同一份 group 資料，數字對得起來。
// 不分月曆／拼貼模式，兩種檢視底層是同一組篩選結果，所以直接放在 renderAll()
// 裡跟兩個分支平行呼叫，不用各自在 renderEventsCalendar()／renderEventsCollage()
// 裡重複算一次。
function syncEventsCount() {
  const badge = document.getElementById('eventsCountBadge');
  if (badge) badge.textContent = visibleGroups().length;
}

function renderAll() {
  syncEventsCount();
  if (state.view === 'collage') renderEventsCollage();
  else renderEventsCalendar();
}

// ---------- 渲染：拼貼 ----------
// 跟月曆是不同的瀏覽心智模型：不分月份，把目前篩選條件下的活動全部攤開，
// 分成「還沒結束」／「已結束」兩組（還沒結束在前，呼應 getEndingBadge 的
// 急迫感），組內依使用者在排序元件（見下面 sortWidget）選的方式排序——
// 這個分組本身不受排序選項影響，只有組內的排列順序會變。已經結束的活動
// 月曆查得到（翻到過去的月份），但拼貼是給人「現在能去哪」用的，故意不
// 排除，只用組別把它們墊在後面。
//
// 距離排序：group 可能對應多個地點（同一檔活動在多城市開），沒有「單一
// 座標」可以直接算距離，取 group.locations 裡離使用者最近的那個地點當
// 代表值（groupDistanceKm），跟首頁單一機台距離排序是同一顆 haversineKm
// 公式（搬到 utils.js 共用，見該檔案開頭說明）。
function groupDistanceKm(group, userCoords) {
  if (!userCoords) return Infinity;
  const dists = group.locations
    .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number' && !Number.isNaN(l.lat) && !Number.isNaN(l.lng))
    .map((l) => haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng));
  return dists.length ? Math.min(...dists) : Infinity;
}

function compareGroupsBySort(a, b, sortKey, userCoords) {
  if (sortKey === 'distance_asc' || sortKey === 'distance_desc') {
    const dir = sortKey === 'distance_desc' ? -1 : 1;
    return (groupDistanceKm(a, userCoords) - groupDistanceKm(b, userCoords)) * dir;
  }
  const dir = sortKey === 'end_date_desc' ? -1 : 1;
  return (a.end - b.end) * dir || (a.start - b.start) * dir;
}

function collageGroups() {
  // 不篩掉已結束的活動（跟月曆一樣，翻到過去月份也查得到），只用「還沒結束」
  // ／「已結束」兩組把它們墊在後面，資料量看起來才會跟月曆一致。
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ongoing = [];
  const ended = [];
  visibleGroups().forEach((g) => (g.end >= today ? ongoing : ended).push(g));
  const sortKey = sortWidget.getState();
  const userCoords = sortWidget.getUserCoords();
  const cmp = (a, b) => compareGroupsBySort(a, b, sortKey, userCoords);
  ongoing.sort(cmp);
  ended.sort(cmp);
  return [...ongoing, ...ended];
}

// 拼貼（格狀／列表）唯一會混在同一份清單裡同時出現「還沒結束」跟「已結束」
// 活動的地方（見上面 collageGroups() 的排序說明），已結束的活動只用透明度
// 區分（不做灰階濾鏡，圖片保留原色），簡單但已經能讓使用者一眼看出「這幾張
// 是過去式」——跟 isGroupEnded() 判斷用的是同一顆 group.end，跟排序邏輯共用
// 同一個「今天」定義，不會有排序說是已結束、視覺卻沒反映的情況。
function isGroupEnded(group) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return group.end < today;
}

function collageCardHtml(group) {
  // 已結束的活動優先顯示「已結束」badge，取代原本的倒數 badge（已經結束就
  // 不需要再提示「快結束」）；只有還沒結束時才照原本邏輯算 getEndingBadge。
  const ended = isGroupEnded(group);
  const badge = ended ? '' : getEndingBadge(group.period);
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const multi = group.locations.length > 1;
  const venueLabel = multi
    ? [...new Set(group.locations.map((l) => l.city).filter(Boolean))].join('・')
    : `${group.locations[0].city || ''} ${group.locations[0].venue || ''}`;
  const thumbUrl = eventThumbUrl(group);
  const media = thumbUrl
    ? `<div class="collage-card-media"><img src="${thumbUrl}" alt="${group.title}" loading="lazy"></div>`
    : `<div class="collage-card-media no-image"></div>`;
  return `
    <div class="collage-card${ended ? ' is-ended' : ''}" data-group-key="${group.key}">
      ${media}
      <div class="collage-card-pills">
        <span class="type-badge" style="background:var(--fill-white);border:1px solid ${color};color:${color}">${group.category}</span>
        ${ended ? `<span class="ending-badge ended-badge">已結束</span>` : (badge ? `<span class="ending-badge">${badge}</span>` : '')}
      </div>
      <div class="collage-card-body">
        <div class="collage-card-title">${group.title}</div>
        <div class="collage-card-period">${group.period}</div>
        <div class="collage-card-venue">${venueLabel}</div>
      </div>
    </div>`;
}

function collageEmptyHtml() {
  // 跟首頁的「找不到符合的地點」空狀態共用同一個 .empty-state class（style.css），
  // 不是 events.css 自己另一套 .events-empty 樣式，兩邊 UI 才會一致。
  return `<div class="empty-state">找不到符合篩選條件的活動 இдஇ</div>`;
}

// 格狀：滿版無縫貼齊的瀑布流，見上面 collageCardHtml()。
//
// JS 輪流分欄取代 CSS multi-column（讀取順序問題），做法見 CLAUDE.md「拼貼格狀排版」
function collageColumnCount() {
  const w = window.innerWidth;
  if (w <= 420) return 1;
  if (w <= 720) return 2;
  if (w <= 1100) return 3;
  return 4;
}

let lastCollageGridGroups = null;

function renderCollageGrid(groups) {
  lastCollageGridGroups = groups;
  const grid = document.getElementById('eventsCollageGrid');
  if (!groups.length) {
    grid.innerHTML = collageEmptyHtml();
    return;
  }
  const colCount = collageColumnCount();
  const cols = Array.from({ length: colCount }, () => []);
  groups.forEach((group, i) => cols[i % colCount].push(group));
  grid.innerHTML = cols
    .map((colGroups) => `<div class="collage-grid-col">${colGroups.map(collageCardHtml).join('')}</div>`)
    .join('');
  grid.querySelectorAll('.collage-card').forEach((card) => {
    card.addEventListener('click', () => openGroupFromKey(card.dataset.groupKey, 'events_collage_grid'));
  });
}

// 螢幕寬度跨過欄數斷點（例如視窗縮放、手機轉橫向）時，欄數要重新分配，
// 不然卡片還是照舊的欄數分組、版面會跟 CSS 的欄寬對不上。用目前欄數是否
// 真的變動來判斷要不要重畫，避免拖曳視窗時無意義地一直重繪。debounce
// 150ms 是常見的 resize 節流數字，跟頁面上其他效能考量沒有特別關聯。
let collageResizeColCount = null;
let collageResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(collageResizeTimer);
  collageResizeTimer = setTimeout(() => {
    if (state.view !== 'collage' || state.collageLayout !== 'grid' || !lastCollageGridGroups) return;
    const cols = collageColumnCount();
    if (cols === collageResizeColCount) return;
    collageResizeColCount = cols;
    renderCollageGrid(lastCollageGridGroups);
  }, 150);
});

// 列表：跟「格狀」是完全不同的卡片語言，不是隨便找一顆現成卡片湊合——直接
// 沿用首頁地點列表卡片的 class（.loc-card-grid／.card-top／.card-badge-row／
// .type-badge／.ending-badge／.card-name／.card-limited／.card-tags／.tag／
// .card-actions／.btn-expand，全部定義在 style.css，兩個頁面都有載入），連
// 互動邏輯都比照：卡片本身不能點，只有「詳情」按鈕可以點、才會開彈窗——
// 跟首頁 grid.js 的 renderGrid() 一模一樣，不是這裡另外設計一套。不放圖
// （首頁列表卡片本身也沒有圖，圖只出現在「詳情」彈窗裡）。
//
// 首頁的 .type-badge 只有 .gacha／.photocard 兩種寫死的顏色，這裡類別有五種
// （events-data.js 的 EVENT_CATEGORIES），改用 inline style 帶入對應色碼，
// 视覺上仍是同一顆「白底、色框、色字」的 badge，只是顏色來源不同。
//
// 卡片上不放「在 Google Maps 查看」（只留在詳情 Modal 裡，那裡本來就有、
// 多地點時還能切城市 tab 各自查看，卡片這層不需要重複一份）；多地點活動的
// tag 只列縣市（不重複的城市各一顆），不顯示場地——單一地點才顯示場地。
function eventListCardHtml(group) {
  const cat = EVENT_CATEGORIES.find((c) => c.label === group.category);
  const color = cat ? cat.color : 'var(--fill-gray-64)';
  // 已結束的活動優先顯示「已結束」badge（跟拼貼卡片 collageCardHtml 同一個
  // 判斷、同一套做法），取代原本的倒數 badge，只有還沒結束時才算 getEndingBadge。
  const ended = isGroupEnded(group);
  const badge = ended ? '' : getEndingBadge(group.period);
  const multi = group.locations.length > 1;
  const primary = group.locations[0];

  const cityTags = multi
    ? [...new Set(group.locations.map((l) => l.city).filter(Boolean))]
    : [primary.city].filter(Boolean);
  const tags = [
    primary.character ? `<span class="tag">${primary.character}</span>` : '',
    ...cityTags.map((c) => `<span class="tag">${c}</span>`),
    !multi && primary.venue ? `<span class="tag">${primary.venue}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="loc-card-grid${ended ? ' is-ended' : ''}" data-group-key="${group.key}">
      <div class="card-top">
        <div class="card-badge-row">
          <div class="card-badge-group">
            <div class="type-badge" style="background:var(--fill-white);border:1px solid ${color};color:${color}">${group.category}</div>
            ${multi ? `<span class="events-multi-pill">📍 ${group.locations.length} 地點</span>` : ''}
          </div>
          ${ended ? `<div class="ending-badge ended-badge">已結束</div>` : (badge ? `<div class="ending-badge">${badge}</div>` : '')}
        </div>
        <div class="card-name">${group.title}</div>
        ${group.period ? `<div class="card-limited">期間限定：${group.period}</div>` : ''}
        <div class="card-tags">${tags}</div>
      </div>
      <div class="card-actions">
        <button class="btn-expand" type="button">詳情 <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M312-312h132q15.3 0 25.65 10.29Q480-291.42 480-276.21t-10.35 25.71Q459.3-240 444-240H276q-15.3 0-25.65-10.35Q240-260.7 240-276v-168q0-15.3 10.29-25.65Q260.58-480 275.79-480t25.71 10.35Q312-459.3 312-444v132Zm336-336H516q-15.3 0-25.65-10.29Q480-668.58 480-683.79t10.35-25.71Q500.7-720 516-720h168q15.3 0 25.65 10.35Q720-699.3 720-684v168q0 15.3-10.29 25.65Q699.42-480 684.21-480t-25.71-10.35Q648-500.7 648-516v-132Z"/></svg></button>
      </div>
    </div>`;
}

function renderCollageList(groups) {
  const list = document.getElementById('eventsCollageList');
  list.innerHTML = groups.length ? groups.map(eventListCardHtml).join('') : collageEmptyHtml();
  list.querySelectorAll('.btn-expand').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.closest('.loc-card-grid').dataset.groupKey;
      openGroupFromKey(key, 'events_collage_list');
    });
  });
}

function renderEventsCollage() {
  const groups = collageGroups();
  if (state.collageLayout === 'list') renderCollageList(groups);
  else renderCollageGrid(groups);
}

// 拼貼格狀／列表兩個容器的顯示狀態只由「目前是不是拼貼視圖」＋「目前選的是
// 哪個排列方式」決定，setView() 切主視圖、setCollageLayout() 切排列方式都要
// 呼叫，抽成共用函式避免兩處各自寫一份、之後改邏輯漏改一邊。
function applyCollageContainers() {
  document.getElementById('eventsCollageGrid').hidden = !(state.view === 'collage' && state.collageLayout === 'grid');
  document.getElementById('eventsCollageListWrap').hidden = !(state.view === 'collage' && state.collageLayout === 'list');
}

// ---------- 月曆／拼貼切換 ----------
function setView(view) {
  if (state.view === view) return;
  // 切到總覽時 drawer 要跟著收起，理由見 CLAUDE.md「總覽切到月曆時，當日活動 drawer 要跟著收起」
  if (document.getElementById('dayEventsOverlay').classList.contains('show')) {
    closeDayEventsPanel(null, 'view_switch');
  }
  state.view = view;
  document.querySelectorAll('#eventsViewTabs .view-btn').forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.getElementById('eventsToolbar').hidden = view !== 'calendar';
  document.getElementById('eventsWeekdayRow').hidden = view !== 'calendar';
  document.getElementById('eventsDayGrid').hidden = view !== 'calendar';
  document.getElementById('eventsCollageToolbar').hidden = view !== 'collage';
  // 排序按鈕（結束日／距離）只在拼貼模式才有意義——月曆模式本身就是按日期
  // 排列，沒有「排序方式」這個概念（見上面 sortWidget 建立時的註解「拼貼
  // 模式專用」）。但 sortWidget.render() 是直接把 .sort-group 插進
  // #eventsFilterBar 裡，跟 filter-bar／pill 群組同一個容器，不像
  // eventsToolbar／eventsCollageToolbar 那樣是各自獨立、天生就能用
  // view !== 'xxx' 分開控制的元素——如果不額外處理，切到月曆模式時
  // filter-bar 右側的排序鈕會一直留著，手機／桌機／平板都一樣。這裡跟其他
  // hidden 切換放在同一批，統一由 setView() 控制。
  const sortGroupEl = document.querySelector('#eventsFilterBar .sort-group');
  if (sortGroupEl) sortGroupEl.hidden = view !== 'collage';
  applyCollageContainers();
  renderAll();
  // v40：切換子模式（月曆／拼貼）時重置 #eventsTopBar 的滑動隱藏狀態，避免
  // 切過去時 bar 停留在上一個模式滑動時留下的隱藏狀態。
  resetEventsTopBarScrollState();
  gtag('event', 'events_view_switch', { view, device: getDeviceType() });
}

// ---------- 拼貼內：格狀／列表切換 ----------
// 兩顆各自獨立的圖示按鈕（見 events.html 的 #eventsCollageLayoutToggle 底下
// 兩顆 .collage-layout-btn，不共用外框），不是循環、也不是包在同一個膠囊裡
// 的分段控制項：直接點你要的那個，.active class 標示目前選中狀態（events.css
// 負責視覺樣式）。
function updateCollageLayoutBtns() {
  document.querySelectorAll('#eventsCollageLayoutToggle .collage-layout-btn').forEach((btn) => {
    const active = btn.dataset.layout === state.collageLayout;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setCollageLayout(layout) {
  if (state.collageLayout === layout) return;
  state.collageLayout = layout;
  updateCollageLayoutBtns();
  applyCollageContainers();
  renderEventsCollage();
  // v40：格狀／列表切換的是不同的捲動容器，同理重置一次。
  resetEventsTopBarScrollState();
  gtag('event', 'events_collage_layout_switch', { layout, device: getDeviceType() });
}

// ---------- 類型／IP／縣市 filter：跟首頁機台／IP／縣市共用同一套 pill + 桌機
// 下拉面板 + 手機 bottom sheet 元件（js/filter-widget.js，詳見該檔案開頭的
// 說明），三個篩選維度：類型（選項固定是 EVENT_CATEGORIES 的 4 個標籤）、IP
// （選項跟首頁 filters.js 的 buildFilterOptions 同一套算法——從 allEvents 動態
// 取 unique 的 character 欄位，用「數字 → 筆畫 → 英文」的 localeCompare('zh-Hant')
// 排序，見下面 ipOptions()）、縣市（選項固定是 utils.js 匯出的 TW_CITY_ORDER，
// 跟首頁縣市篩選同一份順序，不受資料是否存在影響）。選取語意也改成跟首頁
// 一致：「未選＝顯示全部」，選了才篩成只顯示那幾種（見上面
// eventsFilterState／visibleEvents() 的說明），不是原本那版「預設全選、
// 取消代表不顯示」——這點跟使用者確認過，是一次特意的行為調整，不只是外觀。
// widget 只在頁面初始化時建立一次（見最底下 initEventsPage()），bar 本身的
// 重新渲染交給 filterWidget.render()，選取值變化後 onChange 只需要重畫月曆
// （bar 上的 pill 文字/active 狀態 widget 內部自己會刷新，不用另外呼叫）。

// IP 選項：跟首頁 filters.js 的 buildFilterOptions 對非固定欄位（type 以外）
// 的算法完全一致，故意不快取——getOptions 每次渲染都會即時呼叫，activeEvents
// 資料量不大，直接每次現算即可，不用另外處理「資料載入後才更新選項」的同步問題。
function ipOptions() {
  const uniq = [...new Set(allEvents.map((ev) => ev.character).filter(Boolean))];
  uniq.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  return uniq;
}

const filterWidget = createFilterWidget({
  config: [
    { key: 'category', label: '類型' },
    {
      key: 'ip',
      label: 'IP',
      panelHint: '依「數字 → 筆畫 → 英文」排序',
      sheetHint: '依「數字 → 筆畫 → 英文」排序，可滑動尋找',
    },
    { key: 'city', label: '縣市' },
  ],
  getOptions: (key) => {
    if (key === 'city') return TW_CITY_ORDER;
    if (key === 'ip') return ipOptions();
    return EVENT_CATEGORIES.map((c) => c.label);
  },
  state: eventsFilterState,
  barEl: document.getElementById('eventsFilterBar'),
  sheetOverlayId: 'eventsFilterSheetOverlay',
  sheetId: 'eventsFilterSheet',
  sheetTitleId: 'eventsFilterSheetTitle',
  sheetHintId: 'eventsFilterSheetHint',
  sheetOptionsId: 'eventsFilterSheetOptions',
  sheetCloseId: 'eventsFilterSheetClose',
  isMobileLayout: isMobileFilterLayout,
  onChange: () => renderAll(),
  gaPrefix: 'events_filter',
  // 跟排序元件互相關閉，靠 closure 處理宣告順序，見 CLAUDE.md「篩選 ⇄ 排序面板互相關閉」
  onTogglePanel: () => sortWidget.closeDesktopPanel(),
  onOpenSheet: () => sortWidget.closeMobileSheet(),
  onOutsideClose: () => sortWidget.closeDesktopPanel('outside_click'),
  onResizeClose: () => sortWidget.closeDesktopPanel(),
});

// ---------- 排序（結束日／距離）：拼貼模式專用，只有三個選項，理由見 CLAUDE.md「拼貼距離排序只有三個選項」
const EVENTS_SORT_OPTIONS = [
  { key: 'end_date_asc', label1: '結束日', label2: '近到遠', text: '結束日：近到遠' },
  { key: 'end_date_desc', label1: '結束日', label2: '遠到近', text: '結束日：遠到近' },
  { key: 'distance_asc', label1: '距離', label2: '近到遠', text: '距離：近到遠', isDistance: true },
  { key: 'distance_desc', label1: '距離', label2: '遠到近', text: '距離：遠到近', isDistance: true },
];

const sortWidget = createSortWidget({
  options: EVENTS_SORT_OPTIONS,
  initialKey: 'end_date_asc',
  sheetOverlayId: 'eventsSortSheetOverlay',
  sheetHintId: 'eventsSortSheetHint',
  sheetOptionsId: 'eventsSortSheetOptions',
  sheetCloseId: 'eventsSortSheetClose',
  isMobileLayout: isMobileFilterLayout,
  gaPrefix: 'events_sort',
  onTogglePanel: () => filterWidget.closeDesktopPanels(),
  onOpenSheet: () => filterWidget.closeMobileSheet(true),
  onOutsideClose: () => filterWidget.closeDesktopPanels(),
  onResizeClose: () => filterWidget.closeDesktopPanels(true),
  onChange: () => renderAll(),
});

// ---------- 互動 ----------

// 選取的單位是「一組活動」（同活動多地點視為同一組），不是日期：點月曆橫幅、
// 或「當日活動」清單裡的卡片，選的是同一個東西——都會找到對應的 group，直接
// 開詳情 Modal（見下面 openEventDetailModal），並讓月曆上那一條橫幅加上
// selected 樣式（barHtml 依 state.selectedGroupKey 判斷）。關閉 Modal 時清掉
// 選取狀態。
function openGroupFromKey(key, source) {
  const group = findGroupByKey(key);
  if (!group) return;
  state.selectedGroupKey = key;
  renderAll();
  openEventDetailModal(group, source);
}

// MIN_MONTH 鎖住最早可翻到的月份，見 CLAUDE.md「月曆檢視 / 總覽（拼貼）檢視」
const MIN_MONTH = new Date(2026, 4, 1); // 2026/05

function shiftMonth(delta) {
  const next = new Date(state.month.getFullYear(), state.month.getMonth() + delta, 1);
  state.month = next < MIN_MONTH ? MIN_MONTH : next;
  renderAll();
}

// ---------- 「+N 更多」當日活動清單（Modal／Bottom Sheet） ----------
// 跟 changelog.js 同一套開關慣例（overlay + body scroll lock），但這裡的清單
// 內容用的是 eventGroupCardHtml，點裡面的卡片會呼叫 openGroupFromKey 開活動
// 詳情 Modal。這個 drawer 點卡片後刻意「不」自動關閉——同一天常常有好幾場
// 活動，使用者看完一場很可能想接著看下一場，逼他們自己按 X 關掉詳情 Modal
// 後再重新點一次日期才能開回這份清單很麻煩；詳情 Modal 的 z-index（9999）
// 本來就蓋過這個 drawer（2250），視覺上直接疊在上面即可，不需要處理疊層。

function openDayEventsPanel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m, d);
  const dayEvents = eventsForDate(date);

  document.getElementById('dayEventsTitle').textContent = `${m + 1}月${d}日・共 ${dayEvents.length} 場活動`;
  document.getElementById('dayEventsBody').innerHTML =
    `<div class="events-card-list">${dayEvents.map(eventGroupCardHtml).join('')}</div>`;
  document.getElementById('dayEventsBody').querySelectorAll('.events-card').forEach((card) => {
    card.addEventListener('click', () => {
      openGroupFromKey(card.dataset.groupKey, 'events_day_panel');
      // 不呼叫 closeDayEventsPanel()：drawer 保持開啟，讓使用者選完一場活動、
      // 關掉詳情 Modal 後可以直接點清單裡的下一場，不用重新點日期再開一次
      // drawer。改成手動同步 .selected class（跟 eventGroupCardHtml 的
      // isSelected 判斷同一個視覺語意），不整份重繪清單，避免打斷正在滾動的
      // 使用者、也不用重新綁一次 click listener。
      document.getElementById('dayEventsBody').querySelectorAll('.events-card').forEach((c) => {
        c.classList.toggle('selected', c === card);
      });
    });
  });

  document.getElementById('dayEventsOverlay').classList.add('show');
  // v38.1：桌機是「往左推」的 non-modal drawer，月曆本身還能互動、不鎖背景捲動
  // （鎖了使用者就翻不了月/點不了其他天，跟 non-modal 的初衷矛盾）；只有手機
  // 版貼底 Modal sheet 才需要鎖住 body 捲動，靠 CSS media query 加這個 class
  // 沒有意義（JS 不知道現在是哪個斷點），改成直接判斷視窗寬度。
  document.body.classList.add('day-events-open');
  if (window.matchMedia('(max-width: 720px)').matches) {
    document.body.style.overflow = 'hidden';
  }
  gtag('event', 'events_day_more_open', { date_key: key, count: dayEvents.length, device: getDeviceType() });
}

function closeDayEventsPanel(e, methodOverride) {
  // 跟 changelog 同一套判斷：有事件物件、且點的是 overlay 本身（背景），才算 backdrop
  // click；沒有事件物件（直接呼叫，例如選完活動自動關閉）就不用檢查。
  // v38.1：桌機 overlay 已經是 pointer-events:none（見 events.css），點月曆不會
  // 冒泡到這裡，這個判斷式現在實質只會在手機版的遮罩 click 上成立。
  if (e && e.target !== document.getElementById('dayEventsOverlay')) return;
  document.getElementById('dayEventsOverlay').classList.remove('show');
  document.body.classList.remove('day-events-open');
  document.body.style.overflow = '';
  // v39.3：新增 methodOverride，讓 setView() 切到「總覽」收起 drawer 時可以標記
  // 成 view_switch，不要落進預設的 'other'（那個是給「選完活動自動關閉」這種
  // 情境用的），兩種都算程式自動觸發但成因不同，GA 上分得出來比較有用。
  const method = methodOverride || (e ? 'backdrop_click' : 'other');
  gtag('event', 'events_day_more_close', { method, device: getDeviceType() });
}

document.getElementById('dayEventsOverlay').addEventListener('click', closeDayEventsPanel);
document.getElementById('dayEventsClose').addEventListener('click', () => closeDayEventsPanel());

// v38.2：drawer 頂部要跟月曆頂部切齊（見 events.css 的 --events-header-h），
// 也就是「header + 訪客計數 banner 目前實際佔用的高度」。頁面本身不整頁捲動
// （見 .events-page-body 的說明，真正捲動的是內部的 .events-day-grid），
// 所以 main 相對視窗的 top 值本來就等於這段高度，量一次就好；但訪客計數
// banner 是非同步出現的（visitor.js 抓到人數才把 display:none 打開），
// 高度會晚一步變化，跟 index.html 的 --top-bar-height 是同一個坑，同樣改用
// ResizeObserver 盯著 header／banner 本身的尺寸變化，不用另外為每個成因
// （banner 出現、字型換行、螢幕旋轉…）各自補監聽。
function syncEventsPanelOffset() {
  const main = document.querySelector('.events-page-body');
  if (!main) return;
  const top = Math.max(0, main.getBoundingClientRect().top);
  document.documentElement.style.setProperty('--events-header-h', `${top}px`);
}

if (window.ResizeObserver) {
  const headerOffsetObserver = new ResizeObserver(() => syncEventsPanelOffset());
  document.querySelectorAll('header, .visitor-banner').forEach((el) => headerOffsetObserver.observe(el));
} else {
  window.addEventListener('resize', syncEventsPanelOffset);
}
syncEventsPanelOffset();

// ---------- 活動詳情 Modal ----------
// 視覺沿用機台詳情彈窗，id 換一組避免撞名，見 CLAUDE.md「活動詳情 Modal」

// image 欄位轉成統一的網址陣列，thumbnail／詳情輪播都從這裡取，不要各自再讀 ev.image 原始字串
function eventImages(ev) {
  return ev.image ? ev.image.split(',').map((s) => driveUrlToImage(s.trim())).filter(Boolean) : [];
}

// Thumbnail 只取第一張，跟首頁卡片縮圖同慣例
function eventThumbUrl(ev) {
  return eventImages(ev)[0] || '';
}

function eventDetailImageHtml(group) {
  const imgs = eventImages(group);
  if (imgs.length === 0) return '';
  // 包一層 .popup-img-wrap，跟機台 modal 同外觀，見 CLAUDE.md「活動詳情 Modal」
  if (imgs.length === 1) {
    return `<div class="popup-img-wrap"><img src="${imgs[0]}" class="popup-img" alt="${group.title}"></div>`;
  }
  // 多圖輪播沿用機台 modal 同一套 .carousel 元件，這裡沒有 lightbox 功能
  const cid = `event-carousel-${group.key}`;
  return `
    <div class="popup-img-wrap">
      <div class="carousel" id="${cid}" data-index="0" data-imgs='${JSON.stringify(imgs)}'>
        <div class="carousel-img-wrap">
          <img src="${imgs[0]}" class="popup-img carousel-img" alt="${group.title}">
        </div>
        <div class="carousel-controls">
          <button class="carousel-btn" data-carousel-action="prev" data-carousel-id="${cid}" aria-label="上一張圖片">&#8249;</button>
          <span class="carousel-counter">1 / ${imgs.length}</span>
          <button class="carousel-btn" data-carousel-action="next" data-carousel-id="${cid}" aria-label="下一張圖片">&#8250;</button>
        </div>
      </div>
    </div>`;
}

// 輪播事件委派掛在 document（modal 內容動態塞入 innerHTML，直接綁 listener 會失效）
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-carousel-action]');
  if (!btn) return;
  e.stopPropagation();
  const action = btn.getAttribute('data-carousel-action');
  gtag('event', 'events_carousel_nav', { direction: action, device: getDeviceType() });
  const id = btn.getAttribute('data-carousel-id');
  const el = document.getElementById(id);
  if (!el) return;
  const imgs = JSON.parse(el.getAttribute('data-imgs'));
  let idx = parseInt(el.getAttribute('data-index'), 10);
  idx = action === 'prev' ? (idx - 1 + imgs.length) % imgs.length : (idx + 1) % imgs.length;
  el.setAttribute('data-index', idx);
  el.querySelector('.carousel-img').src = imgs[idx];
  el.querySelector('.carousel-counter').textContent = `${idx + 1} / ${imgs.length}`;
});

function eventDetailNoteRow(ev) {
  if (!ev.note) return '';
  return `<div class="popup-addr">更多資訊：<a href="${ev.note.trim()}" target="_blank" rel="noopener" style="color:var(--fill-black);text-decoration:underline;">查看</a></div>`;
}

// 同一組有多個地點（台北／高雄同時開）時，標題／圖片／分類／期間只畫一份，
// 場地／地址／營業時間／更多資訊／Google Maps 連結這幾行改成用城市 tab 切換——
// 跟月曆橫幅、卡片一樣的邏輯：合併共通欄位，只有真的因地點而異的內容才分開。
function cityTabsHtml(group) {
  return `<div class="events-city-tabs" role="tablist" aria-label="活動地點">`
    + group.locations.map((loc, i) => `<button type="button" class="events-city-tab${i === 0 ? ' active' : ''}" `
      + `role="tab" aria-selected="${i === 0}" data-loc-index="${i}">📍 ${loc.city || loc.venue || `地點 ${i + 1}`}</button>`).join('')
    + `</div>`;
}

function locationSectionHtml(group, locIndex) {
  const loc = group.locations[locIndex];
  const addr = `${loc.city || ''}${loc.addr || ''}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || loc.venue || group.title)}`;
  return `
    <div class="modal-info-section">
      ${loc.venue ? `<div class="popup-addr">場地：${loc.venue}</div>` : ''}
      ${addr ? `<div class="popup-addr">地址：${addr}</div>` : ''}
      ${loc.hours ? `<div class="popup-addr">營業時間：${loc.hours}</div>` : ''}
      ${eventDetailNoteRow(loc)}
    </div>
    <div class="popup-actions">
      <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="popup-gmaps-link" id="eventDetailGmaps"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> 前往 Google Maps 查看 →</a>
      <button class="popup-share-btn" id="eventDetailShare">分享 <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-14 13.8-14 13.8-34t-13.8-34q-13.8-14-34.2-14-20.4 0-34.2 14-13.8 14-13.8 34t13.8 34q13.8 14 34.2 14Zm466-277.8q14-13.8 14-34.2 0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 14 34.2 14 13.8 34 13.8t34-13.8ZM648-216ZM216-480Zm432-264Z"/></svg></button>
    </div>`;
}

function bindLocationSectionEvents(group, locIndex, source) {
  const loc = group.locations[locIndex];
  document.getElementById('eventDetailGmaps').addEventListener('click', () => {
    gtag('event', 'gmaps_click', { machine_id: loc.id, source, device: getDeviceType() });
  });
  document.getElementById('eventDetailShare').addEventListener('click', () => shareEvent(group, source));
}

function openEventDetailModal(group, source = 'calendar_bar') {
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const multi = group.locations.length > 1;
  // 已結束的活動優先顯示「已結束」badge（跟拼貼卡片／清單卡片同一個判斷、
  // 同一套做法：class="ending-badge ended-badge" 沿用倒數 badge 外形，只覆蓋
  // 顏色），取代原本的倒數 badge，放在跟倒數 badge 一樣的位置
  // （.events-detail-badge-row，緊接在分類 badge 後面）。
  const ended = isGroupEnded(group);
  const endingBadge = ended ? '' : getEndingBadge(group.period);

  document.getElementById('eventDetailContent').innerHTML = `
    <div class="events-detail-badge-row">
      <div class="events-detail-type-badge" style="--bar-color:${color}">${group.category}</div>
      ${ended ? `<div class="ending-badge ended-badge">已結束</div>` : (endingBadge ? `<div class="ending-badge">${endingBadge}</div>` : '')}
    </div>
    <div class="modal-header">
      <div class="popup-title">${group.title}</div>
    </div>
    ${group.period ? `<div class="popup-limited">期間限定：${group.period}</div>` : ''}
    ${multi ? cityTabsHtml(group) : ''}
    <div id="eventDetailLocationSlot">${locationSectionHtml(group, 0)}</div>
    <div class="events-detail-image-wrap">
      ${eventDetailImageHtml(group)}
    </div>
  `;

  bindLocationSectionEvents(group, 0, source);

  if (multi) {
    document.querySelectorAll('#eventDetailContent .events-city-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const idx = Number(tab.dataset.locIndex);
        document.querySelectorAll('#eventDetailContent .events-city-tab').forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.getElementById('eventDetailLocationSlot').innerHTML = locationSectionHtml(group, idx);
        bindLocationSectionEvents(group, idx, source);
        gtag('event', 'events_city_tab_switch', { machine_id: group.locations[idx].id, source, device: getDeviceType() });
      });
    });
  }

  document.getElementById('eventDetailOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  gtag('event', 'events_detail_open', {
    event_id: group.locations.map((l) => l.id).join('+'),
    location_count: group.locations.length,
    source, device: getDeviceType(),
  });
}

function closeEventDetailModal(e) {
  // 跟 grid-modal／changelog 同一套判斷：有事件物件、且點的是 overlay 本身
  // （背景），才算 backdrop click；X 按鈕直接呼叫、不傳事件物件。
  if (e && e.target !== document.getElementById('eventDetailOverlay')) return;
  document.getElementById('eventDetailOverlay').classList.remove('show');
  // 不能無條件清空 body 捲動鎖定，理由見 CLAUDE.md「當日活動清單（drawer）：non-modal 設計」
  const dayPanelStillLocked = document.body.classList.contains('day-events-open')
    && window.matchMedia('(max-width: 720px)').matches;
  document.body.style.overflow = dayPanelStillLocked ? 'hidden' : '';
  state.selectedGroupKey = null;
  renderAll();
  gtag('event', 'events_detail_close', { method: e ? 'backdrop_click' : 'x_button', device: getDeviceType() });
}

document.getElementById('eventDetailOverlay').addEventListener('click', closeEventDetailModal);
document.getElementById('eventDetailClose').addEventListener('click', () => closeEventDetailModal());

function shareEvent(group, source) {
  // 分享連結目前沒有讀取 ?event= 還原畫面的邏輯（跟原本一樣，這部分不在這次
  // 改動範圍內），多地點時先固定帶第一個地點的 id，維持跟原本單地點一致的
  // 網址格式，不擴大改動範圍。
  const primary = group.locations[0];
  const url = `${window.location.origin}${window.location.pathname}?event=${encodeURIComponent(primary.id)}`;
  gtag('event', 'events_share_click', {
    event_id: group.locations.map((l) => l.id).join('+'),
    source, device: getDeviceType(),
  });
  if (navigator.share) {
    navigator.share({ title: group.title, url });
  } else {
    navigator.clipboard.writeText(url).then(() => showEventToast('已複製連結！'));
  }
}

function showEventToast(msg) {
  const t = document.getElementById('share-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ---------- 掛載 ----------

document.getElementById('eventsPrevMonth').addEventListener('click', () => {
  gtag('event', 'events_month_nav', { direction: 'prev', device: getDeviceType() });
  shiftMonth(-1);
});
document.getElementById('eventsNextMonth').addEventListener('click', () => {
  gtag('event', 'events_month_nav', { direction: 'next', device: getDeviceType() });
  shiftMonth(1);
});
document.querySelectorAll('#eventsViewTabs .view-btn').forEach((tab) => {
  tab.addEventListener('click', () => setView(tab.dataset.view));
});
document.querySelectorAll('#eventsCollageLayoutToggle .collage-layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => setCollageLayout(btn.dataset.layout));
});

// ---------- 搜尋框（v37，元件沿用 index.html／main.js 的 .search-box 邏輯：
// 桌機／手機兩份 input 互相同步值＋清除鈕顯示狀態，輸入即觸發重新渲染，
// GA 事件命名比照 filterWidget／sortWidget 已經在用的 'events_' 前綴）。 ----------
let eventsSearchTrackTimer;
function trackEventsSearch(kw) {
  clearTimeout(eventsSearchTrackTimer);
  if (kw.length < 2) return;
  eventsSearchTrackTimer = setTimeout(() => {
    gtag('event', 'events_search', { search_term: kw, device: getDeviceType() });
  }, 800);
}

function setEventsSearchKeyword(value) {
  eventsSearchKeyword = value;
  document.getElementById('eventsSearchInput').value = value;
  document.getElementById('eventsSearchInputMobile').value = value;
  document.getElementById('eventsClearSearch').style.display = value ? 'block' : 'none';
  document.getElementById('eventsClearSearchMobile').style.display = value ? 'block' : 'none';
  renderAll();
}

document.getElementById('eventsSearchInput').addEventListener('focus', function () {
  gtag('event', 'search_box_focus', { source: 'events_desktop_toolbar', device: getDeviceType() });
});
document.getElementById('eventsSearchInput').addEventListener('input', function () {
  trackEventsSearch(this.value.trim().toLowerCase());
  setEventsSearchKeyword(this.value);
});

document.getElementById('eventsSearchInputMobile').addEventListener('focus', function () {
  gtag('event', 'search_box_focus', { source: 'events_mobile_toolbar', device: getDeviceType() });
});
document.getElementById('eventsSearchInputMobile').addEventListener('input', function () {
  trackEventsSearch(this.value.trim().toLowerCase());
  setEventsSearchKeyword(this.value);
});

document.getElementById('eventsClearSearch').addEventListener('click', function () {
  setEventsSearchKeyword('');
  gtag('event', 'search_clear', { source: 'events_desktop_toolbar', device: getDeviceType() });
});
document.getElementById('eventsClearSearchMobile').addEventListener('click', function () {
  setEventsSearchKeyword('');
  gtag('event', 'search_clear', { source: 'events_mobile_toolbar', device: getDeviceType() });
});

(async function initEventsPage() {
  await loadEvents();
  filterWidget.render();
  sortWidget.render(document.getElementById('eventsFilterBar'));
  updateCollageLayoutBtns(); // 套用初始選中狀態（預設 'grid'）到兩顆按鈕的 .active
  renderAll();
  initEventsTopBarScroll(); // v40：手機版滑動隱藏/顯示 #eventsTopBar
  gtag('event', 'events_page_view', { device: getDeviceType() });
})();