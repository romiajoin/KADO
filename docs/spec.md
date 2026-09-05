# KADO!抽卡機在哪 — 規格文件

**網站網址：** https://kadotw.vercel.app/  
**GitHub Repo：** https://github.com/romiajoin/taiwan-gacha-map  
**最後更新：** 2026/09/05（v33.2；v32/v32.1 活動行事曆頁、v33 機台⇄活動自動比對、v33.1 活動詳情作品欄位＋分享動態 OG 圖已上線；v33.2 為活動分享連結改用永久ID、全站篩選「IP」更名「作品」、桌機地圖模式恢復顯示 FAB、活動分類色碼文件修正，尚未 push 上線）

---

## 專案概述

社群共建的台灣抽卡機 / IP 快閃活動查詢網站，資料由管理者維護於 Google Sheet，網站自動讀取並顯示。

---

## 技術架構

| 項目 | 工具 |
|------|------|
| 前端 | 純 HTML / CSS / JavaScript（ES Modules，檔案結構見 README.md） |
| 地圖套件 | Leaflet.js 1.9.4（OpenStreetMap 底圖，免費） |
| 資料來源 | Google Sheet（發布為公開 CSV） |
| 圖片託管 | Cloudinary |
| 網站託管 | Vercel（免費） |
| PWA | 已於 v31 移除；`sw.js` 保留自我卸載用途，見下方「PWA / 加到主畫面」 |
| 字體 | Chiron GoRound TC（400/500/700）、Space Mono（統計數字）|
| 訪客計數 | 自架 Cloudflare Worker + KV |
| 數據分析 | Google Analytics 4（GA4） |

**不需要後端、不需要資料庫、不需要 API 金鑰。**

---

## Google Sheet 欄位規格

| 欄 | 欄位 | 說明 | 必填 |
|----|------|------|------|
| A | id | 流水號，僅供 Sheet 內部排序/管理，不再是分享連結的依據（手動填入，勿用公式） | ✅ |
| B | 類型 | 機台類型（抽卡機 / 相卡機） | ✅ |
| C | 店名 | 活動或地點名稱；屬於某檔期間限定活動時直接填該活動的標題，是「機台⇄活動自動比對」的比對依據之一（v33，見下方「機台⇄活動自動比對」） | ✅ |
| D | 期間限定 | 活動日期（如：2026/05/29～2026/07/23） | ❌ |
| E | 場地 | 所在建築或商場（如：三創生活 7F） | ❌ |
| F | 縣市 | 縣市名稱（如：台北市） | ❌ |
| G | 地址 | 詳細地址（含縣市） | ✅ |
| H | 緯度 | 數字，用於地圖定位 | ✅ |
| I | 經度 | 數字，用於地圖定位 | ✅ |
| J | 作品 | 熱門角色或 IP 名稱 | ❌ |
| K | 系列 | 如：第一彈,第二彈 | ❌ |
| L | 價格與張數 | 如：50元/2張 | ❌ |
| M | 圖片 | Cloudinary 網址（多張用逗號分隔） | ❌ |
| N | 備註 | 補充說明；填入 `【不連結活動】`／`[不連結活動]` 可讓這台機台永遠不被自動比對到活動（v33，見下方「機台⇄活動自動比對」），顯示時會拿掉這段標記文字 | ❌ |
| O | 營業時間 | 如：週一至週日 11:00–22:00 | ❌ |
| P | 分享圖 | 社群平台分享預覽用的專屬縮圖，Cloudinary 網址（v28 新增） | ❌ |
| Q | 永久ID | 分享連結真正比對的依據，新增資料時由 Apps Script（`permanent-id.gs`）自動產生，一旦產生絕對不能手動修改或重複使用（v30.4 新增） | 系統自動填入 |
| R | 最後更新時間 | 只有第一列（標題列下方那一列）會填。**v32.1 起**：同時跟活動分頁 P 欄的時間戳比較，取較新的一個顯示 | 僅第一列 |

> 緯度經度可以用 Google Maps 點地點後取得。  
> 欄位為空時，對應資訊不顯示，不影響版面。
> **v30.4 起欄位順序大幅調整**（期間限定從 K 移到 D），且新增 P/Q/R 三欄；程式碼相關細節（`parseCSVRow` 欄位對照、永久ID機制原理）見 `CLAUDE.md`。

### 活動行事曆分頁（events.html 用，另開一個分頁）

| 欄 | 欄位 | 說明 |
|----|------|------|
| A | id | 流水號 |
| B | 類型 | 對應 `EVENT_CATEGORIES`：POP-UP／展覽／其他／CAFÉ・餐廳／特典活動，字串需完全一致，Google 表單下拉選單要同步維護 |
| C | 活動標題 | 跟機台分頁「店名」欄搭配「期間限定」，是「機台⇄活動自動比對」的比對依據（v33，見下方「機台⇄活動自動比對」） |
| D | 期間限定 | 格式同機台分頁的 `limited`（`yyyy/MM/dd～yyyy/MM/dd`） |
| E | 場地 | |
| F | 縣市 | |
| G | 地址 | |
| H / I | 緯度 / 經度 | |
| J | 作品（IP） | |
| K | 圖片 | Cloudinary／Drive 網址，多張用逗號分隔 |
| L | 更多資訊 | 連結，詳情彈窗固定顯示「查看 →」 |
| M | 營業時間 | |
| N | 分享圖 | 社群平台分享預覽用的專屬縮圖，Cloudinary 網址，選填（v33.1 新增啟用，見下方「分享連結 OG Meta（活動版）」） |
| O | 永久ID | 分享連結真正比對的依據，比照機台 Q 欄，由 Apps Script（`permanent-id.gs`）自動產生，一旦產生絕對不能手動修改或重複使用（v33.2 新增啟用，見下方「分享連結永久ID機制（活動版）」） |
| P | 最後更新時間 | 只有第一列會填。**v32.1 起啟用**：跟機台分頁 R 欄比較，取較新的一個顯示（見下方「最後更新資訊」） |

> 同一檔活動在多個城市開時，每個地點各自填一列；網站依「標題＋期間」自動合併成同一組（見下方「活動行事曆」章節的「分組」說明）。

---

## 功能規格

### 訪客計數 Banner
- 位置：header 正上方，全寬橫幅
- 文字：「已經有 N 人來找過抽卡機」，置中顯示
- 數字樣式：Space Mono Bold
- 顏色：`--fill-blue`（文字與數字）、`--fill-blue-8`（背景）
- 資料來源：自架 Cloudflare Worker + KV（`visitor-counter.gillsponge-601.workers.dev`），page view 計數（每次載入 +1）；v30 起取代原本的第三方 counterapi.dev
- API 失敗時靜默隱藏，不影響其他功能
- v22 修正：曾被 Service Worker 誤快取導致數字凍結（`sw.js` catch-all 規則把 counter API 也當成殼層資源快取），改為指定該請求繞過快取、每次都真的打網路，詳見 `CLAUDE.md`
- v26 起：mobile 列表模式下併入頂部工具列，跟 header/toolbar/filter-bar 一起滑動隱藏/顯示，見下方「列表模式（Grid View）」

### Header
- 右側由左至右：最後更新時間 ｜ 回報表單 ｜ 更新日誌 　[列表][地圖]（v27 新增「更新日誌」連結）
- 回報表單：灰色文字（`--fill-gray`），hover 變藍，`target="_blank"` 開新分頁
- 更新日誌：灰色文字（`--fill-gray`），hover 變藍（v27 新增，樣式與回報表單一致）
- View Toggle：768px 以下隱藏文字標籤，只顯示 icon；padding 調整為 `8px 10px`
- 手機版列表模式：header 右側只留 icon toggle，「回報表單／更新日誌」連結改放在列表上方同一排 meta 資訊裡（跟最後更新時間同一行）

