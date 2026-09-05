// =============================================
// filters.js — 首頁篩選 UI（機台／作品／縣市）狀態 + 資料
// pill／dropdown／bottom sheet 的渲染／開合／量寬／GA 事件機制已經抽到
// filter-widget.js（跟 events.js 的活動類型篩選共用同一套，見該檔案開頭的
// 說明），這裡只保留首頁專屬的部分：篩選選項怎麼從 locations 算出來
// （buildFilterOptions／TW_CITY_ORDER）、跟 main.js 的 applyFilters() 串接、
// 跟 sort.js 的排序面板互相關閉。
//
// filterState 是用 const 宣告的物件，這裡跟 main.js 之間只互相「改物件內的屬性」
// （filterState[key] = [...]），不是「重新指到別的物件」，所以可以直接 export/import，
// 不需要像 currentFiltered 那樣另外寫 setter。
// =============================================

import { applyFilters } from './main.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from './sort.js';
import { createFilterWidget } from './filter-widget.js';
import { TW_CITY_ORDER } from './utils.js';

// =============================================
// 🔽 篩選設定（機台 / 作品 / 縣市）
// =============================================
export const FILTER_CONFIG = [
  { key: 'type', label: '機台', field: 'type', fixedOptions: ['抽卡機', '相卡機'], noSheetWidthFit: true },
  {
    // key 沿用 'ip'（GA filter_type 等既有分析參數值不變），只改顯示文字，見「全站 filter 標籤更名」
    key: 'ip',
    label: '作品',
    field: 'character',
    panelHint: '依「數字 → 筆畫 → 英文」排序',
    sheetHint: '依「數字 → 筆畫 → 英文」排序，可滑動尋找',
  },
  { key: 'city', label: '縣市', field: 'city' },
];
export const filterState = { type: [], city: [], ip: [] };
let filterOptionsData = {};

// =============================================
// 🔽 篩選選項資料（依 locations 動態算出，縣市/機台固定）
// =============================================
// 縣市固定順序（依指定排列，共用清單搬到 utils.js 的 TW_CITY_ORDER，events.js 也會用到）

export function buildFilterOptions(locations) {
  filterOptionsData = {};
  FILTER_CONFIG.forEach(cfg => {
    if (cfg.fixedOptions) {
      filterOptionsData[cfg.key] = cfg.fixedOptions;
      return;
    }
    if (cfg.key === 'city') {
      // 縣市固定顯示全部 22 個，不受資料是否存在影響；沒資料的選項篩出來會是 0 筆
      filterOptionsData[cfg.key] = TW_CITY_ORDER.slice();
      return;
    }
    const uniq = [...new Set(locations.map(l => l[cfg.field]).filter(Boolean))];
    uniq.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    filterOptionsData[cfg.key] = uniq;
  });
}

export function isMobileFilterLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

// =============================================
// 🔽 掛上共用的 filter widget
// =============================================
// 只在模組載入時建立一次（監聽器——document click／window resize／bottom
// sheet 關閉鈕——只掛一次，不要每次 renderFilterBar() 都重掛一份），
// renderFilterBar() 之後只呼叫 widget.render() 重新畫 pill／面板本身。
// getOptions 每次都讀「當下」的 filterOptionsData，不是建立當下的快照——
// buildFilterOptions() 是資料載入後才算好選項，第一次 renderFilterBar() 之前
// filterOptionsData 可能還是空的，靠這個 getOptions 才能讀到之後補上的值。
const widget = createFilterWidget({
  config: FILTER_CONFIG,
  getOptions: (key) => filterOptionsData[key] || [],
  state: filterState,
  barEl: document.getElementById('filterBar'),
  sheetOverlayId: 'filterSheetOverlay',
  sheetId: 'filterSheet',
  sheetTitleId: 'filterSheetTitle',
  sheetHintId: 'filterSheetHint',
  sheetOptionsId: 'filterSheetOptions',
  sheetCloseId: 'filterSheetClose',
  isMobileLayout: isMobileFilterLayout,
  onChange: () => applyFilters(),
  gaPrefix: 'filter',
  // 首頁專屬：桌面版打開篩選面板／手機版叫出篩選 bottom sheet 時，要順便關掉
  // 排序面板／排序 sheet；反過來（面板外部點擊、resize）也要讓排序面板一起收。
  // events 頁沒有排序功能，這四個 hook 對那邊的 widget 實例來說不會傳。
  onTogglePanel: () => closeDesktopSortPanel('switch_panel'),
  onOpenSheet: () => closeMobileSortSheet('switch_panel'),
  onOutsideClose: () => closeDesktopSortPanel('outside_click'),
  onResizeClose: () => closeDesktopSortPanel(),
});

export function renderFilterBar() {
  widget.render();
  renderSortControl(document.getElementById('filterBar'));
}

export function closeDesktopPanels(skipTracking) {
  widget.closeDesktopPanels(skipTracking);
}

export function closeMobileFilterSheet(skipTracking) {
  widget.closeMobileSheet(skipTracking);
}