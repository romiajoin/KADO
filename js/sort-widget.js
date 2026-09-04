// sort-widget.js — 通用排序元件核心，從 sort.js 抽出，見 CLAUDE.md「共用 UI 元件抽出」

export function createSortWidget({
  options,              // [{ key, label1, label2, text, isDistance? }]
  initialKey,
  sheetOverlayId,
  sheetHintId,
  sheetOptionsId,
  sheetCloseId,
  isMobileLayout,
  onChange,              // (key, userCoords) => {}：選取狀態真的改變時呼叫，由呼叫方自己重新排序＋渲染
  gaPrefix = 'sort',
  // 跟篩選面板互相關閉用的 hook（比照 filter-widget.js 的 onTogglePanel／onOpenSheet／
  // onOutsideClose／onResizeClose，方向相反：這裡換排序元件在開啟時通知呼叫方去關篩選）
  onTogglePanel = () => {},
  onOpenSheet = () => {},
  onOutsideClose = () => {},
  onResizeClose = () => {},
}) {
  let sortState = initialKey;
  let userCoords = null; // { lat, lng }，成功定位後才有值
  let barEl = null;

  // =============================================
  // 🔽 渲染：按鈕 + 桌機 dropdown
  // =============================================
  function render(bar) {
    barEl = bar;
    const group = document.createElement('div');
    group.className = 'sort-group';
    group.innerHTML = `
      <button class="sort-btn" id="sortBtn" type="button">
        <span class="sort-label">
          <span id="sortLabel1"></span>
          <span id="sortLabel2"></span>
        </span>
        <svg class="pill-chevron" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M461-403 318.88-545.19q-2.94-2.95-4.41-6.38Q313-555 313-558.5q0-7 4.95-12.25T331-576h298q8.1 0 13.05 5.4Q647-565.2 647-558q0 1-5.88 12.77L499-403q-4 4-9 6t-10 2q-5 0-10-2t-9-6Z"/></svg>
      </button>
      <div class="sort-panel" id="sortPanel">
        <div class="sort-hint" id="sortPanelHint"></div>
      </div>`;
    barEl.appendChild(group);

    const panel = group.querySelector('#sortPanel');
    panel.addEventListener('click', (e) => e.stopPropagation());
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'sort-option';
      btn.type = 'button';
      btn.textContent = opt.text;
      btn.dataset.sort = opt.key;
      btn.addEventListener('click', () => selectSortOption(opt.key));
      panel.appendChild(btn);
    });

    group.querySelector('#sortBtn').addEventListener('click', function handleSortBtnClick(e) {
      e.stopPropagation();
      if (isMobileLayout()) {
        openMobileSheet();
      } else {
        toggleDesktopPanel();
      }
    });

    updateSortDisplay();
  }

  function updateSortDisplay() {
    const opt = options.find((o) => o.key === sortState);
    const label1 = document.getElementById('sortLabel1');
    const label2 = document.getElementById('sortLabel2');
    if (label1 && label2 && opt) {
      label1.textContent = opt.label1;
      label2.textContent = opt.label2;
    }
    document.querySelectorAll('.sort-option').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.sort === sortState);
    });
  }

  // =============================================
  // 🔽 桌機 dropdown 開合
  // =============================================
  function toggleDesktopPanel() {
    const panel = document.getElementById('sortPanel');
    const btn = document.getElementById('sortBtn');
    const wasOpen = panel.classList.contains('open');
    onTogglePanel();
    closeDesktopPanel('toggle_button');
    if (wasOpen) return;
    panel.classList.add('open');
    btn.classList.add('open');
    gtag('event', `${gaPrefix}_panel_open`, { device: getDeviceTypeGlobal() });
  }

  // method 有值才記錄（真的是使用者主動關閉）；未傳入時代表程式自動觸發的收合
  // （例如選了排序選項後的自動收合、resize），不算一次使用者關閉動作
  function closeDesktopPanel(method) {
    const panel = document.getElementById('sortPanel');
    const btn = document.getElementById('sortBtn');
    const wasOpen = panel && panel.classList.contains('open');
    if (panel) panel.classList.remove('open');
    if (btn) btn.classList.remove('open');
    const hint = document.getElementById('sortPanelHint');
    if (hint) hint.classList.remove('show');
    if (wasOpen && method) {
      gtag('event', `${gaPrefix}_panel_close`, { method, device: getDeviceTypeGlobal() });
    }
  }

  // =============================================
  // 🔽 手機 bottom sheet 開合
  // =============================================
  function openMobileSheet() {
    onOpenSheet();
    const sheetOptionsEl = document.getElementById(sheetOptionsId);
    sheetOptionsEl.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'sort-option';
      btn.type = 'button';
      btn.textContent = opt.text;
      btn.dataset.sort = opt.key;
      if (opt.key === sortState) btn.classList.add('selected');
      btn.addEventListener('click', () => selectSortOption(opt.key));
      sheetOptionsEl.appendChild(btn);
    });
    document.getElementById(sheetHintId).classList.remove('show');
    document.getElementById(sheetOverlayId).classList.add('show');
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) sortBtn.classList.add('open');
    gtag('event', `${gaPrefix}_panel_open`, { device: getDeviceTypeGlobal() });
  }

  // method 有值才記錄，理由同 closeDesktopPanel
  function closeMobileSheet(method) {
    const overlay = document.getElementById(sheetOverlayId);
    const wasShown = overlay.classList.contains('show');
    overlay.classList.remove('show');
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) sortBtn.classList.remove('open');
    if (wasShown && method) {
      gtag('event', `${gaPrefix}_panel_close`, { method, device: getDeviceTypeGlobal() });
    }
  }

  // =============================================
  // 🔽 定位權限（距離排序用）
  // =============================================
  function geoPermissionDenied() {
    return localStorage.getItem('geo_permission_denied') === 'true';
  }

  function requestUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ status: 'unavailable', message: '此瀏覽器不支援定位功能' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          const statusMap = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };
          reject({ status: statusMap[err.code] || 'unavailable', message: err.message });
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  function showSortHint(msg) {
    const panelHint = document.getElementById('sortPanelHint');
    if (panelHint) { panelHint.textContent = msg; panelHint.classList.add('show'); }
    const sheetHint = document.getElementById(sheetHintId);
    if (sheetHint) { sheetHint.textContent = msg; sheetHint.classList.add('show'); }
  }

  // 定位失敗時依 err.status 對應到不同文案，讓使用者知道具體是哪種情況
  const GEO_ERROR_MESSAGES = {
    denied: '無法取得您的位置，請至瀏覽器設定開啟定位權限',
    timeout: '定位逾時，請稍後再試',
    unavailable: '此裝置不支援定位功能',
  };

  // =============================================
  // 🔽 選取排序選項
  // =============================================
  function selectSortOption(key) {
    const opt = options.find((o) => o.key === key);
    const isDistance = !!(opt && opt.isDistance);
    if (!isDistance) {
      applySortState(key);
      return;
    }
    if (userCoords) {
      applySortState(key);
      return;
    }
    if (geoPermissionDenied()) {
      showSortHint('請至瀏覽器設定開啟定位權限');
      return;
    }
    requestUserLocation()
      .then((coords) => {
        userCoords = coords;
        localStorage.removeItem('geo_permission_denied');
        gtag('event', 'geo_permission_result', { geo_result: 'granted', device: getDeviceTypeGlobal() });
        applySortState(key);
      })
      .catch((err) => {
        const status = (err && err.status) || 'unavailable';
        if (status === 'denied') localStorage.setItem('geo_permission_denied', 'true');
        gtag('event', 'geo_permission_result', { geo_result: status, device: getDeviceTypeGlobal() });
        showSortHint(GEO_ERROR_MESSAGES[status] || GEO_ERROR_MESSAGES.unavailable);
      });
  }

  function applySortState(key) {
    sortState = key;
    updateSortDisplay();
    // 這裡故意不傳 method：選了排序選項導致的自動收合，跟 sort_change 是同一個時間點的
    // 同一個動作，重複記錄一次 close 沒有額外資訊、只會讓「面板真的被關掉但沒選」這個
    // 訊號被稀釋
    closeDesktopPanel();
    closeMobileSheet();
    gtag('event', 'sort_change', { sort_key: key, device: getDeviceTypeGlobal() });
    onChange(key, userCoords);
  }

  document.getElementById(sheetOverlayId).addEventListener('click', () => closeMobileSheet('backdrop_click'));
  const closeBtn = document.getElementById(sheetCloseId);
  if (closeBtn) closeBtn.addEventListener('click', () => closeMobileSheet('x_button'));

  document.addEventListener('click', () => {
    closeDesktopPanel('outside_click');
    onOutsideClose();
  });

  window.addEventListener('resize', () => {
    closeDesktopPanel();
    onResizeClose();
  });

  return {
    render,
    getState: () => sortState,
    getUserCoords: () => userCoords,
    closeDesktopPanel,
    closeMobileSheet,
  };
}

// 刻意不 import utils.js 以外的任何跨頁面模組，避免拖進 index.html／events.html 各自才有的 DOM 依賴鏈
function getDeviceTypeGlobal() {
  const base = window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isStandalone ? `${base}_pwa` : base;
}