### 更新日誌（v27 新增）
- **進入點**：桌機 header「最後更新｜回報表單」右側新增「更新日誌」連結；手機列表模式同一排 meta 資訊也同步加上（開發時發現 mobile 隱藏清單漏了新連結，已修正，詳見 `CLAUDE.md`）
- **資料來源**：根目錄 `changelog.json`（跟 `manifest.json` 同層），欄位為 `date`/`version`/`text` 三欄；`text` 可為單一字串，也可為陣列（同一天多筆更新，各自變成一個 bullet）；`version` 僅供內部對照，不顯示給使用者
- **顯示方式**：不共用既有的 `grid-modal`（機台詳情，寬度太窄）或 `filter-sheet`（篩選排序 bottom sheet，多段拖曳手勢太複雜），另起一套簡單版：
  - 桌機：置中 modal，`max-width: 480px; max-height: 80vh`
  - 手機：純 CSS media query 切成貼底單一高度 sheet，`max-height: 70vh`，**不做**拖曳/snap 手勢
- 標題下方有一行署名「made by @yywggwyy」（Space Mono，灰字）
- **z-index**：2300，蓋過篩選/排序 sheet（2200/2201）（v31 起 A2HS banner 已移除，不再是這個排序考量的一部分）
- **快取策略**：`changelog.json` 走 network-first（跟 Google Sheet 資料一樣），不落入殼層 cache-first 規則，確保只更新內容不動殼層檔案時，已安裝 PWA 的使用者也能看到新條目
- GA4 事件：`changelog_open`／`changelog_close`，詳見下方事件表

### GA4 自訂事件追蹤
| 事件名稱 | 觸發時機 | 參數 |
|---|---|---|
| `search_box_focus` | 點擊搜尋框 | `source`（desktop_toolbar/mobile_toolbar）, `device` |
| `search` | 輸入關鍵字（debounce 800ms） | `search_term`, `device` |
| `filter_click` | 點擊篩選面板/sheet 裡的選項 | `filter_type`, `filter_value`, `filter_state`, `device` |
| `filter_panel_open` / `filter_panel_close` | 打開/主動關閉篩選面板或 sheet | `filter_type`, `had_selection`（close 才有）, `device` |
| `filter_clear` | 點擊篩選 pill 上的清除（X）icon，且該類別當下有套用中的篩選（v22 起從全域清除按鈕改為單一 pill 各自清除） | `filter_type`, `device` |
| `filter_result` | 篩選結果更新（debounce 800ms） | `type`, `city`, `ip`, `result_count`, `device` |
| `view_toggle` | 切換列表 / 地圖 | `view_mode`, `device` |
| `card_click` | 點擊機台卡片 | `machine_id`, `machine_name`, `machine_type`, `source`（v23 起補上 `device`；`source` 新增 `map_sidebar_list`，v23 前桌機側欄無列表可點，這條路徑是死的） |
| `map_marker_click` | 直接點地圖圖示 | `machine_id`, `machine_type`（v30.1 新增，單一機台才有值）, `machine_count`, `device` |
| `gmaps_click` | 點擊 Google Maps 連結 | `machine_id`, `source`, `device` |
| `share_click` | 點擊分享按鈕（v24 補上 `device`） | `machine_id`, `source`（grid_modal/share_modal/map_detail_panel）, `device` |
| `lightbox_open` | 點圖放大 | `machine_id`, `device` |
| `carousel_nav` | 輪播圖切換（v24 補上 `device`） | `direction`, `device` |
| `sheet_toggle` | 手機地圖模式拖拉 bottom sheet（v24 補上 `device`） | `state`（v23 起為 `peek`/`mid`/`full`/`content`，取代原本的 `open`/`peek`）, `device` |
| `sheet_auto_expand`（v23） | 搜尋/篩選出結果，sheet 從 peek 自動展開到 mid | `device` |
| `detail_panel_close`（v23） | 使用者主動關閉詳情面板/sheet（篩選/搜尋改變觸發的重置不算） | `method`（`x_button`/`empty_map_tap`/`popup_native_close`）, `device` |
| `report_click` | 點擊回報表單連結（v24 補上 `device`） | `device` |
| `auto_refresh`（v24） | 回到前景後，通過節流門檻（距上次抓取超過 30 分鐘）、真的觸發背景刷新 | `device` |
| `pull_to_refresh`（v24） | 列表模式下拉手勢超過觸發門檻（60px）放開 | `device` |
| `data_refresh_error`（v24） | 靜默刷新失敗（auto 或 pull 觸發的刷新，初次載入失敗不算） | `trigger`（auto/pull）, `device` |
| `share_link_opened`（v24；v30.4 起限定永久ID精準比對成功） | 分享連結的 `?id=` 精準比對到永久ID | `machine_id`, `view`（map/grid）, `device` |
| `share_link_legacy_fallback`（v30.6） | 永久ID比對失敗，退回比對 A 欄流水號有找到（舊格式連結），此時不自動開啟任何內容 | `machine_id`, `device` |
| `share_link_target_missing`（v24） | 分享連結的 `?id=` 永久ID跟 A 欄流水號都找不到對應機台（已下架/刪除） | `machine_id`, `device` |
| `a2hs_engagement_met`（v21，⚠️ v31 停用） | ~~累計查看詳情達 3 次，或單次停留超過 20 秒~~——不再觸發 | `reason`, `platform` |
| `a2hs_banner_shown`（v21，⚠️ v31 停用） | ~~加到主畫面 banner 顯示~~——不再觸發 | `platform` |
| `a2hs_banner_dismissed`（v21，⚠️ v31 停用） | ~~關閉加到主畫面 banner~~——不再觸發 | `reason` |
| `a2hs_prompt_result`（v21，⚠️ v31 停用） | ~~Android 原生安裝視窗的使用者選擇~~——不再觸發 | `outcome`, `platform` |
| `pwa_installed`（v21，⚠️ v31 停用） | ~~PWA 安裝完成~~——不再觸發 | `platform`, `source` |
| `pwa_launch_mode`（v21，⚠️ v31 停用） | ~~每次載入判斷 standalone/browser 開啟~~——不再觸發 | `mode` |
| `sort_change` | 選擇排序方式並實際套用（v22） | `sort_key`, `device` |
| `geo_permission_result` | 距離排序觸發定位請求後取得結果（v22） | `geo_result`, `device` |
| `changelog_open`（v27） | 打開更新日誌 modal/sheet | `source`（header_desktop/header_mobile_list）, `device` |
| `changelog_close`（v27） | 關閉更新日誌 modal/sheet | `method`（x_button/backdrop_click）, `device` |
| `sort_panel_open`（v30.3） | 打開排序 dropdown（桌機）或 bottom sheet（手機） | `device` |
| `sort_panel_close`（v30.3） | 使用者主動關閉排序面板/sheet（選了排序選項導致的自動收合不算，見 `CLAUDE.md`） | `method`（toggle_button/outside_click/switch_panel/x_button/backdrop_click）, `device` |
| `search_clear`（v30.3） | 點擊搜尋框的清除（X）按鈕 | `source`（desktop_toolbar/mobile_toolbar）, `device` |
| `grid_modal_close`（v30.3） | 關閉列表模式的機台詳情彈窗 | `method`（x_button/backdrop_click）, `device` |
| `search_url_restored`（v30.8） | 帶著搜尋/篩選參數（`?q=`/`?type=`/`?city=`/`?ip=`）的網址被打開、狀態被還原的那一刻 | `has_keyword`, `has_filter`, `view`（map/grid）, `device` |

詳細觸發規則與防誤觸機制見 `CLAUDE.md`。

