// =============================================
// main.js — Card Radar 核心邏輯（資料載入／view 切換／篩選＋排序協調）
// 拆分階段四：地圖／bottom sheet 已搬到 map.js。main.js 現在主要是資料載入
// （loadFromSheet）、view 切換（setView）、以及 applyFilters 這個「重新計算結果、
// 同時同步 grid 跟地圖」的協調中心。
// =============================================

import { getDeviceType, driveUrlToImage } from './utils.js';
import { loadEvents } from './events-data.js';
import { matchMachineToEventRow, machineTitleHtml, stripNoEventLinkTag } from './event-match.js';
import { renderGrid, sortLocations, getEndingBadge } from './grid.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from './sort.js';
import { buildFilterOptions, renderFilterBar, FILTER_CONFIG, filterState } from './filters.js';
import { map, renderMapLocations, initMap, initBottomSheet, applySheetLevel, sheetLevel, isMobileMapLayout, openMobileSheetSummary, openDesktopSidebar } from './map.js';
import { initTopBarScroll, resetTopBarScrollState } from './scroll.js';

    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=0&single=true&output=csv';
    // 活動行事曆分頁（events-data.js 的 EVENTS_SHEET_CSV_URL 同一份，這裡重複定義一份是延續專案既有「各檔案自帶所需常數」的慣例）——
    // 只用來比對「最後更新時間」P 欄，不解析活動內容，機台頁不需要活動資料本身。
    const EVENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgBZrLfJlb-JY9YGm3o9vX5w3jG9hojq5E79tStxW1g89rKpuMnaRi1vA833KmZbilAAv9vrhttqQh/pub?gid=1540199365&single=true&output=csv';

    // 回到前景自動刷新的節流門檻：距上次抓取超過這個時間才真的打 API
    export const REFRESH_THROTTLE_MS = 30 * 60 * 1000; // 30 分鐘
    export let lastFetchTime = 0;


    // =============================================
    // 🗂️ SVG Icons
    // =============================================

    export let allLocations = [];

    export let currentFiltered = [];
    export function setCurrentFiltered(v) { currentFiltered = v; }
    let viewInitialized = false; // 避免初始化時觸發 view_toggle

    let openSortPanel = false;


    // =============================================
    // <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> 切換視圖
    // =============================================
    function setView(view) {
      document.getElementById('btnGrid').classList.toggle('active', view === 'grid');
      document.getElementById('btnMap').classList.toggle('active', view === 'map');
      document.getElementById('gridView').classList.toggle('active', view === 'grid');
      document.getElementById('mapView').classList.toggle('active', view === 'map');
      document.body.classList.toggle('map-view', view === 'map');
      resetTopBarScrollState();

      // GA: view_toggle（跳過頁面初始化那次）
      if (viewInitialized) {
        gtag('event', 'view_toggle', { view_mode: view, device: getDeviceType() });
      }
      viewInitialized = true;

      if (view === 'map') {
        initMap();
        initBottomSheet();
        setTimeout(() => { if (map) map.invalidateSize(); }, 50);
      }
    }

    // 讓網址列本身就是「目前搜尋結果」的分享連結：搜尋關鍵字／篩選條件／檢視模式（地圖或列表）
    // 一有變動就同步寫回網址列（history.replaceState，不新增瀏覽紀錄、不觸發真正的頁面跳轉），
    // 使用者不用另外點分享按鈕，直接複製網址列就是當下這個搜尋結果的連結。
    // 只從 applyFilters() 呼叫（見下方），刻意不放進 setView()：setView() 在頁面初始化時
    // （setView('grid') 早於 loadFromSheet() 解析網址參數）跟單一機台分享連結落地時
    // （?id= 分支會呼叫 setView('map')，但不會呼叫 applyFilters()）都會被呼叫到，
    // 如果在這裡同步網址，會在網址列的 ?id= 或原始查詢字串還沒被讀取前就把它洗掉。
    // applyFilters() 只在使用者真的搜尋/篩選，或還原搜尋分享連結時才會被呼叫，時機才安全。
    function syncSearchUrl() {
      const kw = (document.getElementById('searchInput').value || '').trim();
      const params = new URLSearchParams();
      if (kw) params.set('q', kw);
      FILTER_CONFIG.forEach(cfg => {
        if (filterState[cfg.key].length > 0) params.set(cfg.key, filterState[cfg.key].join(','));
      });
      if (document.body.classList.contains('map-view')) params.set('view', 'map');

      const query = params.toString();
      const newUrl = window.location.pathname + (query ? `?${query}` : '');
      history.replaceState(null, '', newUrl);
    }

    let prevSearchKw = '';          // 上一次的搜尋關鍵字，用來偵測「從無到有」／「從有到無」這兩個轉折
    let sheetLevelBeforeSearch = null; // 搜尋開始那一刻，sheet 原本停在哪一層；清空搜尋時要還原成這個值，
                                        // 而不是看清空當下 sheet 剛好停在哪（那可能是搜尋自己展開的 mid，不是使用者手動拉的）
    // =============================================
    // 🔧 解析 CSV 單列
    // =============================================
    function parseCSVRow(row) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += char; }
      }
      result.push(current.trim());
      return result;
    }

    // =============================================
    // 🕐 最後更新時間：Google Sheet 儲存格原始格式是 12 小時制（例如「2026/7/14 下午8:33:00」），
    // 這裡轉成 24 小時制顯示，順便拿掉秒數（更新時間精確到秒沒有實際意義，字也短一點）。
    // 格式跟預期不符（例如 Sheet 那格被手動改成別的格式）就直接回傳原字串，不讓整個「最後更新」消失。
    // =============================================
    function to24Hour(raw) {
      const match = raw.match(/^(\d{4}\/\d{1,2}\/\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!match) return raw;
      const [, datePart, ampm, hStr, mStr] = match;
      let h = parseInt(hStr, 10);
      if (ampm === '下午' && h !== 12) h += 12;
      if (ampm === '上午' && h === 12) h = 0;
      return `${datePart} ${String(h).padStart(2, '0')}:${mStr}`;
    }

    // 同一格原始字串轉成可比較的 Date，供「機台分頁 R 欄」跟「活動分頁 P 欄」兩個最後更新時間比大小用；
    // 格式跟預期不符就回傳 null，呼叫端會 fallback 成只信任機台分頁那欄（跟改動前行為一致，不會因為活動分頁格式跑掉而整個「最後更新」失效）。
    function parseUpdateDate(raw) {
      const match = (raw || '').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!match) return null;
      const [, yStr, mStr, dStr, ampm, hStr, minStr, sStr] = match;
      let h = parseInt(hStr, 10);
      if (ampm === '下午' && h !== 12) h += 12;
      if (ampm === '上午' && h === 12) h = 0;
      return new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), h, parseInt(minStr, 10), sStr ? parseInt(sStr, 10) : 0);
    }

    // =============================================
    // 📥 載入 Google Sheet
    // =============================================
    export async function loadFromSheet(opts) {
      opts = opts || {};
      const silent = !!opts.silent;
      const trigger = opts.trigger || 'initial'; // 'initial' | 'auto' | 'pull'
      lastFetchTime = Date.now();
      if (!silent) {
        document.getElementById('grid').innerHTML = '<div class="empty-state">⏳ 載入資料中...</div>';
      }
      try {
        // 活動分頁只用來比「最後更新時間」，這條 fetch 失敗不該讓整個機台清單載入失敗，
        // 所以獨立 catch 成 null，後面比較時當作「沒有活動分頁時間可比」處理。
        const [response, eventsResponse] = await Promise.all([
          fetch(SHEET_CSV_URL),
          fetch(EVENTS_SHEET_CSV_URL).catch(() => null),
        ]);
        const csvText = await response.text();
        const rows = csvText.trim().split('\n');

        const firstRow = parseCSVRow(rows[1] || '');
        const machineLastUpdatedRaw = firstRow[17] || ''; // R 欄

        // 活動分頁 P 欄（機台分頁 CLAUDE.md 早已放棄的「跳過不解析」在這裡例外：
        // 只取這一格文字比較時間，不解析整份活動資料，避免拖進 events-data.js 那條鏈）
        let eventsLastUpdatedRaw = '';
        if (eventsResponse && eventsResponse.ok) {
          const eventsCsvText = await eventsResponse.text();
          const eventsRows = eventsCsvText.trim().split('\n');
          const eventsFirstRow = parseCSVRow(eventsRows[1] || '');
          eventsLastUpdatedRaw = eventsFirstRow[15] || ''; // P 欄
        }

        const machineDate = parseUpdateDate(machineLastUpdatedRaw);
        const eventsDate = parseUpdateDate(eventsLastUpdatedRaw);
        let lastUpdated = machineLastUpdatedRaw;
        if (machineDate && eventsDate) {
          if (eventsDate > machineDate) lastUpdated = eventsLastUpdatedRaw;
        } else if (!machineDate && eventsDate) {
          lastUpdated = eventsLastUpdatedRaw;
        }

        const lastUpdatedText = lastUpdated ? '最後更新：' + to24Hour(lastUpdated) : '社群共建 · 持續更新';
        ['lastUpdated', 'listLastUpdated'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = lastUpdatedText;
        });

        const locations = rows.slice(1).map(row => {
          const cols = parseCSVRow(row);
          return {
            id:        cols[0] || '',
            type:      (cols[1] || '抽卡機').trim(),
            name:      cols[2] || '',
            limited:   cols[3] || '',
            venue:     cols[4] || '',
            city:      cols[5] || '',
            addr:      cols[6] || '',
            lat:       parseFloat(cols[7]),
            lng:       parseFloat(cols[8]),
            character: cols[9] || '',
            edition:   cols[10] || '',
            perDraw:   cols[11] || '',
            image:     cols[12] || '',
            note:      cols[13] || '',
            hours:     cols[14] || '',
            // cols[15] 分享圖、cols[17] 最後更新時間，前端目前不需要，跳過不解析
            permId:    cols[16] || '', // 永久ID（Q欄，Apps Script 自動產生），分享連結用，不隨 A 欄流水號變動
          };
        }).filter(loc => loc.name && !isNaN(loc.lat) && !isNaN(loc.lng));

        // 機台↔活動自動比對（見 js/event-match.js）：活動分頁資料透過 events-data.js 的 loadEvents() 拿，
        // 跟上面「只比時間戳」那段各自獨立的 fetch 不衝突——這裡要的是完整內容，不只 P 欄時間。
        // loadEvents() 內部只抓一次、之後重複呼叫吃快取，代表活動資料在這個分頁存活期間不會再更新，
        // 機台的自動刷新仍正常運作，只是「機台↔活動」的比對結果要重新整理分頁才會反映活動端的異動。
        const eventRowsForMatch = await loadEvents().catch(() => []);
        locations.forEach(loc => {
          loc.eventMatch = matchMachineToEventRow(loc, eventRowsForMatch);
          loc.note = stripNoEventLinkTag(loc.note); // 顯示用備註要拿掉手動排除標記本身
        });

        allLocations = locations;
        currentFiltered = sortLocations(locations);
        renderGrid(currentFiltered);
        buildFilterOptions(locations);
        renderFilterBar();

        // 偵測分享連結 ?id=xxx（只在真正的初次載入處理一次；靜默背景刷新/下拉刷新不重跑，
        // 不然使用者關掉彈窗後，只要背景刷新一次就又被彈回來）
        if (!silent) {
          const params = new URLSearchParams(window.location.search);
          const urlId = params.get('id');
          const urlView = params.get('view');
          if (urlId) {
            // 有 ?id= 時走原本「單一機台分享連結」的邏輯（下方），
            // 跟「搜尋結果分享連結」互斥——一個連結只會是其中一種分享類型。
            // 永久ID是唯一「保證不會連錯機台」的比對依據，只有它比對到才自動開彈窗。
            // A 欄流水號 fallback 只用來判斷「這台機台是否還存在」，藉此避免舊格式連結
            // 被誤判成已下架——但 fallback 找到的那一列不保證還是原本分享者指的那一台
            // （A 欄之後可能被重新編號、指派給別的機台），所以 fallback 命中時不自動開彈窗，
            // 只是安靜地正常顯示首頁，不做任何可能出錯的顯示。
            const exactTarget = allLocations.find(l => l.permId === urlId);
            const legacyTarget = exactTarget ? null : allLocations.find(l => l.id === urlId);

            if (exactTarget) {
              // GA: share_link_opened（分享連結被真的點開，跟 share_click 配對可以算轉換率）
              gtag('event', 'share_link_opened', {
                machine_id: exactTarget.id,
                view: urlView === 'map' ? 'map' : 'grid',
                device: getDeviceType(),
              });
              if (urlView === 'map') {
                // 從地圖模式分享出去的連結：回到地圖模式，直接開那一台的詳情（桌機側欄／手機 bottom sheet）
                setView('map');
                if (isMobileMapLayout()) {
                  openMobileSheetSummary(exactTarget, { preferFull: true });
                } else {
                  openDesktopSidebar(exactTarget);
                }
              } else {
                const imgs = exactTarget.image ? exactTarget.image.split(',').map(u => driveUrlToImage(u.trim())).filter(Boolean) : [];
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${exactTarget.lat},${exactTarget.lng}`;
                openGridModal(exactTarget, imgs, googleMapsUrl, 'share_modal');
              }
            } else if (legacyTarget) {
              // 舊格式連結、靠 A 欄 fallback 找到列，但無法確認是不是原本那一台，刻意不顯示任何內容。
              // GA: share_link_legacy_fallback（追蹤還有多少舊連結落在這個曖昧地帶）
              gtag('event', 'share_link_legacy_fallback', { machine_id: urlId, device: getDeviceType() });
            } else {
              // 永久ID、A 欄都完全找不到，代表這一列已經整個被刪除、真的下架了
              if (typeof showToast === 'function') showToast('這台機台的資訊已經下架囉');
              // GA: share_link_target_missing（抓多少舊分享連結正在失效）
              gtag('event', 'share_link_target_missing', { machine_id: urlId, device: getDeviceType() });
            }
          } else {
            // 沒有 ?id=，改偵測「搜尋結果」狀態：?q=關鍵字&type=..&city=..&ip=..&view=map
            // 這些參數是使用者搜尋/篩選時由 syncSearchUrl() 即時寫回網址列的（不用點分享按鈕，
            // 複製網址列本身就是分享連結），這裡負責在對方打開連結時把狀態原樣還原。
            // type/city/ip 各自用逗號分隔多選值，key 沿用 FILTER_CONFIG 的 key，不用額外對照表。
            const q = params.get('q');
            const hasFilterParams = FILTER_CONFIG.some(cfg => params.get(cfg.key));
            if (q || hasFilterParams) {
              if (q) {
                document.getElementById('searchInput').value = q;
                document.getElementById('searchInputMobile').value = q;
                document.getElementById('clearSearch').style.display = 'block';
                document.getElementById('clearSearchMobile').style.display = 'block';
              }
              FILTER_CONFIG.forEach(cfg => {
                const val = params.get(cfg.key);
                if (val) filterState[cfg.key] = val.split(',').filter(Boolean);
              });
              renderFilterBar(); // 依還原後的 filterState 重新畫 pill 選中狀態
              if (urlView === 'map') setView('map');
              applyFilters();
              // GA: search_url_restored（帶著搜尋/篩選參數的網址被打開，狀態被還原）
              gtag('event', 'search_url_restored', {
                has_keyword: !!q,
                has_filter: hasFilterParams,
                view: urlView === 'map' ? 'map' : 'grid',
                device: getDeviceType(),
              });
            }
          }
        }

      } catch (err) {
        console.error('載入失敗：', err);
        if (silent) {
          // 背景／下拉刷新失敗：不清空使用者正在看的清單，只用 toast 提示
          if (typeof showToast === 'function') showToast('更新失敗，請稍後再試');
          // GA: data_refresh_error（背景/下拉刷新失敗，抓 Sheet 掛掉的頻率）
          gtag('event', 'data_refresh_error', { trigger, device: getDeviceType() });
        } else {
          document.getElementById('grid').innerHTML =
            '<div class="empty-state">❌ 資料載入失敗<br><small>請確認 Sheet 已設定公開發布</small></div>';
        }
      }
    }


    // =============================================
    // 🔍 搜尋 + 篩選
    // =============================================
    function syncCount(n) {
      document.getElementById('countBadge').textContent = n;
    }

    export function applyFilters() {
      const kw = (document.getElementById('searchInput').value || '').trim().toLowerCase();

      // 偵測搜尋關鍵字「從無到有」／「從有到無」的轉折：只有這兩個時間點要記住／還原搜尋前的層級，
      // 中途繼續打字、或機台/作品/縣市那些篩選 pill 變動，都走下面一般的「看這次變動前是哪一層」邏輯。
      const isMobile = isMobileMapLayout();
      let clearedSearch = false;
      if (isMobile) {
        if (kw && !prevSearchKw) {
          sheetLevelBeforeSearch = sheetLevel; // 從無到有：記住搜尋開始那一刻原本停在哪一層
        } else if (!kw && prevSearchKw && sheetLevelBeforeSearch != null) {
          clearedSearch = true; // 從有到無：等一下要還原成搜尋前那一層，不是看清空當下剛好停在哪
        }
      }
      prevSearchKw = kw;

      currentFiltered = allLocations.filter(loc => {
        const matchFilters = FILTER_CONFIG.every(cfg => {
          const selected = filterState[cfg.key];
          return selected.length === 0 || selected.includes(loc[cfg.field]);
        });
        const matchKw = !kw ||
          loc.name.toLowerCase().includes(kw) ||
          loc.addr.toLowerCase().includes(kw) ||
          loc.city.toLowerCase().includes(kw) ||
          loc.venue.toLowerCase().includes(kw) ||
          loc.character.toLowerCase().includes(kw) ||
          loc.edition.toLowerCase().includes(kw);
        return matchFilters && matchKw;
      });
      currentFiltered = sortLocations(currentFiltered);
      renderGrid(currentFiltered);
      syncCount(currentFiltered.length);
      syncSearchUrl(); // 網址列即時反映目前的搜尋/篩選狀態，複製網址列就等於分享這個結果

      if (map) {
        const priorLevel = clearedSearch ? sheetLevelBeforeSearch : sheetLevel; // 篩選前使用者原本停留的層級；renderMapLocations 內部會強制收到 peek，這裡要先記住才能決定要不要復原
        renderMapLocations(currentFiltered);
        if (isMobile) {
          if (clearedSearch) {
            // 清空搜尋：還原成搜尋開始前那一層，不管搜尋期間自己展開到哪
            applySheetLevel(priorLevel);
            sheetLevelBeforeSearch = null;
          } else if (priorLevel === 'peek') {
            // 原本就在 peek：有結果就展開到 mid 方便直接看，不用自己往上拉；0 筆結果維持 peek（反正只有空狀態文字）
            if (currentFiltered.length > 0) {
              applySheetLevel('mid');
              gtag('event', 'sheet_auto_expand', { device: getDeviceType() });
            }
          } else {
            // 原本已經自己拉到 mid／full 在瀏覽：篩選結果變動不去動它，復原回原本那一層
            applySheetLevel(priorLevel);
          }
        }
      }
      trackFilterResult(currentFiltered.length);
    }

    // GA: filter_result（debounce，避免打字搜尋時瘋狂觸發）
    let filterResultTrackTimer;
    function trackFilterResult(resultCount) {
      clearTimeout(filterResultTrackTimer);
      filterResultTrackTimer = setTimeout(() => {
        const hasAnyFilter = FILTER_CONFIG.some(cfg => filterState[cfg.key].length > 0);
        if (!hasAnyFilter) return; // 沒套用任何篩選（純搜尋或初始狀態）就不記錄
        gtag('event', 'filter_result', {
          type: filterState.type.join(','),
          city: filterState.city.join(','),
          ip: filterState.ip.join(','),
          result_count: resultCount,
          device: getDeviceType(),
        });
      }, 800);
    }

    function handleSearch(kw) {
      applyFilters();
    }


    // GA: 搜尋共用 debounce timer
    let searchTrackTimer;
    function trackSearch(kw) {
      clearTimeout(searchTrackTimer);
      if (kw.length < 2) return;
      searchTrackTimer = setTimeout(() => {
        gtag('event', 'search', { search_term: kw, device: getDeviceType() });
      }, 800);
    }

    document.getElementById('searchInput').addEventListener('focus', function() {
      gtag('event', 'search_box_focus', { source: 'desktop_toolbar', device: getDeviceType() });
    });
    document.getElementById('searchInput').addEventListener('input', function () {
      document.getElementById('clearSearch').style.display = this.value ? 'block' : 'none';
      trackSearch(this.value.trim().toLowerCase());
      applyFilters();
    });

    document.getElementById('searchInputMobile').addEventListener('focus', function() {
      gtag('event', 'search_box_focus', { source: 'mobile_toolbar', device: getDeviceType() });
    });
    document.getElementById('searchInputMobile').addEventListener('input', function () {
      document.getElementById('clearSearchMobile').style.display = this.value ? 'block' : 'none';
      document.getElementById('searchInput').value = this.value;
      document.getElementById('clearSearch').style.display = this.value ? 'block' : 'none';
      trackSearch(this.value.trim().toLowerCase());
      applyFilters();
    });

    document.getElementById('clearSearch').addEventListener('click', function () {
      document.getElementById('searchInput').value = '';
      document.getElementById('searchInputMobile').value = '';
      this.style.display = 'none';
      document.getElementById('clearSearchMobile').style.display = 'none';
      applyFilters(); // sheet 層級的處理（還原搜尋前那一層）已經在 applyFilters 內部做了，這裡不用再另外蓋一次
      // GA: search_clear
      gtag('event', 'search_clear', { source: 'desktop_toolbar', device: getDeviceType() });
    });
    document.getElementById('clearSearchMobile').addEventListener('click', function () {
      document.getElementById('searchInputMobile').value = '';
      document.getElementById('searchInput').value = '';
      this.style.display = 'none';
      document.getElementById('clearSearch').style.display = 'none';
      applyFilters();
      // GA: search_clear
      gtag('event', 'search_clear', { source: 'mobile_toolbar', device: getDeviceType() });
    });

    // =============================================
    // 🖱️ 事件委派（輪播、Lightbox）
    // =============================================
    document.addEventListener('click', function (e) {
      // Grid carousel
      const gridBtn = e.target.closest('[data-grid-action]');
      if (gridBtn) {
        e.stopPropagation();
        const action = gridBtn.getAttribute('data-grid-action');
        // GA: carousel_nav（精簡版，不帶 machine_id，避免同一人滑多張洗版）
        gtag('event', 'carousel_nav', { direction: action, device: getDeviceType() });
        const cid = gridBtn.getAttribute('data-grid-cid');
        const el = document.getElementById(cid);
        if (!el) return;
        const imgs = JSON.parse(el.getAttribute('data-imgs'));
        let idx = parseInt(el.getAttribute('data-index'));
        idx = action === 'prev' ? (idx - 1 + imgs.length) % imgs.length : (idx + 1) % imgs.length;
        el.setAttribute('data-index', idx);
        const img = el.querySelector('.carousel-grid-img');
        img.src = imgs[idx];
        img.setAttribute('data-lightbox', imgs[idx]);
        el.querySelector('.carousel-counter').textContent = (idx + 1) + ' / ' + imgs.length;
        return;
      }

      // Lightbox（grid）
      const lb = e.target.closest('[data-lightbox]');
      if (lb && !e.target.closest('.leaflet-popup-content')) {
        const lbMachineId = lb.closest('[data-machine-id]');
        openLightbox(lb.getAttribute('data-lightbox') || lb.src, lbMachineId ? lbMachineId.dataset.machineId : null);
        return;
      }
    });

    // Map popup: carousel + lightbox（capture mode，原始版）
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-carousel-action]');
      if (btn) {
        e.stopPropagation(); e.preventDefault();
        const action = btn.getAttribute('data-carousel-action');
        // GA: carousel_nav（精簡版，不帶 machine_id，避免同一人滑多張洗版）
        gtag('event', 'carousel_nav', { direction: action, device: getDeviceType() });
        const id = btn.getAttribute('data-carousel-id');
        const el = document.getElementById(id);
        if (!el) return;
        const imgs = JSON.parse(el.getAttribute('data-imgs'));
        let idx = parseInt(el.getAttribute('data-index'));
        idx = action === 'prev' ? (idx - 1 + imgs.length) % imgs.length : (idx + 1) % imgs.length;
        el.setAttribute('data-index', idx);
        const img = el.querySelector('.carousel-img');
        img.src = imgs[idx];
        img.setAttribute('data-lightbox', imgs[idx]);
        el.querySelector('.carousel-counter').textContent = (idx + 1) + ' / ' + imgs.length;
        return;
      }
      // Lightbox（popup）
      const img = e.target.closest('[data-lightbox]');
      if (img && e.target.closest('.leaflet-popup-content')) {
        e.stopPropagation(); e.preventDefault();
        const carouselImg = img.classList.contains('carousel-img') ? img : (img.querySelector('.carousel-img') || img);
        const popupMachineId = img.closest('[data-machine-id]');
        openLightbox(carouselImg.src, popupMachineId ? popupMachineId.dataset.machineId : null);
        return;
      }
    }, true);

    export function openGridModal(loc, imgs, googleMapsUrl, source = 'grid_modal') {
      const mid = 'modal-carousel';
      let imgHtml = '';
      if (imgs.length === 1) {
        imgHtml = `<div class="popup-img-wrap"><img src="${imgs[0]}" class="popup-img" data-lightbox="${imgs[0]}" alt="${loc.name}" /></div>`;
      } else if (imgs.length > 1) {
        imgHtml = `
          <div class="popup-img-wrap">
            <div class="carousel" id="${mid}" data-index="0" data-imgs='${JSON.stringify(imgs)}'>
              <div class="carousel-img-wrap">
                <img src="${imgs[0]}" class="carousel-img popup-img" data-lightbox="${imgs[0]}" alt="${loc.name}" />
              </div>
              <div class="carousel-controls">
                <button class="carousel-btn" data-carousel-action="prev" data-carousel-id="${mid}" aria-label="上一張圖片">&#8249;</button>
                <span class="carousel-counter">${1} / ${imgs.length}</span>
                <button class="carousel-btn" data-carousel-action="next" data-carousel-id="${mid}" aria-label="下一張圖片">&#8250;</button>
              </div>
            </div>
          </div>`;
      }

      document.getElementById('gridModalContent').dataset.machineId = loc.id;
      document.getElementById('gridModalContent').innerHTML = `
        <div class="modal-badge-row modal-type-badge">
          <div class="type-badge ${loc.type === '相卡機' ? 'photocard' : 'gacha'}">${loc.type === '相卡機' ? '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-264q72 0 120-49t48-119q0-69-48-118.5T480-600q-72 0-120 49.5T312-432q0 70 48 119t120 49Zm0-72q-42 0-69-27t-27-68q0-40 27-68.5t69-28.5q42 0 69 28.5t27 68.5q0 41-27 68t-69 27ZM168-144q-29 0-50.5-21.5T96-216v-432q0-29 21.5-50.5T168-720h120l50-67q11-14 26-21.5t32-7.5h168q17 0 32 7.5t26 21.5l50 67h120q30 0 51 21.5t21 50.5v432q0 29-21 50.5T792-144H168Z"/></svg> 相卡機' : '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m612-404 31-107q3-11-1-22t-14-18l-93-63q-8-5-16.5-2T508-604l-31 107q-3 11 .5 22t13.5 18l93 63q8 5 17 2t11-12ZM168-222l-30-15q-28-13-38-40t3-55l65-140v250Zm148 78q-31 0-53.5-20.5T240-216v-288l134 360h-58Zm206-4q-31 11-56-1t-36-43L259-660q-11-31 .5-56.5T302-753l294-107q31-11 56 .5t36 42.5l172 472q11 31-.5 56T817-253L522-148Z"/></svg> 抽卡機'}</div>
          ${getEndingBadge(loc.limited) ? `<div class="ending-badge">${getEndingBadge(loc.limited)}</div>` : ''}
        </div>
        <div class="modal-header">
          ${machineTitleHtml(loc, { source })}
        </div>
        ${loc.limited ? `<div class="popup-limited">期間限定：${loc.limited}</div>` : ''}
        <div class="modal-info-section">
          ${loc.venue ? `<div class="popup-addr">場地：${loc.venue}</div>` : ''}
          ${loc.addr ? `<div class="popup-addr">地址：${loc.addr}</div>` : ''}
          ${loc.hours ? `<div class="popup-addr">營業時間：${loc.hours}</div>` : ''}
          ${loc.character ? `<div class="popup-addr">作品：${loc.character}</div>` : ''}
          ${loc.edition ? `<div class="popup-addr">系列：${loc.edition}</div>` : ''}
          ${loc.perDraw ? `<div class="popup-addr">價格與張數：${loc.perDraw}</div>` : ''}
          ${loc.note ? `<div class="popup-addr">備註：${loc.note}</div>` : ''}
        </div>
        <div class="popup-actions">
          <a href="${googleMapsUrl}" target="_blank" class="popup-gmaps-link" onclick="trackGmapsClick('${loc.id}','${source}')"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> 在 Google Maps 查看 →</a>
          <button class="popup-share-btn" onclick="shareLocation('${loc.permId}','${loc.id}','${source}')">分享 <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-14 13.8-14 13.8-34t-13.8-34q-13.8-14-34.2-14-20.4 0-34.2 14-13.8 14-13.8 34t13.8 34q13.8 14 34.2 14Zm466-277.8q14-13.8 14-34.2 0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 14 34.2 14 13.8 34 13.8t34-13.8ZM648-216ZM216-480Zm432-264Z"/></svg></button>
        </div>
        ${imgHtml}
      `;
      document.getElementById('gridModal').classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeGridModal(e) {
      if (e && e.target !== document.getElementById('gridModal')) return;
      document.getElementById('gridModal').classList.remove('show');
      document.body.style.overflow = '';
      // GA: grid_modal_close（method 判斷邏輯比照 changelog_close：e 有值代表背景點擊，undefined 代表 X 按鈕）
      gtag('event', 'grid_modal_close', { method: e ? 'backdrop_click' : 'x_button', device: getDeviceType() });
    }

    function trackGmapsClick(id, source) {
      gtag('event', 'gmaps_click', {
        machine_id: id,
        source: source,
        device: getDeviceType(),
      });
    }

    // GA: event_title_click（機台詳情標題點進去對應活動，見 js/event-match.js machineTitleHtml()）
    function trackEventTitleClick(machineId, eventId, source) {
      gtag('event', 'event_title_click', {
        machine_id: machineId,
        event_id: eventId,
        source: source,
        device: getDeviceType(),
      });
    }

    function shareLocation(permId, machineId, source) {
      // 分享出去的連結走 /api/share?id=xxx，讓 LINE/Threads 等平台的爬蟲能讀到
      // 這個機台對應的 og:title/og:description（見 api/share.js）；
      // 真人點進來後，那支 function 會立刻導回這裡（/?id=xxx），使用體驗不變。
      // 額外帶上 view=map（僅在地圖模式分享時），讓對方點開後回到地圖模式、直接看到這一台的詳情，
      // 而不是統一收斂成列表模式的彈窗。
      // 注意：連結網址用 permId（永久不變，跨A欄重新編號依然有效），
      // 但 GA 的 machine_id 維持用 A欄 id，這樣才跟 card_click／trackGmapsClick 等其他事件的
      // machine_id 格式一致，才能在 GA 後台把同一台機台的完整路徑串起來。
      const isMapView = document.body.classList.contains('map-view');
      const url = `${window.location.origin}/api/share?id=${permId}${isMapView ? '&view=map' : ''}`;
      // GA: share_click
      gtag('event', 'share_click', { machine_id: machineId, source: source || 'unknown', device: getDeviceType() });
      if (navigator.share) {
        navigator.share({ title: 'KADO！抽卡機在哪', url });
      } else {
        navigator.clipboard.writeText(url).then(() => showToast('已複製連結！'));
      }
    }

    function showToast(msg) {
      const t = document.getElementById('share-toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }

    // =============================================
    // 📋 Bottom Sheet 手勢（mobile 地圖模式）
    // 拖曳 handle 時即時跟手；放開時依拖曳距離判斷停在哪一層。
    // 三檔（peek／mid／full）列表跟詳情共用；每次手勢最多移動一層。
    // =============================================


    function openLightbox(src, machineId) {
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightbox').classList.add('show');
      // GA: lightbox_open
      gtag('event', 'lightbox_open', {
        machine_id: machineId || null,
        device: getDeviceType(),
      });
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('show');
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    // GA: report_click（所有回報表單連結）
    document.querySelectorAll('.report-link').forEach(link => {
      link.addEventListener('click', () => {
        gtag('event', 'report_click', { device: getDeviceType() });
      });
    });



// =============================================
// 🌐 掛到 window：以下函式／變數會被「動態產生的 HTML 字串」用 onclick="..." 呼叫，
// 或是被寫死在 index.html 裡的 onclick="..." 呼叫。
// ES Module 預設不會把宣告掛到全域（window），inline onclick 屬性只能呼叫 window 上有的東西，
// 所以這裡手動補上——這是目前唯一需要為了「相容 inline onclick」而做的事，
// 之後如果想把這些 onclick 換成 addEventListener，就可以把這段刪掉。
// =============================================
window.setView = setView;
window.closeLightbox = closeLightbox;
window.closeGridModal = closeGridModal;
window.trackGmapsClick = trackGmapsClick;
window.trackEventTitleClick = trackEventTitleClick;
window.shareLocation = shareLocation;


// =============================================
// 🔄 回到前景自動刷新（節流）
// 從 pwa.js 搬過來——這兩塊（自動刷新／下拉刷新）跟「有沒有安裝成 PWA」無關，
// 一般瀏覽器分頁開著也會作用，PWA 功能移除時特意保留。
// =============================================
function maybeAutoRefresh() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - lastFetchTime < REFRESH_THROTTLE_MS) return;
  // GA: auto_refresh（通過節流門檻、真的觸發背景刷新）
  gtag('event', 'auto_refresh', { device: getDeviceType() });
  loadFromSheet({ silent: true, trigger: 'auto' });
}
document.addEventListener('visibilitychange', maybeAutoRefresh);
// 部分瀏覽器（尤其是舊版 iOS Safari／某些 in-app browser）visibilitychange 不夠可靠，focus 當備援
window.addEventListener('focus', maybeAutoRefresh);

// =============================================
// 👇 下拉刷新（僅列表模式，#gridView 捲到頂時才觸發）
// =============================================
(function initPullToRefresh() {
  const container = document.getElementById('gridView');
  const indicator = document.getElementById('ptrIndicator');
  const spinner = indicator.querySelector('.ptr-spinner');
  const PULL_TRIGGER_PX = 60;   // 拉到這個高度放開才觸發刷新
  const PULL_MAX_PX = 90;       // 視覺上限（rubber-band）
  const DAMPING = 0.5;          // 手指移動距離的實際反映比例

  let startY = 0;
  let pulling = false;   // 這次觸控是否正在做下拉手勢
  let dragY = 0;
  let refreshing = false;

  function setIndicatorHeight(px) {
    indicator.style.height = px + 'px';
    spinner.style.transform = `rotate(${Math.min(px / PULL_TRIGGER_PX, 1) * 360}deg)`;
  }

  container.addEventListener('touchstart', (e) => {
    if (refreshing) return;
    if (container.scrollTop > 0) { pulling = false; return; }
    startY = e.touches[0].clientY;
    pulling = true;
    dragY = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0].clientY - startY;
    if (diff <= 0 || container.scrollTop > 0) { pulling = false; setIndicatorHeight(0); return; }
    dragY = Math.min(diff * DAMPING, PULL_MAX_PX);
    setIndicatorHeight(dragY);
    e.preventDefault();
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    if (dragY >= PULL_TRIGGER_PX) {
      refreshing = true;
      indicator.classList.add('loading');
      indicator.style.height = PULL_TRIGGER_PX + 'px';
      spinner.style.transform = '';
      gtag('event', 'pull_to_refresh', { device: getDeviceType() });
      loadFromSheet({ silent: true, trigger: 'pull' }).finally(() => {
        refreshing = false;
        indicator.classList.remove('loading');
        setIndicatorHeight(0);
      });
    } else {
      setIndicatorHeight(0);
    }
  });

  container.addEventListener('touchcancel', () => {
    if (refreshing) return;
    pulling = false;
    setIndicatorHeight(0);
  });
})();

    // 初始化
    initTopBarScroll();
    setView('grid');
    loadFromSheet();

