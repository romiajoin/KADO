// events.js — 活動行事曆頁面邏輯（events.html 專用）

import { getDeviceType } from './utils.js';
import { getEndingBadge } from './utils.js';
import { TW_CITY_ORDER } from './utils.js';
import { haversineKm } from './utils.js';
import { driveUrlToImage } from './utils.js';
import { EVENT_CATEGORIES, loadEvents, allEvents } from './events-data.js';
import { loadMachines, allMachines } from './machines-data.js';
import { findRelatedMachines, relatedMachineTypesForGroup } from './event-match.js';
import { createFilterWidget } from './filter-widget.js';
import { createSortWidget } from './sort-widget.js';
import { initEventsTopBarScroll, resetEventsTopBarScrollState } from './events-scroll.js';

const state = {
  month: startOfMonth(new Date()),
  selectedGroupKey: null,
  expandedWeeks: new Set(),

  view: 'collage',
  collageLayout: 'grid',
};

const eventsFilterState = { category: [], ip: [], city: [] };
const eventsTimeFilter = { ongoingOnly: false };
const eventsMachineFilter = { onlyWithMachines: false };

function isMobileFilterLayout() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// day-events-panel 網址同步用：內部 dayKey 是「YYYY-M-D」（月份 0-indexed、不補零，
// 沿用 dateKey() 格式），對外網址參數改用一般人看得懂的 ISO 格式「YYYY-MM-DD」，
// 兩邊各自轉換，不互相污染。
let currentOpenDayKey = null; // 目前 day-events-panel 開著的是哪一天（內部 dayKey 格式），沒開就是 null

function dayKeyToIso(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isoToDayKey(iso) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso || '');
  if (!match) return null;
  const [, yStr, mStr, dStr] = match;
  return `${Number(yStr)}-${Number(mStr) - 1}-${Number(dStr)}`;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return allEvents.filter((ev) => (selectedCategories.length === 0 || selectedCategories.includes(ev.category))
      // 活動可能有多個 IP 聯名（見 events-data.js 的 characters），篩選用「有勾選的 IP 裡，
      // 只要活動的 characters 陣列命中任一個」的 OR 邏輯，符合多選篩選的直覺
      && (selectedIps.length === 0 || selectedIps.some((ip) => (ev.characters || []).includes(ip)))
      && (selectedCities.length === 0 || selectedCities.includes(ev.city))
      // 時間篩選：「今天有的活動」= start <= 今天 && end >= 今天
      && (!eventsTimeFilter.ongoingOnly || (ev.start <= today && ev.end >= today))
      // 機台篩選：檢查是否有相關機台
      && (!eventsMachineFilter.onlyWithMachines || findRelatedMachines(ev, allMachines, [ev]).length > 0)
      && (!kw
        || (ev.title || '').toLowerCase().includes(kw)
        || (ev.characters || []).some((c) => c.toLowerCase().includes(kw))
        || (ev.city || '').toLowerCase().includes(kw)
        || (ev.venue || '').toLowerCase().includes(kw)));
}

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

    if (ev.start < group.start) group.start = ev.start;
    if (ev.end > group.end) group.end = ev.end;
    group.locations.push(ev);
  });
  return Array.from(map.values());
}

function visibleGroups() {
  return buildGroups(visibleEvents());
}

function findGroupByKey(key) {
  return buildGroups(allEvents).find((g) => g.key === key);
}