### 分享單一地點（v30.4 起改用永久ID）
- URL 格式：`kadotw.vercel.app/api/share?id=<permId>`（v20 改為經過 serverless function，見下方「分享連結 OG Meta」；**v30.4 起 `<id>` 是永久ID，不是 A 欄流水號**，原因與機制見 `CLAUDE.md`「分享連結永久ID機制」）；v24 起在地圖模式分享時額外帶上 `&view=map`
- 地圖 popup、詳情側邊欄/sheet、grid modal 各有一個分享按鈕
- 手機：`navigator.share()` 跳出原生分享選單
- 桌機：`clipboard.writeText()` + toast 提示「已複製連結！」
- 真人點擊分享連結後會先短暫經過 `/api/share`，立刻被導回 `/?id=<permId>`（地圖模式分享的連結則是 `/?id=<permId>&view=map`），資料載入後偵測參數，view=map 時切換到地圖模式並直接展開該機台詳情（桌機側欄 / 手機 bottom sheet 以 preferFull 模式展開，高度貼合內容）；無 view 參數時行為同原本，自動開對應地點的 grid modal
- **三段式判斷**（v30.6）：永久ID精準比對成功才自動開啟詳情；比對失敗但 A 欄流水號比對到（修正上線前的舊格式連結，機台可能還在但不確定是不是原本那一台）則安靜不顯示任何內容；兩者都找不到才顯示 toast「這台機台的資訊已經下架囉」

### 分享連結 OG Meta（v20 新增，v28.3 改為動態換圖，v30.4 改用永久ID優先比對，v30.7 拿掉 A 欄 fallback）
- 社群平台（LINE / Threads / Discord / Facebook）的爬蟲不執行 JavaScript，只讀 `<head>` 裡的 `og:title`/`og:image`，所以分享連結改指向一支 serverless function（`api/share.js`）：
  - 標題：「kado！抽卡機在哪」
  - 描述：「想找抽卡機 / 相卡機？到「kado！抽卡機在哪」找找，快速掌握最新的機台資訊！」
  - 圖片：**依機台動態換圖（v28.3 起）**——依 `?id=` 到 Google Sheet CSV 找對應機台的專屬分享圖欄位，**v30.4 起優先比對永久ID**；**v30.7 起拿掉「找不到才退回比對 A 欄流水號」的 fallback，統一只認永久ID**——找不到該 id（含舊格式 A 欄連結）、欄位空白、或抓取失敗，都 fallback 回固定的 `/og.png`（1200×630）
- **導回目標（v30.7 調整）**：永久ID比對成功、或 Sheet 一時抓取失敗無法確定時，導去 `/?id=<id>`（地圖分享額外帶 `&view=map`）；確定找不到對應機台時改導去首頁 `/`，不再嘗試導去可能對應到別台機器的機台頁
- 真人訪客會被 JS `location.replace()` 導回正常網站；**不用** `<meta http-equiv="refresh">`（Facebook 爬蟲會跟著跳走，抓到跳轉後頁面的 meta 而不是我們寫的內容）
- 部署上需要專案根目錄有 `package.json`、`og.png` 放在根目錄（不是 `public/`），細節見 `CLAUDE.md`

### 首頁 /?id= 動態 OG Meta（v30.7 新增，`api/index.js`）
- 先前只有走 `/api/share?id=xxx` 才有依機台換圖的 OG 標籤；若使用者把（真人點擊分享連結後跳轉到的）`/?id=xxx` 網址列直接複製再分享一次，爬蟲抓到的是純靜態頁面，完全沒有 OG 標籤
- 透過 `vercel.json` 的 rewrite 把 `/` 導去新增的 `api/index.js` 處理：依 `id` 查永久ID對應的分享圖，動態塞進 SPA 殼層的 `<head>` 再回傳完整 SPA 內容（不是導轉頁），`js/main.js` 讀取 URL 參數顯示機台的邏輯不受影響
- 只有帶 `id` 時才會打 Google Sheet，一般首頁流量不受影響
- `sw.js` 同步調整：`/` 帶 `id` 參數的請求視為 no-cache（內容依 Sheet 資料動態變化，不能被殼層快取卡住舊版縮圖）
- **⚠️ 這支自 v30.7 上線後其實從未真的生效過，直到 v30.9 才修好**：Vercel 的路由優先權是「同路徑的靜態檔案 > `vercel.json` 的 rewrites」；當時專案根目錄的 SPA 殼層仍叫 `index.html`，`/` 這個請求會直接命中這個靜態檔案，`"/" -> "/api/index"` 的 rewrite 規則永遠排不到、`api/index.js` 形同虛設——不管是 `/?id=` 分享連結，還是後面 v30.8 的「搜尋結果分享連結」，社群平台爬蟲抓到的其實一直是完全沒有 og:image 的空殼。修法：把 SPA 殼層檔案改名成 `app.html`（`api/index.js` 改讀這個檔名），讓 `/` 不再對應任何實體檔案，rewrite 才會真的接手；`events.html` 裡原本寫死的 `href="index.html"` 一併改成 `href="/"`，`sw.js` 的 `SHELL_ASSETS` 移除已經不存在的 `/index.html`（否則 `cache.addAll()` 會因為抓不到而讓整個 SW 安裝失敗），`vercel.json` 新增 `/index.html -> /` 的 301 redirect 相容舊的直接連結

### 搜尋結果網址即時同步（v30.8 新增）
- **不是分享按鈕，是網址列本身就是分享連結**：使用者搜尋或套用篩選時，網址列即時同步更新（`history.replaceState`，不新增瀏覽紀錄、不觸發真正的頁面跳轉），複製網址列貼給別人，對方點開就會看到同樣的搜尋結果，不需要額外點擊任何東西產生連結
- **URL 格式**：`?q=關鍵字&type=..&city=..&ip=..&view=map`——`q` 是搜尋關鍵字；`type`/`city`/`ip` 對應三個篩選維度目前選中的值，多選用逗號分隔（如 `city=臺北市,新北市`）；`view=map` 沿用單一機台分享連結已在用的同一個參數，代表分享當下是地圖模式
- **跟單一機台分享連結（`?id=`）是兩種獨立、互斥的機制**：`?id=` 存在時一律走單一機台那條路徑，完全不看 `q`/`type`/`city`/`ip`；`?id=` 不存在時才檢查這組參數
- **不涉及 serverless function**：直接指回網站本身，用網站預設的 OG 圖，不像單一機台分享需要動態換圖（搜尋結果沒有「這一筆專屬圖片」可換）
- **刻意不含排序狀態**：距離排序依賴分享者當下的定位座標，帶進連結對收件人沒有意義
- 落地時（帶著上述參數開啟網址）會還原搜尋框內容與篩選 pill 選中狀態，並依 `view` 參數切換列表/地圖模式

### PWA / 加到主畫面（v21 新增，v31 移除）
**已於 v31 移除**：不再支援加到主畫面／離線快取／安裝提示 banner。移除原因與細節見 `CLAUDE.md`「PWA / 加到主畫面」章節（保留完整歷史記錄，方便之後想重新啟用時參考）。`manifest.json`／`icons/` 資料夾原檔案保留但未連結；`sw.js` 改寫成自我卸載版本，讓已經安裝過的舊使用者下次連網時自動清乾淨、退回一般網頁模式。

### 自動刷新 + 下拉刷新（v24 新增，v31 起與 PWA 脫鉤）
這兩個功能原本因為「PWA standalone 模式沒有瀏覽器重整按鈕」而生，但功能本身跟裝置是否安裝成 PWA 無關，一般瀏覽器分頁開著一樣作用；v31 PWA 功能移除時保留，程式碼從 `js/pwa.js` 搬進 `js/main.js`，邏輯未變。
- **自動刷新**：回到前景（`visibilitychange`/`focus`）時，若距上次成功抓取超過 30 分鐘（`REFRESH_THROTTLE_MS`），靜默刷新資料（不清空列表、失敗只顯示 toast）；節流是為了避免短時間切來切去連打 API
- **下拉刷新**：列表模式（`#gridView`）捲到頂端時，往下拉超過 60px 放開即觸發刷新；繞過節流（使用者主動操作，應無條件給最新資料）；地圖模式不支援（手勢衝突）

### 地圖（23.6N, 121.0E），預設縮放層級 8
- 地標圖示（v20 重做）：自訂圓形 `L.divIcon`，抽卡機橘色、相卡機綠色，圖示沿用 type-badge 同一套 SVG；不再是 🎰 emoji
- 同座標多台機器共用一個 marker，右上角顯示數量角標
- 點單一地點 marker → **不會**跳出 Leaflet popup，改成 mobile 開 bottom sheet、desktop 在側邊欄顯示詳情
- 點同座標多機（cluster）marker → 跳出浮動 Leaflet popup 顯示清單，選其中一項才顯示完整詳情
- 桌機版 popup（僅 cluster 會用到）`max-height` 依內容撐開，`maxWidth: 420`

