// =============================================
// sort.js — 首頁排序 UI 串接：把共用的 sort-widget.js（v?? 抽出，跟 filter-widget.js
// 同一種抽法，見該檔案開頭說明）掛到 index.html 的 DOM 上。
// UI 渲染／開合／定位權限流程都搬去 sort-widget.js 了，這裡只留首頁專屬的部分：
// 排序選項清單（SORT_OPTIONS）、sortState／userCoords（grid.js 讀這兩個算排序，
// import 進來的變數是唯讀的，只能在這個宣告的模組裡重新賦值，理由見 CLAUDE.md
// 「跨檔案依賴要注意」）、跟 main.js 的 currentFiltered／grid.js／map.js 串接、
// 選完排序後要做的事（重新排序＋渲染 grid／map＋捲回頂部）、以及跟 filters.js
// 排序面板/篩選面板互相關閉的串接。
// =============================================

import { renderGrid, sortLocations } from './grid.js';
import { isMobileFilterLayout, closeMobileFilterSheet, closeDesktopPanels } from './filters.js';
import { currentFiltered, setCurrentFiltered } from './main.js';
import { map, renderMapLocations } from './map.js';
import { createSortWidget } from './sort-widget.js';

// =============================================
// 🔽 排序設定（結束日期 / 距離）
// =============================================
const SORT_OPTIONS = [
  { key: 'end_date_asc', label1: '結束日', label2: '近到遠', text: '結束日：近到遠' },
  { key: 'end_date_desc', label1: '結束日', label2: '遠到近', text: '結束日：遠到近' },
  { key: 'distance_asc', label1: '距離', label2: '近到遠', text: '距離：近到遠', isDistance: true },
  { key: 'distance_desc', label1: '距離', label2: '遠到近', text: '距離：遠到近', isDistance: true },
];

export let sortState = 'end_date_asc'; // default
export let userCoords = null; // { lat, lng }，成功定位後才有值

// =============================================
// 🔽 掛上共用的排序元件
// =============================================
const widget = createSortWidget({
  options: SORT_OPTIONS,
  initialKey: 'end_date_asc',
  sheetOverlayId: 'sortSheetOverlay',
  sheetHintId: 'sortSheetHint',
  sheetOptionsId: 'sortSheetOptions',
  sheetCloseId: 'sortSheetClose',
  isMobileLayout: isMobileFilterLayout,
  gaPrefix: 'sort',
  // 首頁專屬：桌機打開排序面板／手機叫出排序 sheet 時，要順便關掉篩選面板／篩選 sheet；
  // 反過來（篩選面板打開時關排序）的邏輯留在 filters.js 的 onTogglePanel 等 hook，
  // 呼叫下面 export 出去的 closeDesktopSortPanel／closeMobileSortSheet。
  onTogglePanel: () => closeDesktopPanels(),
  onOpenSheet: () => closeMobileFilterSheet(true),
  onChange: (key, coords) => {
    sortState = key;
    userCoords = coords;
    setCurrentFiltered(sortLocations(currentFiltered));
    renderGrid(currentFiltered);
    if (map) renderMapLocations(currentFiltered);

    // 排序＝重新給名次，捲動位置停在原地會對不上新的順序，兩種模式／裝置都直接捲回最上面
    const gridViewEl = document.getElementById('gridView');
    if (gridViewEl) gridViewEl.scrollTop = 0;
    const mapScrollWrapper = document.querySelector('.map-scroll-wrapper');
    if (mapScrollWrapper) mapScrollWrapper.scrollTop = 0;
  },
});

export function renderSortControl(bar) {
  widget.render(bar);
}

export function closeDesktopSortPanel(method) {
  widget.closeDesktopPanel(method);
}

export function closeMobileSortSheet(method) {
  widget.closeMobileSheet(method);
}