function eventsForDate(date) {
  return visibleGroups().filter((g) => isWithin(date, g));
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_VISIBLE_ROWS = 5;

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startPad = (firstDay.getDay() + 6) % 7;
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

function weekEventBars(week, groups) {
  const visibleCols = [];
  week.forEach((d, i) => { if (d) visibleCols.push(i); });
  if (!visibleCols.length) return [];

  const bars = [];
  groups.forEach((group) => {
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

  bars.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);

  const rowLastCol = [];
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

  const multiBadge = group.locations.length > 1
    ? `<span class="events-bar-multi-badge"><svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="currentColor"><path d="M455.5-123.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-388q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : '';
  return `<button type="button" class="events-bar${isSelected ? ' selected' : ''}" style="${style}" `
    + `data-group-key="${group.key}">`
    + `<span class="events-bar-cat">${group.category}</span>`
    + `<span class="events-bar-title">${group.title}</span>`
    + multiBadge
    + `</button>`;
}

function renderWeekRow(week, today, weekKey, groups) {
  const dayNumsHtml = week.map((date) => {
    if (!date) return '<div class="events-day-num-cell pad"></div>';
    const isToday = sameDay(date, today);
    // 整個月曆只算一次 visibleGroups()（見 renderEventsCalendar()），這裡
    // 從已經算好的 groups 篩選當天涵蓋的活動，不再各自重新呼叫
    // visibleGroups()／eventsForDate()——月曆一個月要渲染 5~6 週、每週 7
    // 天，各自重算一次篩選鏈會被重複執行 40~50 次，機台篩選開著時每次還
    // 要對每個活動比對相關機台，點擊篩選會有明顯卡頓（v34 修正）。
    const dayEvents = groups.filter((g) => isWithin(date, g));
    const hasEvents = dayEvents.length > 0;

    const attrs = hasEvents
      ? ` data-day-key="${dateKey(date)}"`
      : '';
    return `<div class="events-day-num-cell${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}"${attrs}>`
      + `<span class="events-day-num${hasEvents ? ' clickable' : ''}">${date.getDate()}</span>`
      + `</div>`;
  }).join('');

  const bars = weekEventBars(week, groups);
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
    `${state.month.getFullYear()}/${String(state.month.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('eventsPrevMonth').disabled = state.month.getTime() <= MIN_MONTH.getTime();

  const weekdayRow = document.getElementById('eventsWeekdayRow');
  weekdayRow.innerHTML = WEEKDAY_LABELS.map((l) => `<div>${l}</div>`).join('');

  const today = new Date();
  const weeks = chunkIntoWeeks(buildMonthCells(state.month));
  const monthKey = `${state.month.getFullYear()}-${state.month.getMonth()}`;
  const grid = document.getElementById('eventsDayGrid');
  // 整個月曆只算一次 visibleGroups()，往下傳給每一週/每一天共用，見
  // renderWeekRow()／weekEventBars() 內的說明（v34 效能修正）。
  const groups = visibleGroups();
  // 週列包一層 .events-weeks（自然高度，不參與 .events-day-grid 的 flex:1
  // 撐高），避免沒有活動、週數少時，剩餘空白被最後一週的樣式一起蓋到、
  // 看起來像無限延伸到卡片底部，見 events.css 「.events-weeks」的說明。
  grid.innerHTML = `<div class="events-weeks">${weeks.map((week, i) => renderWeekRow(week, today, `${monthKey}-${i}`, groups)).join('')}</div>`;

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

    if (isDesktopPointer()) {
      cell.addEventListener('mouseenter', () => onDayCellHoverEnter(cell));
      cell.addEventListener('mouseleave', () => onDayCellHoverLeave(cell));
    }
  });
}

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

// 三種卡片（events-card／collage-card／loc-card-grid）共用：有機台就顯示「抽卡機／相卡機」type-badge，
// 直接沿用機台本身的徽章樣式（見 style.css .type-badge），不用另外設計新 pill；沒有機台就不顯示任何東西。
// icon 比照 js/grid.js／js/map.js／js/main.js 的 type-badge 寫法，同一套 16px SVG
const MACHINE_TYPE_BADGE_ICON = {
  '相卡機': '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-264q72 0 120-49t48-119q0-69-48-118.5T480-600q-72 0-120 49.5T312-432q0 70 48 119t120 49Zm0-72q-42 0-69-27t-27-68q0-40 27-68.5t69-28.5q42 0 69 28.5t27 68.5q0 41-27 68t-69 27ZM168-144q-29 0-50.5-21.5T96-216v-432q0-29 21.5-50.5T168-720h120l50-67q11-14 26-21.5t32-7.5h168q17 0 32 7.5t26 21.5l50 67h120q30 0 51 21.5t21 50.5v432q0 29-21 50.5T792-144H168Z"/></svg>',
  '抽卡機': '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m612-404 31-107q3-11-1-22t-14-18l-93-63q-8-5-16.5-2T508-604l-31 107q-3 11 .5 22t13.5 18l93 63q8 5 17 2t11-12ZM168-222l-30-15q-28-13-38-40t3-55l65-140v250Zm148 78q-31 0-53.5-20.5T240-216v-288l134 360h-58Zm206-4q-31 11-56-1t-36-43L259-660q-11-31 .5-56.5T302-753l294-107q31-11 56 .5t36 42.5l172 472q11 31-.5 56T817-253L522-148Z"/></svg>',
};
function machineTypeBadgesHtml(group) {
  const types = relatedMachineTypesForGroup(group, allMachines);
  if (!types.size) return '';
  return ['抽卡機', '相卡機']
    .filter((t) => types.has(t))
    .map((t) => `<span class="type-badge ${t === '相卡機' ? 'photocard' : 'gacha'}">${MACHINE_TYPE_BADGE_ICON[t]} ${t}</span>`)
    .join('');
}

function eventGroupCardHtml(group) {
  const badge = getEndingBadge(group.period);
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const isSelected = group.key === state.selectedGroupKey;
  const multi = group.locations.length > 1;

  const venueLabel = multi
    ? [...new Set(group.locations.map((l) => l.city).filter(Boolean))].join('・')
    : `${group.locations[0].city || ''} ${group.locations[0].venue || ''}`;
  const multiPill = multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M455.5-123.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-388q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : '';

  return `
    <div class="events-card${isSelected ? ' selected' : ''}" data-group-key="${group.key}">
      <div class="events-card-body">
        <div class="events-card-pills">
          <span class="events-bar-cat" style="--bar-color:${color}">${group.category}</span>
          ${badge ? `<span class="ending-badge">${badge}</span>` : ''}
          ${multiPill}
          ${machineTypeBadgesHtml(group)}
        </div>
        <div class="events-card-title">${group.title}</div>
        <div class="events-card-venue">${venueLabel}</div>
        <div class="events-card-period">${group.period}</div>
      </div>
    </div>`;
}

function syncEventsCount() {
  const badge = document.getElementById('eventsCountBadge');
  if (badge) badge.textContent = visibleGroups().length;
}

// 快速篩選：今日活動 & 有抽卡／相卡機。跟分類/作品/縣市 pill 共用 .filter-pill
// 視覺樣式，但這兩顆沒有下拉面板，純粹點擊 toggle active（再點一次變回未選取＝clear），
// 用 button 自己的 classList 當狀態來源，不用額外的 checked 屬性。
function initQuickFilters() {
  const ongoingPill = document.getElementById('eventsTimeFilterPill');
  const machinePill = document.getElementById('eventsMachineFilterPill');
  
  if (ongoingPill) {
    ongoingPill.addEventListener('click', () => {
      eventsTimeFilter.ongoingOnly = !eventsTimeFilter.ongoingOnly;
      renderQuickFilters();
      renderAll();
      eventsSyncSearchUrl();
      gtag('event', 'events_quick_filter_toggle', { filter_type: 'ongoing_only', filter_state: eventsTimeFilter.ongoingOnly ? 'on' : 'off', device: getDeviceType() });
    });
  }
  
  if (machinePill) {
    machinePill.addEventListener('click', () => {
      eventsMachineFilter.onlyWithMachines = !eventsMachineFilter.onlyWithMachines;
      renderQuickFilters();
      renderAll();
      eventsSyncSearchUrl();
      gtag('event', 'events_quick_filter_toggle', { filter_type: 'has_related_machine', filter_state: eventsMachineFilter.onlyWithMachines ? 'on' : 'off', device: getDeviceType() });
    });
  }
}

function renderQuickFilters() {
  const ongoingPill = document.getElementById('eventsTimeFilterPill');
  const machinePill = document.getElementById('eventsMachineFilterPill');
  
  if (ongoingPill) {
    ongoingPill.classList.toggle('active', eventsTimeFilter.ongoingOnly);
    ongoingPill.setAttribute('aria-pressed', String(eventsTimeFilter.ongoingOnly));
  }
  if (machinePill) {
    machinePill.classList.toggle('active', eventsMachineFilter.onlyWithMachines);
    machinePill.setAttribute('aria-pressed', String(eventsMachineFilter.onlyWithMachines));
  }
}

// 把靜態 HTML 裡的 .quick-filter-group 搬進 #eventsFilterBar，插在篩選 pill（filterWidget
// 畫的 .filter-scroll）跟排序按鈕（sortWidget 動態 append 的 .sort-group）中間；因為
// sortWidget.render() 是把 .sort-group 直接 append 到 #eventsFilterBar 尾端，所以這裡要在
// sortWidget.render() 之前呼叫，讓 quick-filter-group 先卡位（此時 .sort-group 還不存在，
// 直接 appendChild 到尾端＝pills 後面），sortWidget 再把 .sort-group append 上去就會排在最後。
// filterWidget.render() 之後也要重新呼叫一次：它會清空 #eventsFilterBar 整個 innerHTML
// 重畫 pill，把之前搬進來的 quick-filter-group 一併清掉，需要再搬一次。
function positionQuickFilterGroup() {
  const quickFilterGroupEl = document.querySelector('.quick-filter-group');
  if (!quickFilterGroupEl) return;
  const bar = document.getElementById('eventsFilterBar');
  if (!bar) return;
  // 一定要搬進 .filter-scroll 裡面，跟類型/作品/縣市 pill 同一個可橫向捲動
  // 的容器，手機版（<=900px）才能跟著一起左右滑動；放在 .filter-scroll
  // 外面（例如直接塞進 #eventsFilterBar 當 .sort-group 的 sibling）寬度
  // 不夠時會把整排擠出畫面，這是實測回報過的 bug，之後不要改回去。
  const scrollEl = bar.querySelector('.filter-scroll');
  if (scrollEl) {
    scrollEl.appendChild(quickFilterGroupEl);
  } else {
    bar.appendChild(quickFilterGroupEl);
  }
}

function renderAll() {
  syncEventsCount();
  if (state.view === 'collage') renderEventsCollage();
  else renderEventsCalendar();
}

function groupDistanceKm(group, userCoords) {
  if (!userCoords) return Infinity;
  const dists = group.locations
    .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number' && !Number.isNaN(l.lat) && !Number.isNaN(l.lng))
    .map((l) => haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng));
  return dists.length ? Math.min(...dists) : Infinity;
}

// v41：比照首頁（見 CLAUDE.md「排序系統」v41 條目）拿掉 end_date_desc、新增 start_date_asc。
// `today` 由呼叫端（collageGroups()）傳入，這裡不重算，避免 ongoing/ended 分組跟排序方向
// 用兩份「今天」算出來的結果在極端情況下（跨過午夜）對不起來
function compareGroupsBySort(a, b, sortKey, userCoords, today) {
  if (sortKey === 'distance_asc' || sortKey === 'distance_desc') {
    const dir = sortKey === 'distance_desc' ? -1 : 1;
    return (groupDistanceKm(a, userCoords) - groupDistanceKm(b, userCoords)) * dir;
  }
  if (sortKey === 'start_date_asc') {
    // 已開始（start <= today）優先權高於尚未開始（start > today）；
    // 已開始的組內依開始日新到舊（離今天最近排最前），尚未開始的組內依開始日由近到遠
    // （越快開始排最前）。ended（已結束）分組裡的 group 一定已經開始過，天然全部落在
    // 「已開始」這一支，不會混進「尚未開始」，不用另外處理
    const ga = a.start <= today ? 1 : 2;
    const gb = b.start <= today ? 1 : 2;
    if (ga !== gb) return ga - gb;
    return ga === 1 ? b.start - a.start : a.start - b.start;
  }
  // end_date_asc：ongoing／ended 兩個分組已經在 collageGroups() 分好，這裡只要在各自
  // 分組內用「離今天天數差絕對值」排序——ongoing 全部是未來/今天，效果等同「越快結束排越
  // 前面」；ended 全部是過去，效果等同「越接近今天結束的排越前面」，同一條算式通用兩種分組
  return Math.abs(a.end - today) - Math.abs(b.end - today);
}

function collageGroups() {

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ongoing = [];
  const ended = [];
  visibleGroups().forEach((g) => (g.end >= today ? ongoing : ended).push(g));
  const sortKey = sortWidget.getState();
  const userCoords = sortWidget.getUserCoords();
  const cmp = (a, b) => compareGroupsBySort(a, b, sortKey, userCoords, today);
  ongoing.sort(cmp);
  ended.sort(cmp);
  return [...ongoing, ...ended];
}

function isGroupEnded(group) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return group.end < today;
}