### 彈窗（cluster popup、地圖側邊欄/sheet 詳情、列表模式詳情彈窗）
內容一致，顯示以下資訊（有資料才顯示）：
1. 店名（粗體標題，右上角固定 ✕ 關閉按鈕，跟 badge 群組同一個 flex row 垂直置中）
   - **badge 群組（v30.5 新增倒數 badge）**：type-badge（抽卡機/相卡機）跟倒數 badge（即將結束才顯示，見下方「倒數 Badge」）用 `.modal-badge-row` 緊鄰排在一起（`gap:8px`，不做兩端對齊），這組再跟關閉鈕維持原本的 `space-between`
2. 期間限定（圓角框）
3. 資訊欄（純文字標籤，無 icon）：場地、地址、IP、彈數、一抽張數、營業時間、備註
4. 前往 Google Maps 查看 →（藍色連結）
5. 圖片（width: 100%，height: auto，依原始比例顯示；多張支援輪播）

cluster popup（同座標多機清單）另外有一層：先顯示「這裡有 N 台機器」清單，清單項目優先顯示 IP、店名相同時隱藏重複的次要文字，選了其中一項才會顯示上面這份完整內容。

### 列表模式（Grid View）
- 格狀排版（手機 1 欄、桌機響應式多欄）
- 卡片半透明背景 `rgba(235,235,245,0.16)`，hover 顯示黃色邊框
- Tags：白色文字 + 白色邊框 + 半透明背景
- 「詳情」按鈕：青色實心 `#00c2a8`，黑色文字，↗ 圖示，點擊開啟彈窗
- **mobile 頂部工具列滑動隱藏（v26 新增）**：header + toolbar + filter-bar + 訪客計數 banner（`#topBar`）在手機列表模式下往下滑隱藏、往上滑（哪怕滑一點點）立刻出現，捲到頂端附近一律保持顯示；只在列表模式生效，地圖模式的工具列維持原本 static，不會跟著滑動
- **filter-bar 到第一張卡片的間距（v26 調整）**：mobile 列表模式下為 12px（原本 24px，filter-bar 自身 padding-bottom 在列表模式歸零）；地圖模式的 filter-bar 間距未變動

### 地圖模式詳情面板（v20 重做，v23 大幅改版）
**桌面版**
- 固定寬 400px，**常駐顯示**，不是點了才出現
- 預設內容改為**可捲動的地點卡片列表**（v23 起，取代原本的提示文字），跟列表模式共用同一套卡片渲染
- 點單一地點 marker、側欄列表卡片，或 cluster popup 清單裡的項目 → 顯示該筆完整詳情
- 收回：點面板上的 X，或點地圖空白處 → 換回列表（面板本身不會消失/隱藏），並捲動到最後選中那張卡片的位置（對齊頂部）
- 切走列表模式再切回地圖模式，維持原本選中的詳情不變

**手機版（bottom sheet，v23 重寫，共用系統取代原本的固定高度）**
- 高度分三檔，**列表跟詳情共用同一套**：`peek`（裝置高 0.12，只露出拉桿 + 卡片頂端一小截）、`mid`（裝置高 0.32）、`full`（貼齊上方篩選列下緣，動態計算，不會蓋住搜尋框/篩選器）
- 預設狀態（沒選任何地點）改為**可捲動的地點卡片列表**（取代原本的提示文字），跟桌機、列表模式共用同一套卡片渲染
- 詳情內容依實際高度決定 sheet 高度：內容撐不滿 `mid` 就縮到內容實際高度（不留空白），此時拖曳上限也是內容高度、不是 `full`，避免內容很短卻能拖出一大片空白；內容撐得滿或更高就開在 `mid`，可再手動拖到 `full` 捲動看完
  - v28 修正：這套「依內容高度調整」原本只有分享連結進來（`preferFull`）那條路徑會套用，使用者手動拖曳到 `full` 一律用固定高度，內容較短時下方會留白；修正後手動拖到 `full` 同樣套用內容高度計算，詳見 `CLAUDE.md`
  - v28.2 修正：內容 ≥ `full` 時，上滑拖曳卡在 `mid` 附近上不去 `full`——`touchend` 改成依放開瞬間實際高度找最近一階（不再固定只跳一階），內容量測也改成先等內容裡的圖片載入完才量高度（未載入的 `<img>` 是 0px，導致有圖片的長內容被誤判成短內容），詳見 `CLAUDE.md`
- 從列表點卡片進入詳情，關閉後回到選中前的那個層級；從地圖 marker 或 cluster popup 進入詳情，關閉後一律回到 `peek`——即使在 popup 裡切換到別的機台、別的聚合點，只要最一開始是從列表進來的，這個記憶都會保留到真正關閉那一刻
- 點聚合 marker 時，sheet 先收到 `peek`，讓地圖空間空出來顯示 popup；點地圖空白處也會收合 sheet（僅限有詳情或 popup 開著時，單純瀏覽列表不受影響）
- 關閉詳情、回到列表時，捲動到最後選中那張卡片的位置（對齊頂部），不是回到列表頂端，也不是還原成點擊當下原本捲到哪裡
- 搜尋/篩選出結果時，若 sheet 目前收在 `peek`，自動展開到 `mid` 方便直接看結果；使用者若已經手動拉開到 `mid`/`full`，不會被強制改動；清空搜尋時還原成搜尋前的層級，而非搜尋期間自動展開後的層級
- 搜尋框/篩選器跟列表模式共用同一組元件，不再有地圖模式專屬的搜尋框

### 篩選
- 三個篩選維度，各自一個 dropdown pill：機台類型、縣市、IP，均為多選
- **桌面版**：點 pill 在下方展開錨定 popover 面板，選項為 chip，點擊即時套用（無需確認按鈕）；已選 1 項時 pill 直接顯示該值全名，選 2 項以上顯示「類別 (n)」
- **手機版**：改用 bottom sheet（標題「{類別}篩選」+ 右上角關閉鈕），header 固定不隨選項列表捲動；選項區塊整包置中、內部每列靠左對齊
- 縣市選項固定顯示全部 22 個（`TW_CITY_ORDER` 自訂順序），不受目前資料是否涵蓋該縣市影響；IP、機台類型選項則是動態去重
- IP 選項上方有一行排序說明：「依「數字 → 筆畫 → 英文」排序，可滑動尋找」（v20 新增，排序邏輯本身沒變，只是補上說明文字）
- 篩選 pill 選取後（`.active`）右側 icon 從 chevron 換成清除（X）icon，點擊只清除該 pill 所屬類別的篩選值（v22 起改為單一 pill 各自清除，不再有全域「清除篩選」按鈕）
- 篩選與搜尋同時作用（交集）
- 篩選結果為 0 筆時，地圖模式的詳情面板會顯示「找不到符合的地點」（v20 補回，改版時一度遺漏）
- 類型 Badge 顯示於：列表卡片左上角、詳情 Modal、地圖 Popup（樣式與篩選 UI 無關，維持原本設計）
  - 抽卡機：背景 `#00c2a8`，黑字，`border-radius: 4px`，icon：Material Symbols playing_cards（FILL1）
  - 相卡機：背景 `#ffcf48`，黑字，`border-radius: 4px`，icon：Material Symbols photo_camera（FILL1）

### 倒數 Badge（v23 新增，v30.5 擴及詳情彈窗）
- 顯示於列表卡片，跟類型 badge 同一個 row（`.card-badge-row`），類型 badge 靠左、倒數 badge 靠右
- **v30.5 起，grid modal、地圖側邊欄/sheet 詳情、cluster popup 選項後的詳情也會顯示**（跟卡片版共用同一個判斷函式，版型改用 `.modal-badge-row` 緊鄰排列，不做兩端對齊，見上方「彈窗」段落）
- 只在期間限定活動結束日 3 天內顯示：今天結束顯示「最後一天」，明天結束顯示「倒數 2 天」，後天結束顯示「倒數 3 天」；超過 3 天，或機台沒有期間限定日期，都不顯示
- 背景 `#FFCF48`，黑字

