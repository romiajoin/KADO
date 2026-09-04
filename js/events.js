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

function isMobileFilterLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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
    ? `<span class="events-bar-multi-badge">${group.locations.length} 地點</span>` : '';
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
  // 週列包一層 .events-weeks（自然高度，不參與 .events-day-grid 的 flex:1
  // 撐高），避免沒有活動、週數少時，剩餘空白被最後一週的樣式一起蓋到、
  // 看起來像無限延伸到卡片底部，見 events.css 「.events-weeks」的說明。
  grid.innerHTML = `<div class="events-weeks">${weeks.map((week, i) => renderWeekRow(week, today, `${monthKey}-${i}`)).join('')}</div>`;

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
function machineTypeBadgesHtml(group) {
  const types = relatedMachineTypesForGroup(group, allMachines);
  if (!types.size) return '';
  return ['抽卡機', '相卡機']
    .filter((t) => types.has(t))
    .map((t) => `<span class="type-badge ${t === '相卡機' ? 'photocard' : 'gacha'}">${t}</span>`)
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
  const multiPill = multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : '';

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

function compareGroupsBySort(a, b, sortKey, userCoords) {
  if (sortKey === 'distance_asc' || sortKey === 'distance_desc') {
    const dir = sortKey === 'distance_desc' ? -1 : 1;
    return (groupDistanceKm(a, userCoords) - groupDistanceKm(b, userCoords)) * dir;
  }
  const dir = sortKey === 'end_date_desc' ? -1 : 1;
  return (a.end - b.end) * dir || (a.start - b.start) * dir;
}

function collageGroups() {

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
          ${multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : ''}
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
            ${multi ? `<span class="events-multi-pill"><svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> ${group.locations.length} 地點</span>` : ''}
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

  onTogglePanel: () => sortWidget.closeDesktopPanel(),
  onOpenSheet: () => sortWidget.closeMobileSheet(),
  onOutsideClose: () => sortWidget.closeDesktopPanel('outside_click'),
  onResizeClose: () => sortWidget.closeDesktopPanel(),
});

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
}

function closeDayEventsPanel(e, methodOverride) {

  if (e && e.target !== document.getElementById('dayEventsOverlay')) return;
  document.getElementById('dayEventsOverlay').classList.remove('show');
  document.body.classList.remove('day-events-open');
  document.body.style.overflow = '';

  const method = methodOverride || (e ? 'backdrop_click' : 'other');
  gtag('event', 'events_day_more_close', { method, device: getDeviceType() });
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
    return `<div class="popup-img-wrap"><img src="${imgs[0]}" class="popup-img" alt="${group.title}"></div>`;
  }

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
        <span class="type-badge ${m.type === '相卡機' ? 'photocard' : 'gacha'}">${m.type}</span>
        <span class="related-machine-name">${label}</span>
      </a>`;
  }).join('');
  // 橫向捲動卡片列，故意不放縮圖（多數機台本來就沒填圖片，見樣式比較討論）。
  return `
    <div class="modal-info-section related-machines-section">
      <div class="related-machines-title">相關機台（${related.length}）</div>
      <div class="related-machines-list">${items}</div>
    </div>`;
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
}

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

  if (e && e.target !== document.getElementById('eventDetailOverlay')) return;
  document.getElementById('eventDetailOverlay').classList.remove('show');

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
  // 機台資料只用來算「相關機台」清單，跟活動分頁不是同一份，各自 fetch；
  // 這條萬一失敗（機台 Sheet 掛了）不該讓活動行事曆整頁掛掉，獨立 catch 成空陣列。
  await Promise.all([loadEvents(), loadMachines().catch(() => [])]);
  filterWidget.render();
  sortWidget.render(document.getElementById('eventsFilterBar'));
  updateCollageLayoutBtns();
  renderAll();
  initEventsTopBarScroll();
  gtag('event', 'events_page_view', { device: getDeviceType() });

  // 偵測 ?event=<地點id> 分享連結：機台端「期間活動」標籤、跟這裡的分享按鈕（shareEvent）都會產生這種連結。
  // 活動地點目前沒有像機台永久ID那種「重新編號也不會變」的識別碼（N/O 欄保留給以後用，見 spec.md），
  // 只能先用 A 欄流水號比對——找得到就直接開對應活動＋地點；找不到就跟機台分享連結一樣顯示 toast，
  // 這裡只有「找到／找不到」兩段，沒有機台那邊 A欄/永久ID 雙軌判斷的曖昧地帶，故意簡化。
  const eventUrlParams = new URLSearchParams(window.location.search);
  const eventLocId = eventUrlParams.get('event');
  if (eventLocId) {
    const targetLoc = allEvents.find((ev) => ev.id === eventLocId);
    if (targetLoc) {
      const group = findGroupByKey(groupKey(targetLoc));
      const idx = group ? group.locations.findIndex((l) => l.id === eventLocId) : -1;
      if (group) openEventDetailModal(group, 'share_link', idx < 0 ? 0 : idx);
      gtag('event', 'events_share_link_opened', { event_id: eventLocId, device: getDeviceType() });
    } else {
      showEventToast('這個活動的資訊已經下架囉');
      gtag('event', 'events_share_link_target_missing', { event_id: eventLocId, device: getDeviceType() });
    }
  }
})();