function collageCardHtml(group) {

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
        <div class="card-badge-group">
          <span class="type-badge" style="background:var(--fill-white);border:1px solid ${color};color:${color}">${group.category}</span>
          ${multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M455.5-123.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-388q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : ''}
          ${machineTypeBadgesHtml(group)}
        </div>
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

  return `<div class="empty-state">找不到符合篩選條件的活動 இдஇ</div>`;
}

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

// 卡片上只顯示 1 個代表作品 tag，剩下的收進「+N」——卡片是列表預覽，多個 IP 全部展開
// 會讓同一個 grid 裡卡片高度落差很大，破壞版面對齊，所以固定上限，完整清單留給詳情 Modal
// （見 locationSectionHtml() 的 characterChipsHtml()）。
const CARD_CHARACTER_LIMIT = 1;

// 一場活動可能有多個地點、每個地點的 characters 也可能不同，卡片要呈現「整場活動」的作品陣容，
// 所以把所有地點的 characters 攤平去重（保留第一次出現的順序，讓 Sheet 填的順序決定誰排前面）。
// 如果使用者當下有用 IP 篩選，優先把命中篩選的 IP 排到最前面，卡片才能一眼對上「為什麼這張卡片
// 會出現在篩選結果裡」，不用點進 Modal 確認。
function characterTagsForCard(group) {
  const all = [...new Set(group.locations.flatMap((l) => l.characters || []))];
  const selectedIps = eventsFilterState.ip;
  if (selectedIps.length === 0) return all;
  const matched = all.filter((c) => selectedIps.includes(c));
  const rest = all.filter((c) => !selectedIps.includes(c));
  return [...matched, ...rest];
}