### 排序（v22 新增）
- 位於篩選 pill 列右側，與 pill 間隔 16px，純文字＋chevron（無 pill 外框），單選
- **桌面版**：點擊展開錨定 dropdown；**手機版**：文字換行為兩行（類別／方向），點擊開 bottom sheet；兩者互斥，開一個會自動收合另一個以及篩選面板/sheet
- 四個選項：結束日期近到遠（default）、結束日期遠到近（v30.3 新增）、距離近到遠、距離遠到近
- **結束日期排序**：有結束日期的機台依方向排序，無期限的常態機不管哪個方向都一律排最後（沒有結束日不算「最遠」，是另一種狀態），彼此之間依 IP 名稱（`localeCompare('zh-Hant')`）排序
- **距離排序**：Haversine 公式計算直線距離，需先取得使用者定位（`navigator.geolocation`）；已拒絕過的授權狀態存 `localStorage`（`geo_permission_denied`），之後不會再重複觸發瀏覽器權限彈窗，直接顯示提示文字
- 定位失敗時依原因顯示不同提示：已知拒絕過／本次拒絕／逾時／裝置不支援，四種文案分開，避免使用者誤判問題出在哪

### 搜尋
- 搜尋框可搜尋：店名、地址、縣市、IP 角色、場地
- 即時過濾，不需按 Enter
- 地圖模式（不分手機/桌機）：搜尋框跟列表模式共用同一組元件跟位置，不再有地圖模式專屬的搜尋框（v20 移除）
- 列表模式手機版：`#searchInputMobile`（`.search-box-mobile`，`font-size: 16px` 防 iOS zoom）
- 列表模式桌機版：`#searchInput`（`.search-box-desktop`）

### 最後更新資訊
- PC header：`#lastUpdated`（`.header-info`，Space Mono 14px，fill-black）
- Mobile list mode：`#listLastUpdated`，位於 `#gridView` 內、卡片上方，隨卡片捲動（12px / weight 400 / text-align center）
- ~~Mobile map mode `#mapLastUpdated`~~：v20 移除（地圖模式詳情面板改版後，這排資訊沒有合適的位置放，整個拿掉了）
- **v27 修正：24 小時制**——Google Sheet 儲存格原始格式是 12 小時制（例如 `2026/7/14 下午 8:33:00`），新增 `to24Hour()` 轉換函式並拿掉秒數；格式跟預期不符就直接回傳原字串，不讓「最後更新」整行消失。這個修正同時緩解了 `.report-link`/`.changelog-link` 因 `white-space: nowrap` 不縮小換行、壓力集中在日期文字上導致提早換行留白的問題，詳見 `CLAUDE.md`
- **v32.1 新增：跨分頁比較**——`js/main.js`（`app.html`）、`js/events-header.js`（`events.html`）都改成同時 fetch 機台分頁（R 欄）跟活動分頁（P 欄）兩個時間戳，各自轉成可比較的 `Date`（`parseUpdateDate()`），取較新的一個顯示。任一格格式不符、或活動分頁 fetch 失敗，都 fallback 回只信任機台分頁 R 欄（跟 v32.1 之前行為一致），不會讓「最後更新」整個消失；`events-header.js` 原本就不 import `main.js`（見「為什麼是獨立頁面」），這裡是各自重複一份同樣的比較邏輯，延續專案既有「各檔案自帶所需常數/邏輯」慣例，詳見 `CLAUDE.md`

### 地點數量顯示
- Toolbar：`74 個地點`（數字青色 `#00c2a8`，20px bold；「個地點」文字同為 20px regular）
- 地圖手機版列表區右側

---

## 活動行事曆（`events.html`，v32 新增，v33 起隨機台頁互相連結，v33.1 補作品欄位／分享 OG 圖，已上線）

跟 `app.html` 是完全獨立的頁面（不是同頁的 overlay/modal），透過 header／右下角 FAB 互相導覽。目的是整理「非常駐機台」的實體活動：動漫快閃店、聯名展覽、簽名會、CAFÉ／餐廳聯名、特典活動。資料讀取同一份 Google Sheet 的另一個分頁（見上方「活動行事曆分頁」欄位規格）。

### 為什麼是獨立頁面、獨立一批 JS 檔案
`app.html` 的 `main.js` 頂層會連帶載入 `filters.js`／`sort.js`／`map.js`／`scroll.js`，這些模組的初始化都預期 `app.html` 才有的 DOM（例如 `#filterSheetOverlay`、`#sortSheetOverlay`），直接在 `events.html` 上執行會噴錯、整條 import chain 中斷。因此：
- `events.js` 不 import `main.js`，改成獨立掛載自己的一套渲染邏輯
- 兩邊都要用到的零依賴邏輯（縣市清單、倒數 badge、圖片網址轉換、距離計算）搬到 `utils.js`（見下方「共用工具搬遷」），讓兩邊各自 `import` 不互相牽連
- 「最後更新」時間戳只需要抓一個值，不需要 `main.js` 整份資料協調邏輯，獨立寫成小檔案 `events-header.js`
- 篩選／排序 UI 的渲染／開合／量寬/定位權限/GA 事件邏輯抽成通用元件 `filter-widget.js`／`sort-widget.js`，`filters.js`／`sort.js`（首頁）跟 `events.js`（行事曆頁）各自建立一份實例掛自己的 DOM／callback，不重複刻兩套幾乎一樣的實作

### 共用工具搬遷（`js/utils.js`）
原本定義在 `grid.js`／`main.js` 的以下邏輯搬到零依賴的 `utils.js`，因為 `events.js` 也需要用，行為完全不變：
- `TW_CITY_ORDER`（縣市固定排序清單，原在 `filters.js`）
- `getEndDate()`／`getEndingBadge()`（倒數 badge 判斷，原在 `grid.js`）——`events.js` 的活動 `period` 欄位沿用跟機台 `limited` 一樣的格式，直接複用同一套判斷
- `driveUrlToImage()`（Drive／Cloudinary 網址轉縮圖，原在 `main.js`）
- `haversineKm()`（兩點距離公式，原在 `grid.js`）——行事曆拼貼模式的距離排序取「一組活動裡離使用者最近的那個地點」也需要

`grid.js`／`main.js` 改成從 `utils.js` `import` 同一份，`grid.js` 為了不動 `main.js` 既有的 `import { getEndingBadge } from './grid.js'` 語句，額外重新 `export` 一次轉出去。

### 分組：同一檔活動在多地點
資料表仍是「一列＝一個地點」；畫面渲染前用「標題＋期間」把同一檔活動的多個地點合併成一組（group），月曆橫幅／當日活動清單／拼貼卡片／詳情 Modal 都吃 group，不逐列各自畫。分組 key 用 `groupKeyMap`（`g0`、`g1`...）在第一次用到時從**未經篩選**的 `allEvents` 算一次，避免篩選切換時同一組的 key 對不起來，也避免標題含逗號等字元打斷 `data-group-key` 屬性值。這是務實做法，不用改 Google Sheet 結構；如果之後真的出現「兩檔不同活動剛好同標題同期間」的巧合，建議加一欄專用的「活動群組ID」取代字串比對。同一組裡多個地點的 `start`／`end` 理論上應該一致，但合併時仍取涵蓋範圍最大的一份，防呆表單裡地點日期填得不完全一樣的情況。

### 機台⇄活動自動比對（v33，`js/event-match.js`）
不新增 Google Sheet 欄位——靠機台分頁「店名＋期間限定」跟活動分頁「活動標題＋期間限定」兩組既有欄位字串比對。比對邏輯是 `app.html`（`main.js`／`map.js`）跟 `events.html`（`events.js`）共用的獨立檔案 `js/event-match.js`，兩邊頁面各自 `import`，不是各自複製一份——這條規則屬於「單一事實來源」很重要的類型，機台端判斷「這台有沒有活動」、活動端判斷「這個地點有哪些機台」如果各自維護一份、其中一邊改了規則忘記同步，會出現「機台說有活動、活動卻找不到這台機台」的矛盾且不容易發現。

