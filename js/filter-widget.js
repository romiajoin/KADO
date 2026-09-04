// filter-widget.js — 通用篩選元件核心，從 filters.js 抽出，見 CLAUDE.md「共用 UI 元件抽出」

// flex-wrap 換行寬度量測，原理見 CLAUDE.md「flex-wrap 容器量不出換行後的實際寬度」（手機 bottom sheet 選項容器用這個）
export function fitOptionsWidth(container) {
  container.style.width = '';
  const items = Array.from(container.children);
  if (!items.length) return;
  const rows = new Map();
  items.forEach((item) => {
    const top = item.offsetTop;
    if (!rows.has(top)) rows.set(top, []);
    rows.get(top).push(item);
  });
  let maxRowWidth = 0;
  rows.forEach((rowItems) => {
    const left = Math.min(...rowItems.map((i) => i.offsetLeft));
    const right = Math.max(...rowItems.map((i) => i.offsetLeft + i.offsetWidth));
    maxRowWidth = Math.max(maxRowWidth, right - left);
  });
  if (maxRowWidth > 0) container.style.width = `${Math.ceil(maxRowWidth)}px`;
}

// 桌面 dropdown 面板同樣的量寬問題（.filter-panel-options）
export function fitPanelWidth(panelEl) {
  const optionsEl = panelEl.querySelector('.filter-panel-options');
  if (!optionsEl) return;
  const prevDisplay = panelEl.style.display;
  const wasHidden = getComputedStyle(panelEl).display === 'none';
  if (wasHidden) panelEl.style.display = 'block';
  panelEl.style.width = '';

  const items = Array.from(optionsEl.children);
  if (items.length) {
    const rows = new Map();
    items.forEach((item) => {
      const top = item.offsetTop;
      if (!rows.has(top)) rows.set(top, []);
      rows.get(top).push(item);
    });
    let maxRowWidth = 0;
    rows.forEach((rowItems) => {
      const left = Math.min(...rowItems.map((i) => i.offsetLeft));
      const right = Math.max(...rowItems.map((i) => i.offsetLeft + i.offsetWidth));
      maxRowWidth = Math.max(maxRowWidth, right - left);
    });
    const cs = getComputedStyle(panelEl);
    const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    if (maxRowWidth > 0) panelEl.style.width = `${Math.ceil(maxRowWidth + paddingX)}px`;
  }

  if (wasHidden) panelEl.style.display = prevDisplay;
}