function eventListCardHtml(group) {
  const cat = EVENT_CATEGORIES.find((c) => c.label === group.category);
  const color = cat ? cat.color : 'var(--fill-gray-64)';

  const ended = isGroupEnded(group);
  const badge = ended ? '' : getEndingBadge(group.period);
  const multi = group.locations.length > 1;
  const primary = group.locations[0];

  const cityTags = multi
    ? [...new Set(group.locations.map((l) => l.city).filter(Boolean))]
    : [primary.city].filter(Boolean);
  // 只顯示 1 個代表作品，其餘數量以「+N」合併顯示在同一個 pill 裡（而不是另外開一個 pill／
  // 文字），例如「美少女戰士 +4」，見 characterTagsForCard() 決定顯示哪個當代表
  const characters = characterTagsForCard(group);
  const characterMoreCount = characters.length - CARD_CHARACTER_LIMIT;
  const characterTag = characters.length
    ? `<span class="tag">${characters.slice(0, CARD_CHARACTER_LIMIT).join('、')}${characterMoreCount > 0 ? ` <span class="tag-more-text">+${characterMoreCount}</span>` : ''}</span>`
    : '';
  const tags = [
    characterTag,
    ...cityTags.map((c) => `<span class="tag">${c}</span>`),
    !multi && primary.venue ? `<span class="tag">${primary.venue}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="loc-card-grid${ended ? ' is-ended' : ''}" data-group-key="${group.key}">
      <div class="card-top">
        <div class="card-badge-row">
          <div class="card-badge-group">
            <div class="type-badge" style="background:var(--fill-white);border:1px solid ${color};color:${color}">${group.category}</div>
            ${multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M455.5-123.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-388q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : ''}
            ${machineTypeBadgesHtml(group)}
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
  // 整張卡片都可以點擊展開詳情，不再只限「詳情」按鈕；按鈕本身仍保留（視覺提示 + 冗餘點擊目標），
  // 用 stopPropagation 避免點按鈕時卡片的 click handler 又重複觸發一次同樣的動作。
  list.querySelectorAll('.loc-card-grid').forEach((card) => {
    card.classList.add('is-clickable');
    const key = card.dataset.groupKey;
    card.addEventListener('click', () => {
      openGroupFromKey(key, 'events_collage_list');
    });
    const btn = card.querySelector('.btn-expand');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openGroupFromKey(key, 'events_collage_list');
      });
    }
  });
}

function renderEventsCollage() {
  const groups = collageGroups();
  if (state.collageLayout === 'list') renderCollageList(groups);
  else renderCollageGrid(groups);
}

function applyCollageContainers() {
  document.getElementById('eventsCollageGrid').hidden = !(state.view === 'collage' && state.collageLayout === 'grid');
  document.getElementById('eventsCollageListWrap').hidden = !(state.view === 'collage' && state.collageLayout === 'list');
}

function setView(view) {
  if (state.view === view) return;

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

  const sortGroupEl = document.querySelector('#eventsFilterBar .sort-group');
  if (sortGroupEl) sortGroupEl.hidden = view !== 'collage';
  // 「今日活動」只在總覽（拼貼）檢視顯示；月曆檢視按日期瀏覽，這個篩選在
  // 該檢視下語意重複，比照 .sort-group 用 hidden 隱藏。「有抽卡 / 相卡機」
  // 兩個檢視都要顯示，不受這條影響。狀態本身不會被清掉，見 visibleEvents()
  // 篩選鏈裡 state.view === 'calendar' 的繞過判斷。
  const timeFilterPillEl = document.getElementById('eventsTimeFilterPill');
  if (timeFilterPillEl) timeFilterPillEl.hidden = view !== 'collage';
  applyCollageContainers();
  renderAll();

  resetEventsTopBarScrollState();
  gtag('event', 'events_view_switch', { view, device: getDeviceType() });
}

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

  resetEventsTopBarScrollState();
  gtag('event', 'events_collage_layout_switch', { layout, device: getDeviceType() });
}

function ipOptions() {
  // 一個活動可能有多個 IP（characters 陣列），選項要攤平全部活動的所有 IP 再去重，
  // 而不是只拿每個活動的第一個（character），不然篩選清單會漏掉沒排在第一位的 IP
  const uniq = [...new Set(allEvents.flatMap((ev) => ev.characters || []))];
  uniq.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  return uniq;
}

const filterWidget = createFilterWidget({
  config: [
    { key: 'category', label: '類型' },
    {
      // key 沿用 'ip'（GA filter_type 等既有分析參數值不變），只改顯示文字，比照首頁 filters.js
      key: 'ip',
      label: '作品',
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
  onChange: () => { renderAll(); eventsSyncSearchUrl(); }, // 篩選 pill 變動也要同步進網址列，見 eventsSyncSearchUrl()
  gaPrefix: 'events_filter',

  onTogglePanel: () => sortWidget.closeDesktopPanel(),
  onOpenSheet: () => sortWidget.closeMobileSheet(),
  onOutsideClose: () => sortWidget.closeDesktopPanel('outside_click'),
  onResizeClose: () => sortWidget.closeDesktopPanel(),
});

// v41：比照首頁排序調整（見 CLAUDE.md「排序系統」v41 條目），拿掉 end_date_desc、
// 新增 start_date_asc；理由跟規則兩邊共用，不再各自重複一次說明
const EVENTS_SORT_OPTIONS = [
  { key: 'end_date_asc', label1: '結束日', label2: '近到遠', text: '結束日：近到遠' },
  { key: 'start_date_asc', label1: '開始日', label2: '近到遠', text: '開始日：近到遠' },
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

function openGroupFromKey(key, source) {
  const group = findGroupByKey(key);
  if (!group) return;
  state.selectedGroupKey = key;
  renderAll();
  openEventDetailModal(group, source);
}

const MIN_MONTH = new Date(2026, 4, 1);

function shiftMonth(delta) {
  const next = new Date(state.month.getFullYear(), state.month.getMonth() + delta, 1);
  state.month = next < MIN_MONTH ? MIN_MONTH : next;
  renderAll();
}

function openDayEventsPanel(key) {
  currentOpenDayKey = key;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m, d);
  const dayEvents = eventsForDate(date);

  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const weekday = WEEKDAY_LABELS[(date.getDay() + 6) % 7];
  document.getElementById('dayEventsTitle').textContent = `${mm}/${dd}（${weekday}）・共 ${dayEvents.length} 場活動`;
  document.getElementById('dayEventsBody').innerHTML =
    `<div class="events-card-list">${dayEvents.map(eventGroupCardHtml).join('')}</div>`;
  document.getElementById('dayEventsBody').querySelectorAll('.events-card').forEach((card) => {
    card.addEventListener('click', () => {
      openGroupFromKey(card.dataset.groupKey, 'events_day_panel');

      document.getElementById('dayEventsBody').querySelectorAll('.events-card').forEach((c) => {
        c.classList.toggle('selected', c === card);
      });
    });
  });

  document.getElementById('dayEventsOverlay').classList.add('show');

  document.body.classList.add('day-events-open');
  if (window.matchMedia('(max-width: 720px)').matches) {
    document.body.style.overflow = 'hidden';
  }
  gtag('event', 'events_day_more_open', { date_key: key, count: dayEvents.length, device: getDeviceType() });
  eventsSyncSearchUrl(); // 網址列同步 ?day=，複製網址列就能分享「當天活動清單」這個狀態
}

function closeDayEventsPanel(e, methodOverride) {

  if (e && e.target !== document.getElementById('dayEventsOverlay')) return;
  document.getElementById('dayEventsOverlay').classList.remove('show');
  document.body.classList.remove('day-events-open');
  document.body.style.overflow = '';

  const method = methodOverride || (e ? 'backdrop_click' : 'other');
  gtag('event', 'events_day_more_close', { method, device: getDeviceType() });

  currentOpenDayKey = null;
  eventsSyncSearchUrl(); // 關閉面板後網址列的 ?day= 也要拿掉，不然重新整理會又自動彈開
}

document.getElementById('dayEventsOverlay').addEventListener('click', closeDayEventsPanel);
document.getElementById('dayEventsClose').addEventListener('click', () => closeDayEventsPanel());

function syncEventsPanelOffset() {
  const main = document.querySelector('.events-page-body');
  if (!main) return;

  const weekdayRow = document.getElementById('eventsWeekdayRow');
  const anchor = weekdayRow && !weekdayRow.hidden ? weekdayRow : main;
  const top = Math.max(0, anchor.getBoundingClientRect().top);
  document.documentElement.style.setProperty('--events-header-h', `${top}px`);
}

if (window.ResizeObserver) {
  const headerOffsetObserver = new ResizeObserver(() => syncEventsPanelOffset());
  document.querySelectorAll('header, .visitor-banner, #eventsWeekdayRow').forEach((el) => headerOffsetObserver.observe(el));
} else {
  window.addEventListener('resize', syncEventsPanelOffset);
}
syncEventsPanelOffset();

function eventImages(ev) {
  return ev.image ? ev.image.split(',').map((s) => driveUrlToImage(s.trim())).filter(Boolean) : [];
}

function eventThumbUrl(ev) {
  return eventImages(ev)[0] || '';
}

function eventDetailImageHtml(group) {
  const imgs = eventImages(group);
  if (imgs.length === 0) return '';

  if (imgs.length === 1) {
    return `<div class="popup-img-wrap"><img src="${imgs[0]}" class="popup-img" data-lightbox="${imgs[0]}" alt="${group.title}"></div>`;
  }

  const cid = `event-carousel-${group.key}`;
  return `
    <div class="popup-img-wrap">
      <div class="carousel" id="${cid}" data-index="0" data-imgs='${JSON.stringify(imgs)}'>
        <div class="carousel-img-wrap">
          <img src="${imgs[0]}" class="popup-img carousel-img" data-lightbox="${imgs[0]}" alt="${group.title}">
        </div>
        <div class="carousel-controls">
          <button class="carousel-btn" data-carousel-action="prev" data-carousel-id="${cid}" aria-label="上一張圖片">&#8249;</button>
          <span class="carousel-counter">1 / ${imgs.length}</span>
          <button class="carousel-btn" data-carousel-action="next" data-carousel-id="${cid}" aria-label="下一張圖片">&#8250;</button>
        </div>
      </div>
    </div>`;
}

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
  const navImg = el.querySelector('.carousel-img');
  navImg.src = imgs[idx];
  navImg.setAttribute('data-lightbox', imgs[idx]);
  el.querySelector('.carousel-counter').textContent = `${idx + 1} / ${imgs.length}`;
});

// 圖片放大 Lightbox：跟機台 modal（main.js openLightbox/closeLightbox）同一套互動，
// 差異是這裡不走 inline onclick + window 掛載，用跟本檔其他 overlay 一致的 addEventListener 綁定。
function openEventLightbox(src) {
  document.getElementById('eventLightboxImg').src = src;
  document.getElementById('eventLightbox').classList.add('show');
  // GA: events_lightbox_open（event_id 取目前開著的活動詳情對應的 group，沒有就是 null）
  const group = state.selectedGroupKey ? findGroupByKey(state.selectedGroupKey) : null;
  gtag('event', 'events_lightbox_open', {
    event_id: group ? group.locations.map((l) => l.id).join('+') : null,
    device: getDeviceType(),
  });
}
function closeEventLightbox() {
  document.getElementById('eventLightbox').classList.remove('show');
}
document.getElementById('eventLightbox').addEventListener('click', closeEventLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEventLightbox(); });

document.addEventListener('click', (e) => {
  const lb = e.target.closest('[data-lightbox]');
  if (!lb) return;
  openEventLightbox(lb.getAttribute('data-lightbox') || lb.src);
});

function eventDetailNoteRow(ev) {
  if (!ev.note) return '';
  return `<div class="popup-addr">更多資訊：<a href="${ev.note.trim()}" target="_blank" rel="noopener" style="color:var(--fill-black);text-decoration:underline;">查看</a></div>`;
}

function cityTabsHtml(group, activeIndex = 0) {
  return `<div class="events-city-tabs" role="tablist" aria-label="活動地點">`
    + group.locations.map((loc, i) => `<button type="button" class="events-city-tab${i === activeIndex ? ' active' : ''}" `
      + `role="tab" aria-selected="${i === activeIndex}" data-loc-index="${i}"> ${loc.city || loc.venue || `地點 ${i + 1}`}</button>`).join('')
    + `</div>`;
}

// 這個地點底下有哪些機台：用 event-match.js 的共用比對邏輯反查，
// 要傳完整的 group.locations 做消歧（見 findRelatedMachines 註解），不能只傳 loc 自己一筆。
function relatedMachinesHtml(loc, group) {
  const related = findRelatedMachines(loc, allMachines, group.locations);
  if (!related.length) return '';
  const items = related.map((m) => {
    const href = `/?id=${encodeURIComponent(m.permId || m.id)}`;
    // 作品（IP）欄是選填，機台沒填時退回顯示機台名稱，避免卡片空白
    const label = m.character || m.name;
    return `
      <a class="related-machine-item" href="${href}" target="_blank" rel="noopener" data-machine-id="${m.id}">
        <span class="type-badge ${m.type === '相卡機' ? 'photocard' : 'gacha'}">${MACHINE_TYPE_BADGE_ICON[m.type] || ''}</span>
        <span class="related-machine-name">${label}</span>
      </a>`;
  }).join('');
  // 橫向捲動卡片列，故意不放縮圖（多數機台本來就沒填圖片，見樣式比較討論）。
  // 左右箭頭給滑鼠使用者用（trackpad／觸控可以直接滑動）：按鈕本身固定渲染在 DOM 裡，
  // 顯示與否交給 CSS（events.css .related-machines-nav-btn，pointer:fine + has-overflow）
  // 和 initRelatedMachinesScroll() 判斷是否溢出，這裡先預設 prev 是 disabled（一開始捲在最左）。
  return `
    <div class="modal-info-section related-machines-section">
      <div class="related-machines-title">相關機台（${related.length}）</div>
      <div class="related-machines-wrap">
        <div class="related-machines-list">${items}</div>
        <button type="button" class="related-machines-nav-btn prev" data-nav="prev" aria-label="向左捲動相關機台" disabled><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" style="transform:scaleX(-1)"><path d="M535.85-480 364.92-650.92q-8.3-8.31-8.5-18.39-.19-10.07 8.5-18.77 8.7-8.69 18.58-8.69 9.88 0 18.58 8.69l185.77 185.77q4.61 4.62 6.92 10.35 2.31 5.73 2.31 11.96t-2.31 11.96q-2.31 5.73-6.92 10.35L402.08-271.92q-8.31 8.3-17.89 8-9.57-.31-18.27-9-8.69-8.7-8.69-18.58 0-9.88 8.69-18.58L535.85-480Z"/></svg></button>
        <button type="button" class="related-machines-nav-btn next" data-nav="next" aria-label="向右捲動相關機台"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M535.85-480 364.92-650.92q-8.3-8.31-8.5-18.39-.19-10.07 8.5-18.77 8.7-8.69 18.58-8.69 9.88 0 18.58 8.69l185.77 185.77q4.61 4.62 6.92 10.35 2.31 5.73 2.31 11.96t-2.31 11.96q-2.31 5.73-6.92 10.35L402.08-271.92q-8.31 8.3-17.89 8-9.57-.31-18.27-9-8.69-8.7-8.69-18.58 0-9.88 8.69-18.58L535.85-480Z"/></svg></button>
      </div>
    </div>`;
}

// 「相關機台」卡片列的左右箭頭：只處理滑鼠捲動 + 邊界 disabled 狀態，
// 顯示／隱藏交給 CSS（見 events.css .related-machines-nav-btn）。
// 每次 location section 重新渲染（初次開 modal／切換城市 tab）都要重跑一次，
// 所以掛在 bindLocationSectionEvents() 裡，跟其他綁定一起走。
function initRelatedMachinesScroll(loc, source) {
  const wrap = document.querySelector('#eventDetailLocationSlot .related-machines-wrap');
  if (!wrap) return;
  const list = wrap.querySelector('.related-machines-list');
  const prevBtn = wrap.querySelector('.related-machines-nav-btn.prev');
  const nextBtn = wrap.querySelector('.related-machines-nav-btn.next');
  if (!list || !prevBtn || !nextBtn) return;

  const updateState = () => {
    const hasOverflow = list.scrollWidth > list.clientWidth + 1;
    wrap.classList.toggle('has-overflow', hasOverflow);
    prevBtn.disabled = list.scrollLeft <= 0;
    nextBtn.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
  };

  list.addEventListener('scroll', updateState);
  // modal 剛塞進 DOM 時 scrollWidth 可能還沒算準，下一輪再量一次
  requestAnimationFrame(updateState);
  updateState();

  [prevBtn, nextBtn].forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.nav;
      const cardWidth = list.querySelector('.related-machine-item')?.getBoundingClientRect().width || 144;
      const step = (cardWidth + 12) * 2; // 一次滑兩張卡片，跟卡片間距（12px，見 events.css）對齊
      list.scrollBy({ left: dir === 'prev' ? -step : step, behavior: 'smooth' });
      // GA: related_machines_nav_click（滑鼠使用者點左右箭頭捲動「相關機台」卡片列）
      gtag('event', 'related_machines_nav_click', {
        direction: dir,
        event_id: loc.id,
        source,
        device: getDeviceType(),
      });
    });
  });
}

// Modal 裡「作品」預設攤開幾個名稱，超過的收進「+N 個作品」展開按鈕（見 characterChipsHtml()／
// bindLocationSectionEvents() 的 toggle 綁定）。
const MODAL_CHARACTER_LIMIT = 4;

// 活動可能有多個 IP 聯名，Modal 這裡維持跟原本單一 IP 一樣的「文字＋底線連結」呈現，
// 不做成 pill（pill 樣式留給 loc-card 那種摘要性質的地方，Modal 是完整資訊頁，用純文字
// 列表＋頓號分隔比較不會有「一堆色塊」的擁擠感）。數量少（<=4）全部攤開，數量多就把超過
// 的部分先包進 .character-chips-rest 隱藏、給一個「+N 個作品」的按鈕展開。
// 每個作品名稱各自可點擊（見 bindLocationSectionEvents()），點哪個就篩哪個 IP。
function characterChipsHtml(loc) {
  const characters = loc.characters || [];
  if (!characters.length) return '';
  const chipLink = (c) => `<button type="button" class="popup-character-link" data-character="${c}">${c}</button>`;
  const visible = characters.slice(0, MODAL_CHARACTER_LIMIT);
  const rest = characters.slice(MODAL_CHARACTER_LIMIT);
  const visibleHtml = visible.map(chipLink).join('、');
  // 收合時第 4 個作品後面不顯示任何符號（刻意不用「...」，避免看起來像被截斷/出錯）；
  // 展開後才補上跟其他作品之間一樣的「、」分隔——這個字元本身也要能切換顯示/隱藏，
  // 所以獨立包一個 span，預設用 [hidden] 藏起來，見下方 toggle 綁定
  const restHtml = rest.length
    ? `<span class="character-chips-sep" id="eventDetailCharacterSep" hidden>、</span><span class="character-chips-rest" id="eventDetailCharacterRest" hidden>${rest.map(chipLink).join('、')}</span>`
    : '';
  const toggle = rest.length
    ? ` <button type="button" class="character-chips-toggle" id="eventDetailCharacterToggle">+${rest.length} 個作品</button>` : '';
  return `<div class="popup-addr">作品：<span id="eventDetailCharacterChips">${visibleHtml}${restHtml}</span>${toggle}</div>`;
}

function locationSectionHtml(group, locIndex) {
  const loc = group.locations[locIndex];
  // loc.addr 有些資料本身已經包含縣市開頭（例如「臺北市中正區...」），
  // 這裡就不要再重複補一次 loc.city，避免變成「臺北市臺北市中正區...」
  const addr = (loc.addr && loc.city && loc.addr.startsWith(loc.city))
    ? loc.addr
    : `${loc.city || ''}${loc.addr || ''}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || loc.venue || group.title)}`;
  return `
    <div class="modal-info-section">
      ${loc.venue ? `<div class="popup-addr">場地：${loc.venue}</div>` : ''}
      ${addr ? `<div class="popup-addr">地址：${addr}</div>` : ''}
      ${characterChipsHtml(loc)}
      ${loc.hours ? `<div class="popup-addr">營業時間：${loc.hours}</div>` : ''}
      ${eventDetailNoteRow(loc)}
    </div>
    ${relatedMachinesHtml(loc, group)}
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
  // 點任一個「作品」chip：關掉詳情 Modal、切到總覽（列表能一次看到全部結果，月曆還要挑月份翻）、
  // 把該 IP 名稱塞進搜尋框篩出同 IP 所有活動，比照 app.html 機台詳情彈窗的 filterByCharacter()。
  // 一個地點可能有多個 IP（loc.characters），每個 chip 各自綁定，點哪個就篩哪個。
  document.querySelectorAll('#eventDetailCharacterChips .popup-character-link').forEach((btn) => {
    btn.addEventListener('click', () => filterEventsByCharacter(btn.dataset.character, loc.id, source));
  });
  // 「+N 個作品」展開／收合按鈕：超過 MODAL_CHARACTER_LIMIT 的作品名稱包在
  // .character-chips-rest 裡用 [hidden] 藏起來（見 characterChipsHtml()），這裡切換它
  const chipsToggle = document.getElementById('eventDetailCharacterToggle');
  if (chipsToggle) {
    chipsToggle.addEventListener('click', () => {
      const restEl = document.getElementById('eventDetailCharacterRest');
      const sepEl = document.getElementById('eventDetailCharacterSep');
      if (!restEl) return;
      restEl.hidden = !restEl.hidden;
      if (sepEl) sepEl.hidden = restEl.hidden;
      chipsToggle.textContent = restEl.hidden
        ? `+${(loc.characters || []).length - MODAL_CHARACTER_LIMIT} 個作品`
        : '收合';
      gtag('event', 'character_chips_toggle', {
        expanded: !restEl.hidden, event_id: loc.id, source, device: getDeviceType(),
      });
    });
  }
  // GA: related_machine_click（這個地點的「相關機台」卡片點回機台頁，見 relatedMachinesHtml()）
  document.querySelectorAll('#eventDetailLocationSlot .related-machine-item').forEach((el) => {
    el.addEventListener('click', () => {
      gtag('event', 'related_machine_click', {
        machine_id: el.dataset.machineId,
        event_id: loc.id,
        source,
        device: getDeviceType(),
      });
    });
  });
  // 左右箭頭捲動（滑鼠使用者用，見 relatedMachinesHtml()／initRelatedMachinesScroll() 註解）
  initRelatedMachinesScroll(loc, source);
}