**比對規則（`matchMachineToEventRow()`）**：
1. **正規化**（`normalizeForMatch()`）：`String.normalize('NFKC')`（全形英數字轉半形）＋ 去除空白／括號／標點（全形半形都算），轉小寫。機台「店名＋期間限定」、活動「標題＋期間」都先正規化再比對，避免全半形或標點差異造成比對失敗。
2. 正規化後標題＋期間完全一致的活動地點列，都算候選；候選為 0 → 沒有比對到，回傳 `null`。
3. **候選超過一筆時（同一檔活動在多城市開）依序縮小範圍**，不是同時比對多個條件：
   - 先比縣市（機台 F 欄 vs 活動地點 F 欄）完全一致，篩到剩一筆就採用；
   - 縣市篩不出唯一結果，再比場地（機台 E 欄 vs 活動地點 E 欄）是否有子字串相符（任一邊包含對方都算）；
   - 場地也篩不出唯一結果，改用經緯度算最近距離（`haversineKm()`），取最近的一筆；
   - 三段都篩不出唯一結果，或機台沒有有效經緯度 → 回傳 `null`。**寧可不標活動標籤，不要標錯**，是這套比對邏輯貫穿全程的原則。
4. **手動排除標記**：機台分頁「備註」欄（N 欄）填入 `【不連結活動】` 或半形 `[不連結活動]`（全形/半形括號都吃）的機台，永遠不會被自動比對到任何活動，不管標題/期間多相似；顯示備註文字時用 `stripNoEventLinkTag()` 拿掉這段標記本身，使用者看不到標記文字。

**比對結果用在兩個地方**：
- **`app.html`（機台端）**：機台詳情標題（列表模式 grid modal、地圖詳情面板/側欄，`machineTitleHtml()`）比對到活動時，標題本身變成連去 `events.html?event=<地點id>` 的連結（GA4：`event_title_click`）；列表卡片／地圖 popup 版面窄，刻意不顯示這個連結，避免更擠。
- **`events.html`（活動端）**：活動詳情 Modal 每個城市頁籤底下的「相關機台」區塊（`findRelatedMachines()`／`relatedMachinesHtml()`）反向查詢「這個地點有哪些機台」，點機台卡片跳回 `app.html` 對應機台的既有 `?id=<permId>` 分享連結（GA4：`related_machine_click`）。反查時會把整組 `group.locations` 一起傳給 `matchMachineToEventRow()` 重新消歧一次，不能只憑「同標題同期間」就把整組底下所有機台都算某一地點的相關機台——同一檔活動在多地點開時，不同地點擺的機台不一定一樣。

**已知限制**：兩檔不同活動剛好「標題完全一樣、期間也完全一樣」時無法區分（機率低，目前沒有防呆機制，比對規則本身無法判斷這是巧合還是同一檔活動）。

### 月曆檢視
- 月份格線 + 每天一格；有活動的日期以「橫幅」（`.events-bar`，淡色底 + 左側色條，色碼對應分類）顯示，同一格內超過可視高度的活動收進「+N 更多」
- 點日期格內橫幅、或「+N 更多」開啟的當日活動清單（drawer）裡的卡片 → 開啟該活動詳情 Modal；月曆上對應橫幅同步套用 `selected` 樣式
- 桌機／手機的「當日活動」清單是 **non-modal** drawer（v38.1）：桌機往左推、月曆本身仍可互動不鎖背景捲動；手機貼底 sheet 才鎖 body 捲動。點清單卡片開詳情 Modal 後 drawer **不會**自動關閉（同一天常有多場活動，看完一場很可能想接著看下一場）
- 資料從 2026/05 才開始建置，`MIN_MONTH` 鎖住最早可翻到的月份，避免翻到更早的空月曆讓人以為系統壞了；預設仍開啟「當月」，不是鎖死顯示 2026/05
- 滑鼠移到有活動的日期格子時，該天整欄（從日期數字到當週橫幅區底部）浮現藍色外框，對應出這天涵蓋哪些橫幅；僅在滑鼠裝置生效，觸控裝置沒有這個 hover 手勢
- **月曆卡片高度修正（v32.1）**：月曆容器改成依實際內容高度顯示（`flex:1` → `flex:0 1 auto`），內容不夠多時（例如篩選出 0 筆活動）卡片會收到跟內容一樣高，不會再把最後一週撐出一大段跟其他週不成比例的空白；內容真的超過可視高度時仍照舊在框內捲動，行為不變。技術細節見 `CLAUDE.md`「月曆卡片高度：flex:1 → flex:0 1 auto」

### 總覽（拼貼）檢視（v33 新增，對外顯示文字為「總覽」）
- 卡片式、依圖片拼貼排版，不受月份侷限，一次看到全部符合篩選條件的活動；已結束／尚未結束的活動分兩組各自排序（分組本身固定不受排序影響）
- 內部另有「格狀／列表」次要切換（v34 新增，兩顆各自獨立的圖示按鈕，不是循環按鈕、也不是分段控制項）：格狀是預設的瀑布流拼貼卡片，列表是單欄、無縮圖的精簡卡片
- 排序（結束日／距離）只在總覽檢視有意義，月曆檢視按日期排列沒有「排序方式」這個概念；排序 UI 掛在跟篩選 pill 同一排的 `#eventsFilterBar`，切到月曆時隱藏
- 距離排序取「一組活動裡離使用者最近的那個地點」，只提供「近到遠」，不提供「遠到近」（實用性低，先不做）

### 篩選 / 搜尋
- 三個維度：類型（固定為 `EVENT_CATEGORIES` 的 5 個分類標籤）、作品（原稱「IP」，v33.2 起顯示文字改為「作品」，`key` 沿用 `ip`、GA `filter_type` 等既有分析參數值不變，動態去重，排序邏輯跟首頁一致）、縣市（固定 `TW_CITY_ORDER`）；跟首頁共用同一套 `filter-widget.js`，UI 與 GA 事件命名前綴改成 `events_filter`
- 選取語意跟首頁一致：未選＝顯示全部，選了才篩成只顯示那幾種（曾經是「預設全選、取消代表不顯示」，是一次特意調整過的行為變更）
- 縣市篩選比對的是「地點」的縣市，不是整組活動——同一檔活動在多城市開時，只要有任一地點落在篩選縣市內就會顯示
- 搜尋框（v37）元件沿用 `app.html` 的 `.search-box`，比對欄位：活動標題／IP／縣市／場地

### 活動詳情 Modal
- 視覺沿用機台詳情彈窗（`.grid-modal-overlay`／`.grid-modal-box`／`.popup-*`），id 換一組（`#eventDetailOverlay`）避免撞名，`events.js` 沒有載入 `main.js`，是獨立一份
- 已結束的活動顯示「已結束」badge（沿用倒數 badge 外形只換顏色），優先於倒數 badge；否則依 `getEndingBadge()` 判斷顯示倒數
- 同一組涵蓋不只一個地點時顯示城市頁籤，切換頁籤只換內容區塊，不整份重繪 Modal——只有場地／地址／營業時間／更多資訊／Google Maps 連結這幾項因地點而異才分開，標題／圖片／分類／期間合併只畫一份
- 「更多資訊」對應表單 L 欄，固定顯示「查看 →」文字連結
- 圖片：K 欄可逗號分隔多張，統一轉成陣列供縮圖（只取第一張）與詳情輪播共用
- **作品（IP，J 欄，v33.1 新增顯示）**：有填才顯示「作品：xxx」，放在場地資訊之前；欄位本身沿用既有的 `character`，先前只用在拼貼卡片/篩選/搜尋，詳情 Modal 一直沒有顯示，v33.1 補上
- **圖片放大 Lightbox（v33.1 新增）**：單張圖／輪播圖的 `<img>` 都補上 `data-lightbox` 屬性（輪播切換時同步更新），點擊開啟共用的 `.lightbox`（`style.css` 跟機台版共用同一份樣式與 z-index 99999，蓋過詳情 Modal 的 9999），點背景或按 Escape 關閉；跟機台版的差異只在綁定方式——機台走 inline `onclick` + `window.closeLightbox` 掛載，這裡沒有這套 window 掛載慣例，改用跟 `events.js` 其他 overlay 一致的 `addEventListener`，行為結果相同；新增 `events_lightbox_open` GA 事件（`event_id`／`device`，對應機台版的 `lightbox_open`）