// ---------- 核心元件 ----------
//
// 參數：
// - config: [{ key, label, panelHint?: string, sheetHint?: string, noSheetWidthFit?: boolean }]
//   panelHint／sheetHint：桌面面板／手機 sheet 上方要顯示的補充說明（原本寫死
//   判斷 key==='ip'，現在改成每個 cfg 自己帶，沒有就不顯示；兩邊文字可以不一樣，
//   原本 mobile 版就比 desktop 多一句「可滑動尋找」）。
//   noSheetWidthFit：手機 bottom sheet 的選項容器要不要略過 fitOptionsWidth
//   （原本寫死判斷 key==='type'，機台篩選只有兩個短選項，用預設寬度就好）。
// - getOptions(key): 回傳該篩選維度目前的選項清單（string[]），每次渲染/切換
//   都會即時呼叫，不會被快照住——首頁的選項是資料載入後才算出來的，要讀得到
//   之後更新的值。
// - state: 一個 { [key]: string[] } 物件，外部擁有，這裡只讀寫裡面的陣列
//   （用 push/splice，不會整個物件重新指派，呼叫方可以放心直接 export 這個物件）。
// - barEl: pill 群組要掛上去的容器 element。
// - sheetOverlayId/sheetId/sheetTitleId/sheetHintId/sheetOptionsId：手機
//   bottom sheet 用到的幾個 DOM id（跟 index.html 的 #filterSheetOverlay 等
//   結構一致，events.html 也要照這個結構準備一份，id 可以重複用同名——
//   兩份是不同 HTML 文件，不會互相衝突）。
// - isMobileLayout()：目前是不是手機版排版。
// - onChange()：選取值變化後要重新套用篩選時呼叫（例如 applyFilters／
//   重新渲染月曆），這個模組本身不管篩選要怎麼套用。
// - gaPrefix：GA 事件名稱前綴，預設 'filter'（會送 `${gaPrefix}_click` 等）。
// - onTogglePanel/onOpenSheet/onOutsideClose/onResizeClose：可選 hook，給首頁
//   用來一併關掉排序面板／排序 bottom sheet（events 頁沒有排序功能，不用傳）。
//   四個 hook 分別對應 filters.js 原本呼叫 closeDesktopSortPanel／
//   closeMobileSortSheet 的四個時機點：切換桌面面板時、打開手機 sheet 時、
//   點擊面板外部時、視窗 resize 時。
export function createFilterWidget({
  config,
  getOptions,
  state,
  barEl,
  sheetOverlayId,
  sheetId,
  sheetTitleId,
  sheetHintId,
  sheetOptionsId,
  sheetCloseId,
  isMobileLayout,
  onChange,
  gaPrefix = 'filter',
  onTogglePanel = () => {},
  onOpenSheet = () => {},
  onOutsideClose = () => {},
  onResizeClose = () => {},
}) {
  let openPanelKey = null;

  function pillLabelText(cfg) {
    const selected = state[cfg.key];
    if (selected.length === 0) return cfg.label;
    if (selected.length === 1) return selected[0];
    return `${cfg.label} (${selected.length})`;
  }

  function renderOptionsInto(container, cfg) {
    container.innerHTML = '';
    getOptions(cfg.key).forEach((value) => {
      const btn = document.createElement('button');
      btn.className = 'filter-option';
      btn.type = 'button';
      btn.textContent = value;
      if (state[cfg.key].includes(value)) btn.classList.add('selected');
      btn.addEventListener('click', () => toggleValue(cfg.key, value));
      container.appendChild(btn);
    });
  }

  function toggleValue(key, value) {
    const selected = state[key];
    const idx = selected.indexOf(value);
    const willSelect = idx === -1;
    if (willSelect) selected.push(value); else selected.splice(idx, 1);

    gtag('event', `${gaPrefix}_click`, {
      filter_type: key,
      filter_value: value,
      filter_state: willSelect ? 'on' : 'off',
      device: getDeviceTypeGlobal(),
    });

    const cfg = config.find((c) => c.key === key);

    // 重新渲染桌面下拉面板的選中狀態
    const panelOptions = barEl.querySelector(`.filter-panel[data-panel="${key}"] .filter-panel-options`);
    if (panelOptions) {
      renderOptionsInto(panelOptions, cfg);
      fitPanelWidth(panelOptions.closest('.filter-panel'));
    }

    // 若手機 bottom sheet 正顯示同一個類別，也一併更新
    const sheet = document.getElementById(sheetId);
    if (sheet && sheet.dataset.key === key) {
      const sheetOptionsEl = document.getElementById(sheetOptionsId);
      renderOptionsInto(sheetOptionsEl, cfg);
      if (cfg.noSheetWidthFit) sheetOptionsEl.style.width = '';
      else fitOptionsWidth(sheetOptionsEl);
    }

    refreshPillStates();
    onChange();
  }

  function clearFilterKey(key) {
    const cfg = config.find((c) => c.key === key);
    const hadFilter = state[key].length > 0;
    state[key] = [];

    const panelOptions = barEl.querySelector(`.filter-panel[data-panel="${key}"] .filter-panel-options`);
    if (panelOptions) {
      renderOptionsInto(panelOptions, cfg);
      fitPanelWidth(panelOptions.closest('.filter-panel'));
    }

    const sheet = document.getElementById(sheetId);
    if (sheet && sheet.dataset.key === key) {
      const sheetOptionsEl = document.getElementById(sheetOptionsId);
      renderOptionsInto(sheetOptionsEl, cfg);
      if (cfg.noSheetWidthFit) sheetOptionsEl.style.width = '';
      else fitOptionsWidth(sheetOptionsEl);
    }

    refreshPillStates();
    onChange();

    if (hadFilter) {
      gtag('event', `${gaPrefix}_clear`, { filter_type: key, device: getDeviceTypeGlobal() });
    }
  }

  function refreshPillStates() {
    config.forEach((cfg) => {
      const pill = barEl.querySelector(`.filter-pill[data-key="${cfg.key}"]`);
      if (!pill) return;
      pill.querySelector('.pill-label').textContent = pillLabelText(cfg);
      pill.classList.toggle('active', state[cfg.key].length > 0);
    });
  }

  function toggleDesktopPanel(key) {
    const alreadyOpen = openPanelKey === key;
    closeDesktopPanels();
    onTogglePanel();
    if (alreadyOpen) return;
    const panel = barEl.querySelector(`.filter-panel[data-panel="${key}"]`);
    const pill = barEl.querySelector(`.filter-pill[data-key="${key}"]`);
    panel.classList.add('open');
    pill.classList.add('open');
    openPanelKey = key;

    gtag('event', `${gaPrefix}_panel_open`, { filter_type: key, device: getDeviceTypeGlobal() });
  }

  function closeDesktopPanels(skipTracking) {
    if (openPanelKey && !skipTracking) {
      gtag('event', `${gaPrefix}_panel_close`, {
        filter_type: openPanelKey,
        had_selection: state[openPanelKey].length > 0,
        device: getDeviceTypeGlobal(),
      });
    }
    barEl.querySelectorAll('.filter-panel.open').forEach((p) => p.classList.remove('open'));
    barEl.querySelectorAll('.filter-pill.open').forEach((p) => p.classList.remove('open'));
    openPanelKey = null;
  }

  function openMobileSheet(key) {
    onOpenSheet();
    const cfg = config.find((c) => c.key === key);
    document.getElementById(sheetTitleId).textContent = `${cfg.label}篩選`;
    const sheet = document.getElementById(sheetId);
    sheet.dataset.key = key;
    const hintEl = document.getElementById(sheetHintId);
    const sheetHintText = cfg.sheetHint || cfg.panelHint;
    if (sheetHintText) {
      hintEl.textContent = sheetHintText;
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }
    const sheetOptionsEl = document.getElementById(sheetOptionsId);
    renderOptionsInto(sheetOptionsEl, cfg);
    document.getElementById(sheetOverlayId).classList.add('show');
    if (cfg.noSheetWidthFit) sheetOptionsEl.style.width = '';
    else fitOptionsWidth(sheetOptionsEl);
    const pill = barEl.querySelector(`.filter-pill[data-key="${key}"]`);
    if (pill) pill.classList.add('open');

    gtag('event', `${gaPrefix}_panel_open`, { filter_type: key, device: getDeviceTypeGlobal() });
  }

  function closeMobileSheet(skipTracking) {
    const sheet = document.getElementById(sheetId);
    const key = sheet.dataset.key;
    const overlay = document.getElementById(sheetOverlayId);
    const wasShown = overlay.classList.contains('show');
    if (wasShown && key && !skipTracking) {
      gtag('event', `${gaPrefix}_panel_close`, {
        filter_type: key,
        had_selection: (state[key] || []).length > 0,
        device: getDeviceTypeGlobal(),
      });
    }
    overlay.classList.remove('show');
    const pill = barEl.querySelector(`.filter-pill[data-key="${key}"]`);
    if (pill) pill.classList.remove('open');
  }

  function render() {
    barEl.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'filter-scroll';
    barEl.appendChild(scroll);

    config.forEach((cfg) => {
      const group = document.createElement('div');
      group.className = 'filter-pill-group';
      group.innerHTML = `
        <button class="filter-pill" data-key="${cfg.key}" type="button">
          <span class="pill-label">${pillLabelText(cfg)}</span>
          <span class="pill-icon" data-role="icon">
            <svg class="pill-chevron" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M461-403 318.88-545.19q-2.94-2.95-4.41-6.38Q313-555 313-558.5q0-7 4.95-12.25T331-576h298q8.1 0 13.05 5.4Q647-565.2 647-558q0 1-5.88 12.77L499-403q-4 4-9 6t-10 2q-5 0-10-2t-9-6Z"/></svg>
            <svg class="pill-clear" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m480-429 116 116q11 11 25.5 10.5T647-314q11-11 11-25.5T647-365L531-480l116-116q11-11 11-25.5T647-647q-11-11-25.5-11T596-647L480-531 364-647q-11-11-25-11t-25 11q-11 11-11 25.5t11 25.5l115 116-116 116q-11 11-10.5 25t11.5 25q11 11 25.5 11t25.5-11l115-115Zm0 333q-79 0-149-30t-122.5-82.5Q156-261 126-331T96-480q0-80 30-149.5t82.5-122Q261-804 331-834t149-30q80 0 149.5 30t122 82.5Q804-699 834-629.5T864-480q0 79-30 149t-82.5 122.5Q699-156 629.5-126T480-96Z"/></svg>
          </span>
        </button>
        <div class="filter-panel" data-panel="${cfg.key}">
          ${cfg.panelHint ? `<div class="filter-panel-hint">${cfg.panelHint}</div>` : ''}
          <div class="filter-panel-options"></div>
        </div>`;
      scroll.appendChild(group);
      group.querySelector('.filter-panel').addEventListener('click', (e) => e.stopPropagation());
      renderOptionsInto(group.querySelector('.filter-panel-options'), cfg);
      fitPanelWidth(group.querySelector('.filter-panel'));
    });

    barEl.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', function handlePillClick(e) {
        e.stopPropagation();
        const key = this.getAttribute('data-key');
        if (isMobileLayout()) {
          openMobileSheet(key);
        } else {
          toggleDesktopPanel(key);
        }
      });
      // icon 區域單獨處理：active 狀態下顯示清除 icon，點擊只清除該類別篩選，不觸發展開選單
      btn.querySelector('.pill-icon').addEventListener('click', function handleIconClick(e) {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (btn.classList.contains('active')) {
          clearFilterKey(key);
        } else if (isMobileLayout()) {
          openMobileSheet(key);
        } else {
          toggleDesktopPanel(key);
        }
      });
    });

    refreshPillStates();
  }

  document.addEventListener('click', () => {
    closeDesktopPanels();
    onOutsideClose();
  });

  window.addEventListener('resize', () => {
    closeDesktopPanels(true);
    onResizeClose();
  });

  window.addEventListener('resize', () => {
    const overlay = document.getElementById(sheetOverlayId);
    const sheet = document.getElementById(sheetId);
    if (overlay.classList.contains('show')) {
      const cfg = config.find((c) => c.key === sheet.dataset.key);
      if (cfg && !cfg.noSheetWidthFit) fitOptionsWidth(document.getElementById(sheetOptionsId));
    }
  });

  document.getElementById(sheetOverlayId).addEventListener('click', () => closeMobileSheet());
  const closeBtn = document.getElementById(sheetCloseId);
  if (closeBtn) closeBtn.addEventListener('click', () => closeMobileSheet());

  return { render, refreshPillStates, closeDesktopPanels, closeMobileSheet, openMobileSheet, toggleDesktopPanel };
}

// gtag 是全站共用的全域函式（GTM script 掛的），跟 filters.js／events.js 原本
// 的用法一致，這裡不 import，直接當全域用；getDeviceType 則各檔案自己有
// import utils.js 的版本，這個模組沒有依賴 main.js／events.js，改用小工具
// function 直接吃 window，避免這個共用模組還要多一層跟呼叫方對齊 import 路徑。
function getDeviceTypeGlobal() {
  const base = window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return standalone ? `${base}_pwa` : base;
}