// 記著目前開著哪個活動詳情 Modal（哪個 group／哪個城市 tab），只給 loadMachines() 晚到時
// 補畫「相關機台」用（見 initEventsPage）；Modal 關閉時清空，避免補畫到已經關掉的內容。
let openModalState = null;

function openEventDetailModal(group, source = 'calendar_bar', initialLocIndex = 0) {
  const color = EVENT_CATEGORIES.find((c) => c.label === group.category)?.color || 'var(--fill-gray)';
  const multi = group.locations.length > 1;
  const startIdx = (initialLocIndex >= 0 && initialLocIndex < group.locations.length) ? initialLocIndex : 0;

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
    ${multi ? cityTabsHtml(group, startIdx) : ''}
    <div id="eventDetailLocationSlot">${locationSectionHtml(group, startIdx)}</div>
    <div class="events-detail-image-wrap">
      ${eventDetailImageHtml(group)}
    </div>
  `;

  bindLocationSectionEvents(group, startIdx, source);
  openModalState = { group, idx: startIdx, source };

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
        openModalState = { group, idx, source };
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

  if (e && e.target !== document.getElementById('eventDetailOverlay')) return;
  document.getElementById('eventDetailOverlay').classList.remove('show');

  const dayPanelStillLocked = document.body.classList.contains('day-events-open')
    && window.matchMedia('(max-width: 720px)').matches;
  document.body.style.overflow = dayPanelStillLocked ? 'hidden' : '';
  state.selectedGroupKey = null;
  openModalState = null;
  renderAll();
  gtag('event', 'events_detail_close', { method: e ? 'backdrop_click' : 'x_button', device: getDeviceType() });
}

document.getElementById('eventDetailOverlay').addEventListener('click', closeEventDetailModal);
document.getElementById('eventDetailClose').addEventListener('click', () => closeEventDetailModal());

function shareEvent(group, source) {

  const primary = group.locations[0];
  // 分享出去的連結走 /api/event-share?id=xxx，讓 LINE/Threads 等平台的爬蟲能讀到
  // 這個活動對應的 og:image（指定分享圖，沒填則用活動預設圖，見 api/event-share.js）；
  // 真人點進來後，那支 function 會立刻導回這裡（/events.html?event=xxx），使用體驗不變。
  // 網址帶永久ID（O欄，見「分享連結永久ID機制（活動版）」），不是 A 欄流水號——
  // 跟機台 shareLocation() 同一個理由，A 欄被管理者重新編號後舊連結不該連到別的活動。
  // GA 的 event_id 維持用 A 欄 id（join 多地點），跟 events_detail_open 等其他事件的
  // event_id 格式一致，方便在 GA4 後台串同一組活動的完整互動路徑，不因這次改動而切格式。
  // 帶上 from，讓 /api/event-share 知道這個分享按鈕是從哪個入口點開的（總覽·拼貼格／
  // 總覽·列表／月曆 events-bar／月曆 day-events-panel 的 events-card），server 端會依此：
  //   1. 從活動試算表 N 欄挑對應那一張分享圖（見 api/event-share.js 的 pickShareImage()）
  //   2. 決定真人點開後背景要還原成拼貼格／列表／月曆（見 backgroundParamsFor()）
  const FROM_BY_SOURCE = {
    events_collage_grid: 'grid',
    events_collage_list: 'list',
    calendar_bar: 'bar',
    events_day_panel: 'card',
  };
  const from = FROM_BY_SOURCE[source] || 'grid';
  const url = `${window.location.origin}/api/event-share?id=${encodeURIComponent(primary.permId)}&from=${from}`;
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

document.getElementById('eventsPrevMonth').addEventListener('click', () => {
  gtag('event', 'events_month_nav', { direction: 'prev', device: getDeviceType() });
  shiftMonth(-1);
});
document.getElementById('eventsNextMonth').addEventListener('click', () => {
  gtag('event', 'events_month_nav', { direction: 'next', device: getDeviceType() });
  shiftMonth(1);
});
document.querySelectorAll('#eventsViewTabs .view-btn').forEach((tab) => {
  // 使用者手動切換月曆／總覽才同步網址列（比照 app.html 機台版 btnGrid/btnMap 的做法）：
  // 頁面初始化、?event=／?q= 分享連結還原時都是直接呼叫 setView()，不經過這個 click
  // handler，不會太早把網址列洗掉。
  tab.addEventListener('click', () => { setView(tab.dataset.view); eventsSyncSearchUrl(); });
});
document.querySelectorAll('#eventsCollageLayoutToggle .collage-layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => { setCollageLayout(btn.dataset.layout); eventsSyncSearchUrl(); });
});

let eventsSearchTrackTimer;
function trackEventsSearch(kw) {
  clearTimeout(eventsSearchTrackTimer);
  if (kw.length < 2) return;
  eventsSearchTrackTimer = setTimeout(() => {
    gtag('event', 'events_search', { search_term: kw, device: getDeviceType() });
  }, 800);
}

// 讓網址列本身就是「目前搜尋結果」的分享連結：搜尋關鍵字／篩選條件／目前是月曆還是總覽
// 檢視，一有變動就同步寫回網址列（history.replaceState，不新增瀏覽紀錄、不觸發真正的頁面
// 跳轉），使用者不用另外點分享按鈕，直接複製網址列就是當下這個搜尋結果的連結，比照首頁
// main.js 的 syncSearchUrl()。
// 只從搜尋框輸入／篩選 pill 變動呼叫（setEventsSearchKeyword()／filterWidget 的
// onChange），刻意不放進 setView()／setCollageLayout()：跟首頁同樣的理由，
// initEventsPage() 裡 ?event= 深連結／?q= 搜尋結果分享連結的還原要先跑完，這裡才能
// 安全地覆寫網址列，不然會在參數還沒被讀取前就把它洗掉。
function eventsSyncSearchUrl() {
  const kw = eventsSearchKeyword.trim();
  const params = new URLSearchParams();
  if (kw) params.set('q', kw);
  ['category', 'ip', 'city'].forEach((key) => {
    if (eventsFilterState[key].length > 0) params.set(key, eventsFilterState[key].join(','));
  });
  if (state.view === 'calendar') params.set('view', 'calendar');
  if (state.view === 'collage' && state.collageLayout === 'list') params.set('layout', 'list');
  if (currentOpenDayKey) params.set('day', dayKeyToIso(currentOpenDayKey));

  const query = params.toString();
  const newUrl = window.location.pathname + (query ? `?${query}` : '');
  history.replaceState(null, '', newUrl);
}

function setEventsSearchKeyword(value) {
  eventsSearchKeyword = value;
  document.getElementById('eventsSearchInput').value = value;
  document.getElementById('eventsSearchInputMobile').value = value;
  document.getElementById('eventsClearSearch').style.display = value ? 'block' : 'none';
  document.getElementById('eventsClearSearchMobile').style.display = value ? 'block' : 'none';
  renderAll();
  eventsSyncSearchUrl(); // 網址列即時反映目前的搜尋/篩選狀態，複製網址列就等於分享這個結果
}

// 點活動詳情 Modal 裡的「作品」標籤觸發（見 bindLocationSectionEvents()）：關掉 Modal、
// 把作品名稱塞進搜尋框篩出同作品所有活動。刻意不強制切換檢視——月曆模式點進來應該留在
// 月曆（篩選後的月曆會只剩符合的橫幅），總覽模式點進來留在總覽，比照 app.html 地圖模式
// 點作品標籤會留在地圖、不會被推去列表 view 的邏輯。
function filterEventsByCharacter(character, eventId, source) {
  closeEventDetailModal();
  setEventsSearchKeyword(character); // 內部已經會 renderAll() + eventsSyncSearchUrl()
  // GA: character_tag_click（沿用跟 app.html 機台詳情彈窗同一個事件名稱，source 用來分辨觸發頁面/位置）
  gtag('event', 'character_tag_click', {
    character,
    event_id: eventId,
    source,
    device: getDeviceType(),
  });
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
  // 只等活動本身的 sheet，先讓月曆／總覽畫面能開始畫；機台資料（另一份 Google Sheet）
  // 只用來算卡片上的「抽卡機/相卡機」徽章跟 Modal 裡的「相關機台」清單，不影響活動列表
  // 本身能不能顯示，不該讓整頁初始畫面多等一份 sheet 才出現（原本兩份 await Promise.all
  // 綁在一起是 v33 造成頁面變慢的主因，見 machineTypeBadgesHtml()／relatedMachinesHtml()）。
  initQuickFilters();
  await loadEvents();
  filterWidget.render();
  positionQuickFilterGroup();
  sortWidget.render(document.getElementById('eventsFilterBar'));
  updateCollageLayoutBtns();
  renderAll();
  initEventsTopBarScroll();
  gtag('event', 'events_page_view', { device: getDeviceType() });

  // 機台資料改成背景載入，載完再補畫一次：卡片徽章靠 renderAll() 重跑就會補上；
  // 如果使用者這時候已經打開活動詳情 Modal（例如剛好透過分享連結載入頁面就直接開了
  // Modal），額外補畫一次目前這個 location tab，讓「相關機台」不會因為晚到而永遠空白。
  // 這條萬一失敗（機台 Sheet 掛了）不該讓活動行事曆整頁掛掉，獨立 catch 成空陣列。
  loadMachines().catch(() => []).then(() => {
    renderAll();
    if (openModalState) {
      const { group, idx, source } = openModalState;
      document.getElementById('eventDetailLocationSlot').innerHTML = locationSectionHtml(group, idx);
      bindLocationSectionEvents(group, idx, source);
    }
  });

  // 偵測 ?event=<地點永久ID> 分享連結：機台端「期間活動」標籤、跟這裡的分享按鈕（shareEvent）都會產生這種連結。
  // 活動地點現在也有 O 欄永久ID（比照機台 Q 欄機制，見「分享連結永久ID機制（活動版）」），
  // 三段式判斷完全比照機台 app.html 的 ?id= 解析邏輯（見 js/main.js）：
  //   1. 永久ID精準比對成功 → 正常開啟對應活動詳情＋地點
  //   2. 精準比對失敗、退回比對 A 欄流水號找到列（舊格式連結）→ 無法確認是不是原本那個
  //      地點（A 欄可能被重新編號指派給別的活動），刻意安靜不顯示任何內容，只送 GA 事件
  //   3. 永久ID、A 欄都找不到 → 這個地點已經整列被刪除，顯示「已下架」toast
  const eventUrlParams = new URLSearchParams(window.location.search);
  const eventLocId = eventUrlParams.get('event');
  if (eventLocId) {
    // 分享連結若帶 layout=list／view=calendar（見 shareEvent() 與 api/event-share.js 的
    // backgroundParamsFor()），開彈窗前先把背景切成對應版面，不然彈窗關掉後看到的會是
    // 預設拼貼格，跟分享者當初看到的版面不一致。
    if (eventUrlParams.get('layout') === 'list') setCollageLayout('list');
    if (eventUrlParams.get('view') === 'calendar') setView('calendar');
    const exactTarget = allEvents.find((ev) => ev.permId === eventLocId);
    const legacyTarget = exactTarget ? null : allEvents.find((ev) => ev.id === eventLocId);

    if (exactTarget) {
      const group = findGroupByKey(groupKey(exactTarget));
      const idx = group ? group.locations.findIndex((l) => l.permId === eventLocId) : -1;
      if (group) openEventDetailModal(group, 'share_link', idx < 0 ? 0 : idx);
      gtag('event', 'events_share_link_opened', { event_id: exactTarget.id, device: getDeviceType() });
    } else if (legacyTarget) {
      // 舊格式連結、靠 A 欄 fallback 找到列，但無法確認是不是原本那一個地點，刻意不顯示任何內容
      gtag('event', 'events_share_link_legacy_fallback', { event_id: eventLocId, device: getDeviceType() });
    } else {
      showEventToast('這個活動的資訊已經下架囉');
      gtag('event', 'events_share_link_target_missing', { event_id: eventLocId, device: getDeviceType() });
    }
  } else {
    // 沒有 ?event=，改偵測「搜尋結果」分享連結：?q=關鍵字&category=..&ip=..&city=..&view=calendar，
    // 這些參數是使用者搜尋/篩選時由 eventsSyncSearchUrl() 即時寫回網址列的（不用另外點分享按鈕，
    // 複製網址列本身就是分享連結），這裡負責在對方打開連結時把狀態原樣還原，完全比照機台
    // app.html／js/main.js 的 ?q= 搜尋結果還原邏輯。
    const q = eventUrlParams.get('q');
    const restoreFilterKeys = ['category', 'ip', 'city'];
    const hasFilterParams = restoreFilterKeys.some((key) => eventUrlParams.get(key));
    const urlView = eventUrlParams.get('view');
    const urlLayout = eventUrlParams.get('layout');
    const dayParam = eventUrlParams.get('day');
    if (q || hasFilterParams || urlView === 'calendar' || urlLayout === 'list' || dayParam) {
      // 直接寫欄位/state，不呼叫 setEventsSearchKeyword()：那個函式會順便呼叫
      // eventsSyncSearchUrl() 把網址列洗回去，這裡篩選/view 都還沒還原完，太早同步
      // 會把 category/ip/city/view 參數蓋掉。
      if (q) {
        eventsSearchKeyword = q;
        document.getElementById('eventsSearchInput').value = q;
        document.getElementById('eventsSearchInputMobile').value = q;
        document.getElementById('eventsClearSearch').style.display = 'block';
        document.getElementById('eventsClearSearchMobile').style.display = 'block';
      }
      restoreFilterKeys.forEach((key) => {
        const val = eventUrlParams.get(key);
        if (val) eventsFilterState[key] = val.split(',').filter(Boolean);
      });
      filterWidget.render(); // 依還原後的 eventsFilterState 重新畫 pill 選中狀態
      positionQuickFilterGroup();
      if (urlView === 'calendar') setView('calendar');
      if (urlLayout === 'list') setCollageLayout('list');
      renderAll();
      // ?day= 深連結：還原到那一天所在的月份，再展開當天面板（openDayEventsPanel 內部
      // 會自己算 eventsForDate()，不依賴 state.month，但背後月曆畫面要顯示對的月份才不會錯亂）
      if (dayParam) {
        const dayKey = isoToDayKey(dayParam);
        if (dayKey) {
          const [dy, dm, dd] = dayKey.split('-').map(Number);
          const target = startOfMonth(new Date(dy, dm, dd));
          state.month = target < MIN_MONTH ? MIN_MONTH : target;
          renderAll();
          openDayEventsPanel(dayKey);
        }
      }
      // GA: events_search_url_restored（帶著搜尋/篩選參數的網址被打開，狀態被還原）
      gtag('event', 'events_search_url_restored', {
        has_keyword: !!q,
        has_filter: hasFilterParams,
        view: urlView === 'calendar' ? 'calendar' : 'collage',
        device: getDeviceType(),
      });
    }
  }
})();