### 分享連結永久ID機制（活動版，v33.2 新增）
- 比照機台「分享連結永久ID機制」（見上方機台章節），活動分頁新增 O 欄「永久ID」，格式與產生方式相同（`permanent-id.gs` 的 `SHEET_CONFIGS` 已擴充支援機台／活動兩個分頁各自的欄位設定），一旦產生絕對不能手動修改或在該列刪除後重複使用
- 問題根源跟機台一致：`?event=` 原本直接帶地點 A 欄流水號，A 欄同時是管理者排序/整理用的欄位，活動下架被刪除、之後新增資料剛好填到同一個編號時，舊分享連結會沒有任何警告地顯示成另一個活動地點的內容
- **`events.html` 載入時解析 `?event=` 的三段式判斷**（完全比照機台 `?id=` 的解析邏輯）：
  1. `permId` 精準比對成功 → 正常開啟對應活動詳情＋城市頁籤，送 `events_share_link_opened`
  2. 精準比對失敗、退回比對到 A 欄流水號有找到列（舊格式連結，機台可能還在但無法確認是不是原本那個地點）→ 刻意不開啟任何內容，安靜地正常顯示行事曆頁，送 `events_share_link_legacy_fallback`
  3. 兩者都找不到 → 顯示「這個活動的資訊已經下架囉」toast，送 `events_share_link_target_missing`
- GA 的 `event_id` 參數維持使用 A 欄流水號（不是永久ID），跟其他 `events_*` 事件的 `event_id` 格式保持一致，方便在 GA4 後台串同一組活動的完整互動路徑

### 分享（`shareEvent()`）
- 產生 `?event=<地點永久ID>` 網址（**v33.2 起改用 O 欄永久ID，取代 A 欄流水號**；多地點時固定帶第一個地點），載入時讀取這個參數還原畫面的邏輯見上方「分享連結永久ID機制（活動版）」
- 手機 `navigator.share()`、桌機複製網址 + toast，跟機台分享互動一致
- **v33.1 新增：網址改走 `/api/event-share?id=xxx`**，讓分享連結有動態 OG 分享圖，見下方「分享連結 OG Meta（活動版）」；**v33.2 起這個 `id` 是永久ID**

### 分享連結 OG Meta（活動版，v33.1 新增，v33.2 改用永久ID，`api/event-share.js`）
- 是機台「分享連結 OG Meta」（`api/share.js`）的活動版對照組，同樣是因為社群平台爬蟲不執行 JS、只讀 `<head>` 裡寫死的 `og:title`/`og:image`
- **v33.2 起依 `?id=`（地點永久ID）**到活動分頁 CSV 找對應列，**不像機台 `api/share.js` 那樣保留 A 欄 fallback**——只認永久ID，比對不到就直接 fallback 回預設圖，不嘗試比對 A 欄：
  - 圖片：找到列就用該列 N 欄「分享圖」，沒填、找不到永久ID、或抓表失敗，一律 fallback 回專案根目錄的 `event-og.png`（活動專屬預設圖，2400×1260，OG 標籤宣告 1200×630）
  - 標題／描述固定為行事曆頁專屬文案，不依活動動態換（跟機台版一致，只有圖片會變）
- 導回目標：比對到永久ID、或抓表失敗（保守當作可能有效）都導去 `/events.html?event=<永久ID>`；確定找不到、或根本沒帶 id，導回 `/events.html`（不帶參數）
- 真人訪客一樣被 JS `location.replace()` 導回正常網站，不用 `<meta http-equiv="refresh">`

### FAB（首頁 ⇄ 行事曆頁互通，v32 改版，v33.2 調整地圖模式顯示範圍）
- 兩邊各自放一顆 `.events-link`／`.gacha-map-link`（共用 `events.css` 的 `.events-link` class），手機／桌機統一是畫面右下角常駐 FAB，桌機 hover 展開成膠囊、顯示文字
- **v32 修正**：FAB 原本放在 `#topBar`／`#eventsTopBar`（滑動隱藏用的 wrapper）裡面，手機版該 wrapper 的滑動隱藏動畫用 `will-change: transform`；`will-change: transform` 效果等同真的套用 transform，會替內部 `position: fixed` 的子孫元素建立新的 containing block，導致 FAB 沒有真的貼在視窗右下角，而是貼在 `#topBar` 這個祖先元素的右下角，並隨 `#topBar` 的 `translateY` 隱藏/顯示動畫一起飄走。修法：把 FAB 移出 `#topBar`／`#eventsTopBar`，變成 `body` 的直接子元素，恢復單純的「相對視窗 `position: fixed`」
- **`app.html` 地圖模式下的顯示規則（v33.2 調整為斷點區分，原本是不分裝置一律 `display:none`）**：
  - `max-width: 768px`（手機／平板，跟全站篩選/地圖版面同一個斷點）：地圖模式隱藏 FAB——這個斷點下側邊欄變成貼底 fixed 全寬 bottom sheet，容易跟 FAB 互相卡住，且地圖模式本身已有明確的返回列表視圖入口（view-toggle），不缺這顆固定入口
  - `min-width: 769px`（桌機）：地圖模式**保留顯示** FAB——桌機側邊欄是常駐在左側的 400px 面板，不會跟右下角的 FAB 互相遮擋；額外把 `.events-link` 的 `z-index` 從平常的 500 拉高到 `1100`，避免跟同樣疊在右下角、Leaflet 預設 `z-index: 1000` 的 attribution 控制項互相蓋住
  - `events.html` 沒有地圖／列表模式的差異，這條規則對它不生效

### 手機版頂部工具列滑動隱藏（`events-scroll.js`，v40）
- 邏輯照抄首頁 `scroll.js` 的 `#topBar` 版本（往下滑累積超過門檻才隱藏、往上滑立刻顯示、頂部安全區強制顯示），差異在 `events.html` 沒有「地圖／列表」兩種模式各自的捲動容器，而是「月曆／拼貼格狀／拼貼列表」三種子模式各自獨立的捲動容器（`#eventsDayGrid`／`#eventsCollageGrid`／`#eventsCollageListWrap`，同一時間只有一個可見），因此同時掛在三個容器上，各自用 `Map` 追蹤自己的 `scrollTop`，不共用單一變數，避免切換子模式時把另一個容器的捲動狀態誤判成一次大幅度滑動
- 切換月曆／拼貼／格狀／列表任一子模式時都要重置滑動隱藏狀態，確保 bar 一定可見

### GA4 事件（活動行事曆專屬，追加於下方主表）
| 事件名稱 | 觸發時機 | 參數 |
|---|---|---|
| `events_page_view` | 行事曆頁載入完成 | `device` |
| `events_view_switch` | 切換「總覽／月曆」 | `view`, `device` |
| `events_collage_layout_switch` | 總覽內切換「格狀／列表」 | `layout`, `device` |
| `events_month_nav`（新增） | 點月曆「上一月／下一月」導航按鈕 | `direction`(prev/next), `device` |
| `events_week_expand`（新增） | 點某週橫幅清單的「全部顯示／部分顯示」切換按鈕 | `week_key`, `action`(expand/collapse), `device` |
| `events_day_more_open` / `events_day_more_close` | 打開/關閉「當日活動」清單 drawer | `date_key`, `count`(open)／`method`(close), `device` |
| `events_detail_open` / `events_detail_close` | 打開/關閉活動詳情 Modal | `event_id`, `location_count`(open)／`method`(close), `source`, `device` |
| `events_city_tab_switch` | 詳情 Modal 內切換城市頁籤 | `machine_id`, `source`, `device` |
| `events_carousel_nav` | 詳情 Modal 輪播圖切換 | `direction`, `device` |
| `events_lightbox_open`（v33.1 新增） | 詳情 Modal 內點圖放大 | `event_id`, `device` |
| `events_share_click` | 點擊分享按鈕 | `event_id`, `source`, `device` |
| `events_share_link_opened` | `?event=` 永久ID精準比對成功，自動開啟對應活動詳情 | `event_id`, `device` |
| `events_share_link_legacy_fallback`（v33.2 新增） | 永久ID比對失敗，退回比對到 A 欄流水號有找到列（舊格式連結）；此時刻意不開啟任何內容 | `event_id`（連結裡的 A 欄值）, `device` |
| `events_share_link_target_missing` | 永久ID、A 欄流水號都找不到對應地點，顯示「已下架」toast | `event_id`, `device` |
| `events_search` | 搜尋框輸入（debounce 800ms） | `search_term`, `device` |
| `events_filter_*`／`events_sort_*` | 篩選/排序面板開關與選取（沿用 `filter-widget.js`／`sort-widget.js` 的 `filter_click`／`filter_clear`／`filter_panel_open`／`filter_panel_close`／`sort_panel_open`／`sort_panel_close`／`sort_change`／`geo_permission_result` 事件核心，只是 `gaPrefix` 換成 `events_filter`／`events_sort`） | 同首頁對應事件的參數 |
| `search_box_focus` / `search_clear` | 搜尋框聚焦/清除（沿用首頁事件名稱，`source` 改用 `events_desktop_toolbar`／`events_mobile_toolbar`） | `source`, `device` |
| `gmaps_click` | 詳情 Modal 內點「在 Google Maps 查看」 | `machine_id`, `source`, `device` |

**待辦**：以上全新事件（含 `events_month_nav`／`events_week_expand`／v33.1 新增的 `events_lightbox_open`）尚未到 GA4 後台「自訂定義」註冊自訂維度／參數說明文字；`events_lightbox_open` 用的 `event_id`／`device` 是既有維度，不用額外註冊新參數，只差把事件名稱本身登記進去。`events_share_link_opened`／`events_share_link_legacy_fallback`／`events_share_link_target_missing` 三個事件已於 v33.2 補登記進「GA4 事件追蹤表」Notion 資料庫（`events_share_link_legacy_fallback` 為 v33.2 新增事件，另兩個是 v33 就已上線但先前漏登記的既有事件，一併補上並更新內容為三段式判斷）；資料庫「新增版本」欄位 schema 選項已補上 v33／v33.2，三筆記錄的版本欄位也都設定完成。

---

## RWD（響應式設計）

| 裝置 | 版面 |
|------|------|
| 桌機（>768px） | Header + Toolbar + 主內容區（Grid 或 Map+Sidebar 並排） |
| 手機（≤768px） | Header + 主內容區（地圖全螢幕 + 底部 bottom sheet） |

> v23 起地圖版面與篩選版面的斷點統一為 768px（原本分別是 640px / 768px 兩組不同斷點，已合併）。

### 手機版地圖模式
- Toolbar（搜尋框）跟列表模式共用，不再隱藏（v20 起地圖模式也會顯示）
- Filter bar（機台類型 / 縣市 / IP dropdown pill）顯示於地圖上方，pill 列可橫向捲動，清除篩選固定不隨捲動
- 篩選/排序面板改為 bottom sheet 呈現，`z-index: 2200`/`2201`，蓋過下方的 sidebar bottom sheet（`z-index: 2000`）；v22 修正前兩者疊層順序相反，篩選/排序 sheet 曾被地圖 sidebar 蓋住，見 `CLAUDE.md`
- 地圖：`flex: 1` 佔滿整個內容區高度
- 詳情面板（bottom sheet）：`position: fixed; bottom: 0`，疊在地圖上方，`z-index: 2000`（蓋過 Leaflet 內建控制項）
  - **`peek`**（裝置高 0.12）：預設狀態，顯示可捲動的地點卡片列表，只露出拉桿 + 卡片頂端一小截
  - **`mid`**（裝置高 0.32）：往上拖一段，可看到好幾張卡片；詳情內容若撐不滿 mid 也會停在這個高度以下、縮到內容實際高度
  - **`full`**（動態計算，貼齊上方篩選列下緣）：繼續往上拖到底，捲動看完剩餘內容；內容撐不滿 mid 的短詳情沒有這一檔，拖到底就停在內容本身的高度
  - 內部結構由上至下：
    1. `.sheet-handle`（drag handle pill，觸控熱區上下各 16px padding）
    2. `.map-scroll-wrapper`（`flex: 1; overflow-y: auto`）
       - `.location-list`（依狀態顯示地點列表或完整詳情，動態塞入 innerHTML）

---

## 設計規格

| 項目 | 值 |
|------|-----|
| 背景深色 | `#1C1C1E` |
| 次背景 | `#2C2C2E` |
| 卡片背景 | `#3A3A3C` |
| 文字色 | `#f0eeff` |
| 灰色文字 | `#8892b0` |
| 主色（黃） | `#ffcf48` |
| 強調色（青） | `#00c2a8` |
| 粉紅（舊 accent） | `#ff4d8d` |

### Header
- 背景：`#1C1C1E`（無底線）
- Logo：圓形圖片 32px
- 標題字重：700
- 最後更新文字：白色

### Toolbar
- 背景：`rgba(60,60,67,0.08)`（`--fill-gray-8`）
- 搜尋框（PC）：`flex: 1`（佔滿寬度）、`border-radius: 9999px`、半透明灰底
- 搜尋框（Mobile map sidebar）：`.map-search-row` 獨立元件，`border-radius: 999px`，count badge 在 pill 外
- 搜尋 icon：Material Symbols search SVG
- 清除按鈕：Material Symbols cancel（FILL1）SVG，有輸入時顯示
- Placeholder 顏色：`rgba(60,60,67,0.64)`（`--fill-gray-64`）
- 搜尋框修復 webkit autofill 藍底（inset box-shadow 覆蓋）

### View Toggle
- 啟用狀態背景：`#00c2a8`

### 活動分類色碼（`EVENT_CATEGORIES`，events.html 專用）

| 分類 | 色碼 |
|------|------|
| POP-UP | `#2BADB9` |
| 展覽 | `#0066FF` |
| 其他 | `#1B813D` |
| CAFÉ／餐廳 | `#BE185D` |
| 特典 | `#7C3AED` |

> 對應 Google Sheet 活動分頁 B 欄（類型）的字串值，兩邊改動要同步；色碼寫死在 `js/events-data.js`，月曆橫幅、分類 badge、拼貼卡片、詳情 Modal 共用同一組，改色只要動一處。**v33.2 修正**：本表先前記錄的色碼（POP-UP `#EA580C`、其他 `#FFCF48`、CAFÉ／餐廳 `#16A34A`）跟 `js/events-data.js` 實際的 `EVENT_CATEGORIES` 對不上，這次核對程式碼後更正為實際值。

---

## 資料更新流程

1. 管理者在 Google Sheet 新增/編輯資料
2. 網站重新整理後自動讀取最新資料

### 新增圖片流程
1. 上傳圖片到 Cloudinary
2. 複製圖片網址
3. 貼到 Google Sheet K 欄（多張用逗號分隔）

---

## 程式碼更新流程

```bash
./push.sh "說明改了什麼"
```

push 至 GitHub 後 Vercel 自動重新部署，約 1 分鐘生效。

---

## 回報表單

社群回報新地點或資訊有誤：https://forms.gle/1yDKadx89DoesrSj7

---

## 待開發功能（未來規劃）

- 期間限定快速篩選
- 距離篩選（例如「5km 內」，v22 討論過先做排序、篩選半徑之後再議）
- 地點狀態標示（營業中 / 已結束）
- 自訂網域
