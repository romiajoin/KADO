# CLAUDE.md

## 專案概述

KADO！抽卡機在哪 — 台灣 IP 抽卡機 / 相卡機 / 快閃活動地點查詢網站。前端為純 HTML / CSS / JavaScript，2026/07 起從單一 `index.html` 拆分為 ES Modules（見下方「檔案結構」；純架構重構，不算功能版本迭代，未使用 vXX 編號），無資料庫、無 API 金鑰；v20 起新增一支 `api/share.js` Vercel Serverless Function（純粹是分享連結的 OG meta 用，不涉及資料庫或使用者資料）。

**⚠️ v41 排序規則調整（本檔案這次更新時）尚未 commit／push**：拿掉「結束日：遠到近」（`end_date_desc`，v30.2 上線），新增「開始日：近到遠」（`start_date_asc`）；機台首頁跟活動行事曆頁兩邊都改了（原本第一輪只改首頁，`events.html` 是後來追加的第二輪）。動到 `js/utils.js`（新增 `getStartDate()`）、`js/grid.js`（`sortLocations()` 的 `end_date_asc`／`start_date_asc` 兩個分支改成各自分三組固定優先權排序）、`js/sort.js`（`SORT_OPTIONS` 拿掉 `end_date_desc`、加入 `start_date_asc`）、`js/events.js`（`EVENTS_SORT_OPTIONS` 同步調整，`compareGroupsBySort()`／`collageGroups()` 改成用「離今天天數差絕對值」跟「已開始/尚未開始分組」的邏輯，規則跟首頁相通但是各自獨立的程式碼），共 4 個檔案。完整規則見下方「排序系統」（首頁）跟「拼貼排序」（events）兩個章節的 v41 條目；順手校正了「拼貼排序」章節一條跟實際程式碼對不上的舊敘述（誤寫成只有三個距離排序選項），詳見該章節開頭的說明。

**⚠️ v33.4 追加的兩項改動（本檔案這次更新時）尚未 commit／push**：v32／v32.1／v33／v33.1／v33.2／v33.3 都已經 commit 上線；v33.4（`events.html` 初始載入效能修正、活動搜尋結果分享連結，commit `f476f6e`）也已經 commit 上線。以下兩項是額外補在 v33.4 底下（跟 Notion「設計迭代紀錄」v33.4 段落一致），還沒 commit：
1. **全站手機／桌機切換斷點 768px → 900px**：`isMobileFilterLayout()`／`isMobileMapLayout()`、`js/scroll.js`／`js/events-scroll.js` 的 `MOBILE_BREAKPOINT`、`js/filters.js`／`js/map.js`／`js/events.js` 的 `matchMedia`，以及 `style.css`／`events.css` 對應的 media query，全部從 768px（`min-width:769px`）改成 900px（`min-width:901px`）；已確認整個 repo（含 git 歷史）沒有出現過 796 這個數字。`events.css` 裡另一組獨立的 720px／721px 斷點（活動頁行事曆／卡片列版型切換用）刻意沒有一起改。動到 `style.css`／`events.css`／`js/scroll.js`／`js/events-scroll.js`／`js/filters.js`／`js/map.js`／`js/events.js`，共 7 個檔案
2. **點「作品」標籤快速篩選同作品所有機台／活動**：機台詳情彈窗（grid modal／地圖桌機側邊欄／mobile bottom sheet）、活動詳情 Modal 的「作品：xxx」欄位改成可點擊按鈕，點擊後把作品名稱塞進搜尋框篩出結果。地圖模式／月曆模式點擊後留在原本的檢視，不強制跳轉列表/總覽；grid modal（列表模式）點擊後關掉彈窗、切到列表 view。詳見下方「作品標籤點擊快速篩選」「活動詳情 Modal」兩個章節。動到 `js/main.js`／`js/map.js`／`js/events.js`／`style.css`，共 4 個檔案

**⚠️ v34 追加的改動（本檔案這次更新時）尚未 commit／push**：View Toggle 圖示 outline/fill 切換機制擴大套用、FAB 與部分卡片細節樣式調整、首頁機台列表／活動拼貼列表卡片整張可點擊展開詳情。動到 `app.html`／`events.html`／`style.css`／`events.css`／`js/events.js`／`js/grid.js`：
1. **View Toggle icon 補齊 outline/fill 切換**：原本只有 `app.html` 的地圖 icon（`#btnMap`）有 outline/fill 兩顆 SVG 依 active 狀態切換，這次比照擴大到 `app.html` 列表 icon（`#btnGrid`，改用 `grid_view` FILL1 icon）與 `events.html` 月曆 icon（`data-view="calendar"`，改用 `calendar_today` FILL1 icon），新增 `.grid-icon-fill`／`.calendar-icon-fill` 對應的 CSS 切換規則（寫法比照既有的 `.map-icon-fill`）。`events.html` 總覽 icon 尺寸也從 18px 統一調整為 20px。`#btnMap`／`.btn-gmaps` 本身圖示未變動（已確認與目標 SVG 完全一致）
2. **View Toggle 整體改為內容撐開（不再固定寬高）**：`.view-toggle`／`.view-btn` 移除固定寬高，改成以 padding 撐開（`.view-toggle` 外框 `padding: 4px`；`.view-btn` `padding: 8px 12px`），並補上 `white-space: nowrap` 修正中文文字在窄寬度下被拆成上下兩行顯示的問題。`events.html` 的 view toggle 共用同一份 CSS，樣式自動同步
3. **`.events-link`（app→events FAB）icon 換成 `calendar_today` FILL1**，並將背景改為 `linear-gradient(180deg, rgba(0, 102, 255, 0.4) 0%, #0066FF 100%)` + `backdrop-filter: blur(4px)`（含 hover 狀態）；hover 展開寬度改為由 icon + 文字內容撐開、四周 `padding: 16px`（原本是固定寬度），`.events-label` 的 `max-width` 放寬為 `156px`（避免裁切文字，同時保留可以動畫過渡的固定數值，不能設為 `none`）。events→app 方向的 `.events-link`（gacha 機台圖示）未變動
4. **`.loc-card:hover`／`.loc-card-grid:hover` box-shadow 統一為 `0 8px 24px var(--fill-blue-16)`**（原本 `.loc-card:hover` 用的是另一組寫死的顏色值，現在跟 `.loc-card-grid:hover` 一致）
5. **機台列表／活動拼貼列表卡片整張可點擊展開詳情**：首頁列表卡片（`js/grid.js` `renderGrid()`）跟活動行事曆頁拼貼列表卡片（`js/events.js` `eventListCardHtml()`／`renderCollageList()`）原本都是「卡片本身不能點，只有『詳情』按鈕可以點」，改成整張卡片都可以點擊展開詳情，`.btn-expand` 按鈕保留當作冗餘點擊目標（`stopPropagation()` 避免跟卡片的 click handler 重複觸發同一個動作）；首頁卡片額外排除 `.btn-gmaps`（在 Google Maps 查看）連結，點它仍是正常跳轉，不會被卡片的 click handler 攔截去開詳情彈窗。兩處都新增 `.is-clickable` class 只負責 `cursor: pointer`，視覺樣式（hover 陰影等）沿用既有的 `.loc-card-grid:hover`。詳見下方「拼貼列表卡片沿用首頁 `.loc-card-grid`」章節的說明。動到 `js/grid.js`／`js/events.js`／`style.css`
5. **`.cluster-popup-item .type-badge` 獨立樣式**：icon 尺寸 14px→16px、padding 2px→4px，並新增獨立的 `border-radius: 4px`（跟基礎 `.type-badge` 的 8px radius 分開）
6. **`.collage-card-media` 圓角邏輯（中途改過兩次，最終定案）**：最初補上 `border-radius: 0 0 8px 8px`（左下、右下圓角），後來一度改成不分排數統一四角 8px，最後定案：第二排以後（`.collage-grid-col .collage-card:not(:first-child)`）四角全部 8px，第一排維持跟卡片頂部貼齊的直角，只有第一排最左欄的左上角、最右欄的右上角（`.collage-grid-col:first-child .collage-card:first-child` / `.collage-grid-col:last-child .collage-card:first-child`）補上外側 8px 圓角，呼應整片拼貼牆最外側的圓角觀感；縮圖本身有 `overflow:hidden`，裡面的 `<img>` 會自動被裁成同樣的圓角
7. **修正 `js/events.js` 的 `machineTypeBadgesHtml()` 缺少 icon 的 bug**：比照 `js/grid.js`／`js/map.js`／`js/main.js` 補上抽卡機／相卡機 icon SVG，讓 `events.html` 的機台類型徽章與其他頁面一致
8. **`.card-badge-group` 新增 `flex-wrap: wrap`**：一排放不下時自動換到第二排，避免徽章擠壓或溢出
9. **月曆導航／day-events panel／events-card 等一批視覺細修**：`.events-nav-group`（月曆上/下個月按鈕）補上 hover 效果（灰底圓形＋icon 變藍，比照 `.day-events-close`/`.grid-modal-close`）；`events-month-label` 顯示格式從「2026年9月」改成補零的「yyyy/mm」；`.events-card`（當日活動 drawer 卡片）補齊跟 `.loc-card-grid` 一致的 hover 效果（原本只設 `border-color` 沒設 `border-style`，實際上沒有任何視覺變化）；`.day-events-body` 左右 padding 從 16px 改成 20px，手機版（≤720px）上方 padding 另外改成 8px；`.events-toolbar` 被迫換行到 `.filter-bar` 下一行的斷點從 900px 改成 959px（見下方「`.events-filter-row`」章節）；≤900px 且月曆檢視時 `.filter-scroll` 上方多留 4px；手機版（≤720px）`.day-events-panel` 的 header 改成比照 `.filter-sheet-header`（標題置中、字重降到 500、關閉鈕絕對定位在右側），並拿掉原本 header 頂部的 1px 藍色 border-top。詳見下方「Day events panel／月曆導航／events-card 視覺細修」章節。動到 `events.css`／`js/events.js`
10. **「相關機台」卡片徽章改用 icon、hover 外框、城市 tab 粗細、地址重複縣市修正**：`related-machine-item` 的 type-badge 從文字改成 `.cluster-popup-item` 同款純 icon 徽章、卡片內容排列從直排改橫排（badge 與名稱並排）；`related-machines-list` 補上 `align-items: stretch` 讓同一列卡片高度以最高的為準；hover 外框改用 `inset box-shadow`（蓋在既有 1px border 上）而不是往外擴散的 box-shadow，避免被 `.related-machines-list` 的 `overflow-x: auto`（隱含 `overflow-y: auto`）裁切掉上下兩側；`.events-city-tab.active` 補上 `font-weight: 500`；修掉活動詳情 Modal 地址欄位「縣市＋地址」重複顯示縣市的 bug（例如「臺北市臺北市中正區...」）。詳見下方「「相關機台」卡片徽章樣式與 hover 外框」章節。動到 `events.css`／`js/events.js`
11. **列表 view-btn icon 顯示 bug 修正／卡片 hover 再調整／filter-panel 防止橫向捲動／events 頁小型 icon 補充**：發現第 1 項新增 `grid-icon-outline`/`grid-icon-fill` 雙 SVG 時實際漏掉了 CSS 切換規則（只有地圖 icon 有對應規則），導致列表按鈕的 outline/fill 兩顆 icon 一直同時疊著顯示，跟啟用狀態無關；補上對應三條規則後修復。`.loc-card-grid`／`.loc-card` 的 hover 效果在第 4 項的基礎上經過幾輪調整，最終定案為 `box-shadow: inset 0 0 0 1px var(--fill-blue), 0 8px 24px rgba(0, 102, 255, 0.16)` + `transform: translateY(-2px)`（inset 邊框＋外陰影＋上移動畫）。`.filter-panel`（篩選桌機 dropdown）補上 `overflow-x: hidden`，避免極端情況下可左右滑動。`.collage-list-wrap`（events 拼貼列表真正的捲動容器）補上 `padding-top: 8px`，避免第一排卡片 hover 時的陰影／位移被自己的 `overflow-y: auto` 邊界裁掉。`.events-bar-title` 補上 `font-weight: 500`。`.events-multi-pill`（月曆橫幅／拼貼格狀卡片／拼貼列表卡片「N 地點」pill，三處共用）圖示換成 `map_pin_heart` FILL icon、統一尺寸為 16×16（原本三處尺寸不一致）；`.events-bar-multi-badge`（月曆橫幅角標）原本完全沒有 icon，補上同款 12×12 icon。詳見下方「Icon 系統」與「列表 view-btn icon bug 與其他細部樣式調整（追加）」兩個章節。動到 `style.css`／`events.css`／`js/events.js`
12. **手機點擊 tap-highlight 藍色閃爍修正／拼貼列表 `.events-filter-row` 底部間距獨立化／窄螢幕 logo 改兩行顯示**（依「8 Modal 藍色方塊閃現問題」chat 補上）：
    - 全站沒有設定 `-webkit-tap-highlight-color`，手機瀏覽器（WebKit 預設）點擊有 click 事件的卡片/按鈕到彈窗真正開啟前，會有一瞬間顯示半透明藍色高亮方塊、看起來像 bug；在 `style.css` 全域 `* { margin: 0; padding: 0; box-sizing: border-box; }` reset 規則補上 `-webkit-tap-highlight-color: transparent` 統一關掉
    - `.events-filter-row` 在 ≤900px 原本只有「月曆檢視」（`.events-toolbar` 換行時，見上方第 9 項的斷點調整）有專屬 `margin-bottom` 覆寫（12px），拼貼列表模式一直沒有獨立控制、吃的是基準值 20px；新增 `body:has(#eventsCollageListWrap:not([hidden])) .events-filter-row { margin-bottom: 16px; }`（放在 ≤900px 的 media query 裡），讓拼貼列表可以獨立調整，不影響月曆／拼貼格狀
    - 窄螢幕標題原本（`<412px`）是把副標題「抽卡機在哪」整個隱藏（`.logo h1 span { display: none; }`）只留「KADO！」；改成 `.logo h1` 設 `flex-direction: column` 直排兩行顯示，斷點順手調整為 `<450px`，兩行字級統一為 16px（跟原本主標題同大小，不做主副標題字級差異）
    - 動到 `style.css`／`events.css`

實際 deploy 前記得先確認 `git status` 的所有修改都是預期中的、再 `./push.sh`。

- 網站：https://kadotw.vercel.app/
- Repo：https://github.com/romiajoin/KADO
- Google Analytics：`G-1G91M8FLWQ`

---

## 技術架構

- 前端：純 HTML / CSS / JavaScript（ES Modules，見下方「檔案結構」）
- 地圖：Leaflet.js 1.9.4 + OpenStreetMap
- 資料來源：Google Sheet 公開 CSV（`/pub?gid=0&single=true&output=csv`）
- 圖片：Cloudinary（不用 Google Drive，有 CORS 問題）
- 部署：Vercel（push 至 GitHub 後自動部署，約 1 分鐘生效）
- Serverless Function：`api/share.js`（v20 新增，分享連結 OG meta 用，見下方「分享連結 OG Meta」）；專案根目錄需要有 `package.json`（哪怕內容幾乎是空的）Vercel 才會建置 `/api`
- 字體：Chiron GoRound TC（400/500/700）、Space Mono（統計數字）
- 訪客計數：自架 Cloudflare Worker + KV（`visitor-counter.gillsponge-601.workers.dev`，page view 計數；v30 起取代原本的第三方 counterapi.dev，避免依賴的免費服務哪天被停用/改規則）
- PWA：**v31 起功能已移除**（見下方「PWA / 加到主畫面（v21 新增，v31 移除）」）。`manifest.json`／`icons/` 保留但未連結，`sw.js` 只剩自我卸載用途，不再有任何快取邏輯，也不再需要 bump 任何版本號

---

## 檔案結構（2026/07 拆分為 ES Modules）

```
app.html             # 首頁進入點（v30.9 起改名自 index.html，見「首頁 /?id= 動態 OG Meta」）
events.html          # 活動行事曆頁（v32 新增，獨立頁面，見「活動行事曆頁」章節）
style.css            # 首頁／行事曆頁共用樣式，留在根目錄
events.css           # 活動行事曆頁專屬樣式
js/
  main.js            # 核心協調：loadFromSheet／setView／applyFilters／回到前景自動刷新／下拉刷新（v31 起，原本在 pwa.js，PWA 移除時搬過來）
  map.js             # 地圖核心：Leaflet／marker／cluster popup／桌面側邊欄／mobile bottom sheet(最大的模組)
  filters.js         # 首頁篩選狀態＋資料（buildFilterOptions），UI 渲染/開合已抽到 filter-widget.js
  sort.js             # 首頁排序狀態串接（SORT_OPTIONS／sortState／userCoords），UI 渲染/開合/定位權限已抽到 sort-widget.js
  filter-widget.js    # 通用篩選元件核心（pill／桌機下拉／手機 bottom sheet／量寬／GA），首頁 filters.js 與 events.js 各自建立實例共用（v?? 抽出）
  sort-widget.js      # 通用排序元件核心（按鈕／dropdown／bottom sheet／定位權限／GA），首頁 sort.js 與 events.js 各自建立實例共用（v?? 抽出）
  grid.js             # 列表卡片渲染 + 排序邏輯（sortLocations；getEndDate/getEndingBadge/driveUrlToImage/haversineKm 已搬到 utils.js）
  scroll.js           # #topBar（header/toolbar/filter-bar/訪客 banner）mobile 列表模式滑動隱藏/顯示（v26 新增）
  changelog.js        # 更新日誌讀取／渲染／modal-sheet 開關（v27 新增）
  utils.js            # 零依賴共用工具：isStandaloneMode／getDeviceType／TW_CITY_ORDER／getEndDate／getEndingBadge／driveUrlToImage／haversineKm（後四項 v32 從 grid.js／main.js／filters.js 搬來，理由是 events.js 也要用，見「活動行事曆頁」章節）
  visitor.js          # 訪客計數（零依賴）
  events.js           # 活動行事曆頁邏輯：月曆／總覽（拼貼格狀・列表）渲染、篩選/排序/搜尋串接、詳情 Modal、分享（v32 新增）
  events-data.js      # 活動資料層：fetch 活動分頁 CSV → 解析成 events.js 用的結構（v32 新增）
  events-header.js    # 行事曆頁專用：抓「最後更新」時間戳寫進 DOM，不 import main.js（v32 新增；v32.1 起同時比較機台/活動兩分頁時間戳，見「最後更新元素」）
  events-scroll.js    # 行事曆頁專用：手機版 #eventsTopBar 滑動隱藏，同時盯 3 種子模式的捲動容器（v32 新增）
api/share.js          # 不受影響,原本就是獨立檔案
api/event-share.js    # 活動分享連結 OG meta（v33.1 新增，仿 api/share.js，見「分享（shareEvent()）」章節）
changelog.json        # 更新日誌內容（v27 新增，跟 manifest.json 同層）：date/version/text 三欄，text 可為字串或陣列（同天多筆）
permanent-id.gs       # 分享連結永久ID機制的 Apps Script（v30.4 新增，貼到 Google Sheet 端手動設定，
                       # 不在這個 repo 的 push.sh 流程裡，見「分享連結永久ID機制」）
```

**跨檔案依賴要注意**：這幾個模組之間互相 `import`，部分是循環依賴（例如 `main.js` 跟 `map.js` 互相 import 對方的東西）——這是刻意設計，函式宣告在 ES Modules 裡會在模組載入時就先掛好，不會因為互相 import 而抓不到，但**新增跨檔案呼叫時要留意這個限制**：
- 對方沒有 `export` 你要用的東西 → 模組圖直接連結失敗，全部 `<script type="module">` 拒絕執行（整站空白，不會有明確的畫面錯誤，只會在 console 看到 `does not provide an export named 'xxx'`）
- 共享的可變狀態（例如 `currentFiltered`、`allLocations`）**不能**在別的檔案直接重新賦值（`import` 進來的變數是唯讀的），只能讀取，或呼叫來源檔案提供的 setter（例如 `main.js` 的 `setCurrentFiltered()`）
- 物件內容的修改（例如 `filterState[key] = [...]`）不受這個限制，因為改的是物件屬性、不是重新指定整個變數

**改動前的檢查習慣**：改某個函式之前，先確認它現在在哪個檔案（可以直接 `grep -rn "function 函式名"` 8 個 js 檔案），不要預設還在 `main.js`；如果新增了跨檔案呼叫，記得幫來源檔案的宣告加 `export`，並在呼叫端補上對應的 `import`。

**實際踩過的坑（v28 / v28.1）**：
- **v28**：`main.js` import `filters.js` 時漏了 `FILTER_CONFIG` 跟 `filterState`，導致 `applyFilters()` 每次打字/點篩選就丟 `ReferenceError`——search 跟 filter 兩個功能會「靜默失效」，畫面上不報錯但完全不動作
- **v28**：`sort.js` 原本對 import 進來的 binding（`currentFiltered`）直接重新賦值，違反上面「不能重新賦值、只能呼叫 setter」的規則，丟 `TypeError`，導致排序重排、排序後捲回頂部、map 跟列表同步三件事一起壞掉；改成呼叫 `main.js` 的 `setCurrentFiltered()` 才修好
- **v28.1**：`filters.js` 的 `closeDesktopPanels` 忘了加 `export`，`sort.js` 那邊 `import` 語句寫了卻永遠拿不到這個函式，PC 排序按鈕點擊丟 `ReferenceError` 完全沒反應；這個問題比較隱蔽，因為 mobile 版排序不會走到這個函式，所以只有 PC 端會壞
- 這三個 bug 都是同一種模式：**匯出/匯入沒對齊**，症狀通常是「畫面上不報錯、功能就是不動」——遇到類似情況先檢查 console 有沒有 `does not provide an export named` 或 `is not defined`，比從頭排查邏輯快得多

---

## 部署

```bash
./push.sh "說明改了什麼"
```

換電腦後需重新設定 remote URL：
```bash
git remote set-url origin https://romiajoin:TOKEN@github.com/romiajoin/taiwan-gacha-map.git
```
Token 只顯示一次，外洩需立即到 GitHub Settings 撤銷並重新產生。

---

## 工作方式（重要）

- **改動前先確認**：說明要改什麼、怎麼改，等確認後再動手
- **出錯後不要亂猜**：收到推回訊號要先問清楚，不要自行繼續修改
- **只改指定範圍**：改 A 不要動 B，除非明確說要一起改
- **layout / 動畫 bug 要先看截圖**：光看程式碼很難診斷視覺問題
- **不要用 `sed -i` 處理含 SVG 的區塊**：會破壞 path data，改用 Python 或 str_replace
- **不要自行修改 `sw.js` 的 `CACHE_VERSION`**：改完程式碼後不要順手 bump 版本號，除非明確說要 bump——還沒要 commit/deploy 時 bump 版本號沒有意義

---

## 關鍵技術筆記

- Leaflet popup 內的 click 事件需用 capture mode：`addEventListener('click', handler, true)`
- 卡片展開使用單一 delegated listener 綁在 `#grid`，不要在每張卡片重複綁事件
- Google Sheets CSV 網址格式：`/pub?gid=0&single=true&output=csv`（不是一般分享連結）

### 地圖 Marker 設計（v20 重做）
- 取代原本寫死的 🎰 emoji icon，改用 `L.divIcon` 自訂圓形 marker：抽卡機橘色、相卡機綠色，圖示沿用 type-badge 同一套 SVG path（`MARKER_ICON_SVG`）
- **同座標分組**：`renderMapLocations()` 先依 `${lat},${lng}` 把資料分組，同一組只建立一個 marker，右上角疊加數量角標（`.marker-count`），避免同一商場多台機器完全重疊互相遮蓋
- 混合類型（同座標同時有抽卡機+相卡機）退回用藍色 `var(--fill-blue)`，避免顏色語意打架
- 選中狀態：`.card-marker.selected .marker-pin` 放大＋加深陰影，由 `highlightMarker(loc)` 統一控制
- `.sidebar`（mobile bottom sheet）`z-index` 為 `2000`，故意設得比 Leaflet 內建的 `.leaflet-top`/`.leaflet-bottom`（預設 `z-index: 1000`）高，避免展開時被 zoom/attribution 控制項蓋住

### 單一地點 vs Cluster：兩條完全不同的互動路徑
**單一地點（該座標只有一台機器）**
- 不綁 Leaflet popup，點擊 marker 直接：mobile 開 bottom sheet 顯示詳情（高度依內容決定，見下方「Mobile Map Bottom Sheet」），desktop 在側邊欄顯示完整詳情
- 內容統一由 `buildDetailContentHtml(loc, { compact })` 產生，`compact` 目前兩邊都固定傳 `false`（曾經想拿 `compact:true` 做精簡版摘要卡，後來需求改成「矮高度時一樣是完整內容，只是裁切/縮到內容實際高度」，這個參數留著但暫時沒在用）

**Cluster（同座標多台機器）**
- 不分裝置，一律用浮動 Leaflet popup（`bindClusterPopup()`）顯示清單，清單項目優先顯示 IP（`character`），店名跟大標題重複時隱藏次要文字
- **popup 內容一定要一次組完整字串綁進 `bindPopup()`**，不要先綁空內容、開啟後才用 JS 塞資料——Leaflet 是用 `bindPopup()` 當下的內容去量測 popup 寬度，事後才塞的內容不會被納入計算；如果事後又呼叫 `popup.update()` 想重新量測，反而會把 `_contentNode.innerHTML` 蓋回最初綁定的（空的）字串，把剛塞進去的清單洗掉
- popup 大標題邏輯：店名（`name`）都一樣 → 顯示店名；不一樣 → 退回顯示場地（`venue`）；場地也沒有 → 用地址（`addr`）
- 標題與 close 按鈕包在同一個 `display:flex; align-items:center; justify-content:space-between` 的 row 裡，`.popup-close-btn` 用 inline `position:static` 蓋掉預設的 `position:absolute`，兩者才會真的垂直置中對齊（`position:absolute;top:4px` 只是碰巧接近，不保證對齊）
- 選了清單項目後 popup 保持開著（兩個平台都是），mobile 開 sheet 顯示詳情、desktop 在側邊欄顯示完整詳情

**⚠️ `bindPopup()` 會自動註冊內建 click-to-toggle 監聽器，跟手動 `openPopup()` 會打架**
`Layer.bindPopup()` 第一次呼叫時，Leaflet 會自動幫該 layer 加上一個 `click` 監聽器（行為是「已開啟就關閉、沒開啟就打開」）。如果程式碼自己也在 `marker.on('click', ...)` 裡手動呼叫 `marker.openPopup()`，兩個監聽器會同時觸發：
- 第一次點擊：因為 `bindPopup()` 是在這次點擊事件處理過程中才呼叫的，Leaflet 內部監聽器陣列的長度是在 `fire()` 開始時就鎖定的，這次新加的監聽器「來不及」在本次事件觸發，所以只有手動呼叫的 `openPopup()` 生效，看起來正常
- 之後任何一次重新點擊同一個 marker：兩個監聽器都會觸發，手動呼叫先把 popup 打開，內建的 toggle 監聽器緊接著判斷「已經開啟了」把它關掉——結果是點擊「看起來沒反應」（其實是打開又立刻被關掉）
- **修法**：marker 建立當下就把 `bindPopup()` 綁好（不要等第一次點擊才延遲綁定），拿掉手動 `openPopup()` 呼叫，開合完全交給 Leaflet 內建行為處理

### Cluster Popup 定位補正（v18 沿用至今）
- Leaflet 原生 `autoPan` 在 `max-height` + `overflow-y: auto` 下量不準（CSS 套用前就計算高度），改用 `popupopen` + `requestAnimationFrame` 拿實際 render 後尺寸，再自行 `panBy` 補正——這段邏輯 v20 後只作用在 cluster popup 上（單一地點已經不走 Leaflet popup了）
- `autoPan: false` 於 `bindPopup` options
- 已知未解問題：手機版 cluster popup 打開後，跟下方 bottom sheet 有機率互相遮蓋，marker 位置太靠畫面下緣時要注意；v23 起點聚合 marker 會先把 sheet 收到 `peek`（見下方「Mobile Map Bottom Sheet」）大幅緩解了這個問題，但沒有做「扣掉 sheet 高度計算可視範圍」這種精確排除，極端情況仍可能發生

### 最後更新元素（三處）
- `#lastUpdated` — PC header（`.header-info`，Space Mono 14px）
- `#listLastUpdated` — Mobile list mode，位於 `#gridView` 內、`#grid` 上方，隨卡片捲動
- `#mapLastUpdated` — Mobile map mode，位於 `.map-scroll-wrapper` 內、`location-list` 上方，隨列表捲動
- 三處由 JS `forEach` 統一更新，內容相同（12px / weight 400 / fill-black / text-align center）
- **v27 修正：24 小時制轉換**——Google Sheet 儲存格原始格式是 12 小時制（例如 `2026/7/14 下午 8:33:00`，AM/PM 跟時數之間可能有空白），新增 `to24Hour()` 轉換函式，順便拿掉秒數；轉換規則：下午且非 12 點 → +12 小時，上午 12 點 → 0 點（午夜），下午 12 點維持 12（正午）；格式跟預期不符就直接回傳原字串，不讓「最後更新」整個消失。這個修正同時緩解了另一個問題：`.report-link`/`.changelog-link` 因 `white-space: nowrap` 不會縮小換行，導致所有 flex-shrink 壓力集中在日期文字上，稍微縮小就整行跳去換行，換行後短的第二行在原本（幾乎沒縮小的）box 寬度裡留下大片空白——縮短顯示文字後大部分螢幕寬度不會再觸發這個問題
- **v32.1 新增：跨分頁比較**——Gill 提出「活動分頁（`events.html` 用，`gid=1540199365`）P 欄也會被更新，希望『最後更新』顯示兩個分頁裡較新的那個時間」。`js/main.js`（`loadFromSheet()`）跟 `js/events-header.js`（`loadLastUpdated()`）都改成：
  - `Promise.all` 同時 fetch 機台分頁（`SHEET_CSV_URL`）跟活動分頁（新增的 `EVENTS_SHEET_CSV_URL`，`gid=1540199365`，跟 `events-data.js` 是同一份 URL，各檔案各自重複定義一份，延續專案既有「各檔案自帶所需常數」慣例）；活動分頁那條 fetch 包 `.catch(() => null)`，失敗不影響機台清單／機台頁本身載入
  - 新增 `parseUpdateDate(raw)`：把 `to24Hour()` 用的同一種原始格式（`yyyy/M/d 上午|下午h:mm(:ss)?`）解析成真正的 `Date` 物件，供兩欄時間比大小（字串比較在月/日沒有補零時不可靠，例如 `"2026/7/9"` 字串會排在 `"2026/7/14"` 後面，必須轉成 `Date` 才能正確比較）
  - 比較邏輯：兩欄都能解析成 `Date` 時，活動分頁較新才切換顯示活動分頁那欄；機台分頁解析失敗（格式跑掉）但活動分頁能解析，才 fallback 用活動分頁；其餘情況（含兩者都解析失敗）一律沿用機台分頁 R 欄原始字串——維持 v32.1 之前的行為，不讓活動分頁的格式問題波及機台頁「最後更新」的既有可靠性
  - 活動分頁 P 欄（0-based index 15）目前只拿來比較時間，不解析成 `events-data.js` 那套完整活動資料結構，機台頁沒有理由拖進那條 chain
  - `CACHE_VERSION` 機制已在 v31 整個作廢（見「Service Worker 快取版本管理」v31 條目），這次改動不用 bump 任何東西

### Mobile Map Bottom Sheet（v20 重寫，v23 再次大改：改成內容驅動的共用三檔系統）
- Sidebar 從「固定顯示全部地點清單」改為 **marker 驅動**：`sheetLevel` 狀態機為 `'peek' | 'mid' | 'full' | 'content'`，`sheetLoc` 記錄目前顯示的那一筆（null 代表顯示列表）
- **三檔高度由列表跟詳情共用**（v23 改動核心，取代原本各自獨立的 `default`/`summary`/`full`）：
  - `peek`：裝置高 `0.12`（`SHEET_PEEK_RATIO`），只露出拉桿 + 卡片頂端一小截
  - `mid`：裝置高 `0.32`（`SHEET_MID_RATIO`）
  - `full`：動態計算，抓 `#filterBar` 的 `getBoundingClientRect().bottom + 8` 當上限，`window.innerHeight - 上限`，確保不會蓋住搜尋框/篩選器
- **預設狀態（`sheetLoc` 為 null）**：顯示可捲動的地點卡片列表（`buildSidebarListCardHtml` + `bindSidebarListCardEvents`，跟桌機、grid 共用同一套卡片渲染），取代 v20 版的提示文字
- **詳情內容依實際高度決定 sheet 高度**（`applyMobileDetailHeight(opts)`）：內容渲染後用雙層 `requestAnimationFrame` 量測 `#locationList.scrollHeight`（確保排版真的完成才量，同步量測拿到的數字不可靠），若量出的 `contentH + handleH < mid` 就縮到內容實際高度（`sheetLevel = 'content'`），撐得滿或更高就開在 `mid`（`sheetLevel = 'mid'`）；`contentH` 會用 `Math.max(..., peek 高度)` 設下限，避免量測異常時 sheet 塌到 0 或小到連拉桿都碰不到
- **`preferFull` 選項**（v24 新增）：`opts.preferFull = true` 時，若內容量落在 `mid`（需要使用者自己拖才能看完），改為貼合實際內容高度展開（不是撐死到 `full` 的固定高度，下面不會空白）；只有內容真的長到超過 `full` 的上限才封頂在 `full`（此時本來就得靠內部捲動看完）。v28 之前只有「從分享連結進來的地圖模式」這條路徑傳 `preferFull: true`，手動拖曳到 `full` 走的是另一條路徑、一律套固定高度，內容短時下方留白；v28 修正 `applySheetLevel()` 拖到 `'full'` 時也重用 `measureSheetContentHeight()`/`fitDetailToTarget()`（從原本的邏輯抽出來的共用函式），兩條路徑統一套用內容高度計算
- **拖曳上限依內容而定**：`sheetLevelsStack()` 單純回傳 `sheetLoc` 有值時的 `sheetDragLevels`（沒有值、顯示列表時固定回傳 `['peek','mid','full']`）；`sheetDragLevels` 由 `applyMobileDetailHeight()` 依內容高度指派——內容 `< mid` 為 `['peek','content']`，其餘情況為 `['peek','mid','full']`（`preferFull` 分支例外，見上方說明，會依 `fitDetailToTarget` 判斷結果動態指派其中一種）；`initBottomSheet()` 的 touchmove 上限固定拿 `levels[levels.length-1]`，不是寫死 `full`——短內容詳情這樣才不會被拖到貼齊 header、底下留一大片空白
- **層級記憶**（`sheetReturnLevel`）：從列表點卡片進入詳情時記住當下層級（`fromListLevel`），關閉時回到這一層；從 marker/cluster popup 進入詳情不會設定/清除這個記憶——這樣即使先從列表進入，之後又在 popup 裡切換到其他機台/其他聚合點，關閉時仍會回到最一開始的列表層級。真正會清掉這個記憶、回到 `peek` 的入口只有：直接從 marker/popup 開始（沒有列表歷史）、點地圖空白處、篩選/搜尋條件改變
- `closeDetailPanel(forcePeek)`：新增 `forcePeek` 參數，篩選/搜尋改變時傳 `true`，無條件回 `peek`；X 按鈕、原生 popup 關閉則不傳，走 `sheetReturnLevel || 'peek'` 的一般邏輯
- 點聚合 marker：sheet 收到 `peek` 顯示列表，讓地圖空間空出來給 popup（`sheetLoc` 清空但**不清 `sheetReturnLevel`**，因為這只是暫時收合去露出選單，不算真正關閉）；popup 開合仍完全交給 Leaflet 原生 click-toggle，這裡只負責收合 sheet
- 點地圖空白處（v23 新增，原本僅桌機支援）：`sheetLoc` 或有 popup 開著時才觸發收合，單純瀏覽列表時點空白處不會打斷使用者手動拉開的高度
- 關閉詳情、回到列表時，捲動到**最後選中**那張卡片的位置（`lastSelectedLocId`，`scrollIntoView({block:'start'})`，對齊頂部）；這個變數每次選中都會更新，所以在 popup 裡切換過機台，最後捲到的是最後看的那一台，不是最初點的那一台。v23 中途試過「精確還原點擊當下的 scrollTop」，發現這只是還原了「巧合而已，跟卡片是否顯眼無關」的舊畫面，改回捲到卡片頂部才是真正要的行為
- **搜尋自動展開**：`applyFilters()` 記住篩選/搜尋前的層級（`priorLevel`），若原本是 `peek` 且結果 > 0 筆就展開到 `mid`，原本已經是 `mid`/`full` 則維持不動；另外追蹤搜尋關鍵字「從無到有／從有到無」的轉折（`prevSearchKw`/`sheetLevelBeforeSearch`），清空搜尋時還原成**搜尋開始前**的層級，不是搜尋期間自動展開後的層級（兩者在清空當下可能是同一個值，會混淆判斷，所以要分開追蹤）
- Cluster marker 不走 sheet：不分裝置一律用浮動 Leaflet popup，見上方「單一地點 vs Cluster」段落
- `renderMapLocations()` 資料重新渲染（篩選條件改變）時，開頭就呼叫 `closeDetailPanel(true)`，避免內容跟新資料對不上；篩選結果為 0 筆時改顯示「找不到符合的地點 இдஇ」
- Mobile 地圖模式的搜尋框/篩選器跟列表模式共用 `.toolbar`
- `map.invalidateSize()` 統一在高度變動的各個函式尾端呼叫（delay 320ms 等 transition 結束）
- Grid view 時側邊欄整個隱藏（`body:not(.map-view) .sidebar { display: none }`）
- `initBottomSheet()` 仍有防重複初始化（`handle.dataset.sheetInit`）
- CSS 上 `.sidebar` 的 class 層級曾殘留一條 `height: 98px` 死規則（跟緊接在旁邊「高度改由 JS 動態計算」的註解互相矛盾），v23 清掉

### Desktop 地圖側邊欄（v20 新增，v23 預設內容改為真實列表）
- 固定寬 400px 常駐面板；**預設內容改為可捲動的地點卡片列表**（v23，取代原本的 `.sidebar-placeholder` 提示文字），跟手機版、grid 共用同一套卡片渲染（`buildSidebarListCardHtml`/`bindSidebarListCardEvents`）——側邊欄本身一直都在，只是內容在「列表」跟「完整詳情」之間切換
- 點單一地點 marker、側欄列表卡片，或 cluster marker 的浮動 popup 清單項目 → 側邊欄顯示完整詳情，popup 不會關閉
- 收回：點側邊欄 X，或點地圖空白處（`map.on('click', ...)`，marker 點擊不會冒泡上去，不會誤觸發）→ 換回列表，並捲動到最後選中那張卡片的位置（對齊頂部）
- 點了不同的單一地點 marker 之後又點回前一個，如果中間發生過「popup 已開啟但沒有明確關閉」的情況（例如先點 cluster 再點單一地點），要記得在單一地點分支呼叫 `map.closePopup()`，不然殘留的 cluster popup 會卡在「已開啟」狀態，導致之後點回那個 cluster marker 沒反應（見上方 bindPopup 那段的根本原因，這裡是同一個問題的另一種觸發路徑，多一層防呆）

### 篩選系統（Filter Bar，v19 重構）
- 三個維度：機台類型（固定 `FILTER_CONFIG.fixedOptions`）、縣市（固定 `TW_CITY_ORDER` 22 縣市，不受資料是否存在影響，沒資料的縣市選了就是 0 筆）、作品（原稱「IP」，v33.2 起顯示文字改為「作品」，`key` 沿用 `ip`、GA `filter_type` 等既有分析參數值不變，動態從資料 `new Set()` 去重取得）
- `filterState = { type: [], city: [], ip: [] }`，每個維度都是多選陣列，`applyFilters()` 用「每個維度都符合（陣列為空視為不限制）」做 AND，維度內部是 OR
- **桌面版**：pill 點擊展開錨定 popover（`.filter-panel`，`position: absolute`），選項即時套用、不需確認按鈕
- **手機版**：改用共用的 bottom sheet（`#filterSheet`），依 `data-key` 動態填入對應類別的選項，不是每個類別各自一個 sheet DOM
- 清除篩選：v22 起改為單一 pill 各自清除——選取後 pill 右側 icon 從 chevron 換成清除（X）icon，`clearFilterKey(key)` 只清除該類別，不再有全域「清除篩選」按鈕/`clearAllFilters()`

**⚠️ flex-wrap 容器量不出「換行後的實際寬度」**
`width: fit-content` 或 `width: max-content` 搭配 `flex-wrap: wrap` 時，瀏覽器算「內容自然寬度」是**假裝不換行**去加總所有子元素寬度的（CSS 規格如此，不是 bug），結果通常遠超過 `max-width`，導致容器永遠卡滿上限，看不出換行後實際只用到多少寬度。無法只用 CSS 解決，做法是量測後用 JS 手動設定 `width`：
```js
// 換行後用 offsetTop 分組成一列一列，取最寬那一列的實際寬度
function fitOptionsWidth(container) {
  container.style.width = '';
  const rows = new Map();
  Array.from(container.children).forEach(item => {
    const top = item.offsetTop;
    (rows.get(top) || rows.set(top, []).get(top)).push(item);
  });
  let maxRowWidth = 0;
  rows.forEach(rowItems => {
    const left = Math.min(...rowItems.map(i => i.offsetLeft));
    const right = Math.max(...rowItems.map(i => i.offsetLeft + i.offsetWidth));
    maxRowWidth = Math.max(maxRowWidth, right - left);
  });
  if (maxRowWidth > 0) container.style.width = Math.ceil(maxRowWidth) + 'px';
}
```
量測時機也要注意：目標元素必須是**已經 `display: block`（看得見）** 才量得到正確的 `offsetTop`/`offsetWidth`，量 `display: none` 的元素全部都是 0。桌面面板預設隱藏，量測前要先暫時強制 `display: block`、量完再切回去（見 `fitPanelWidth()`）；手機 sheet 則是先加上 `.show` class 讓它顯示、才呼叫量測函式，順序顛倒就會量到 0。

**面板/sheet 疊層順序（v22 修正）**：手機版篩選/排序 sheet 原本 `z-index` 是 1100/1101，v20 把 mobile `.sidebar` 的 `z-index` 從 1000 提高到 2000（為了蓋過 Leaflet 內建控制項）之後，沒有同步調整篩選 sheet，導致地圖模式下打開篩選/排序會被 sidebar 蓋住——這個問題留在 code 裡整整兩個版本才發現。v22 把 `.filter-sheet-overlay`/`.filter-sheet`（篩選跟排序共用這組 class）的 `z-index` 提高到 2200/2201，蓋過 sidebar 也蓋過 A2HS banner（2100），確認排序/篩選是使用者當下主動觸發的 modal 互動，理論上該蓋過被動顯示的 banner。之後再新增任何 fixed 定位、疊在畫面上的 UI，記得先看這個檔案裡目前所有 `z-index` 的值，不要重複踩到同一個坑。

**作品排序提示文字（v20，原稱「IP 排序提示文字」，v33.2 隨標籤更名同步改稱）**：作品選項用 `localeCompare(a, b, 'zh-Hant')` 排序，實測對中英數混合資料的結果是「數字開頭 → 中文依首字筆畫遞增 → 英文開頭殿後」（不是隨機或照輸入順序，只是肉眼不容易看出規律）。與其重新設計排序邏輯或加搜尋框（评估過覺得現階段太早），改成在作品篩選面板上方加一句提示文字說明排序規則：「依「數字 → 筆畫 → 英文」排序，可滑動尋找」。桌面版 popover（`.filter-panel`）跟手機版 bottom sheet（`#filterSheet`，透過 `#filterSheetHint`）是兩套獨立 DOM，這句提示要兩邊各自補一次，不會共用。

### 排序系統（Sort，v22 新增，v41 拿掉 end_date_desc、新增 start_date_asc）
- 位於篩選 pill 列右側（`margin-left: 4px`，疊加 `.filter-bar` 原有的 `gap: 12px` 湊出 16px 間距），純文字＋chevron 樣式，跟 pill 外觀刻意做出區隔——排序永遠單選、沒有清除的概念，跟篩選的多選/可清除是不同的心智模型，用同一種 pill 樣式容易誤導使用者以為排序也能疊加
- `SORT_OPTIONS`（v41 起共四個選項）：`end_date_asc`（default）、`start_date_asc`、`distance_asc`、`distance_desc`；桌面版 `#sortPanel` dropdown、手機版共用 `.filter-sheet` 這組 bottom sheet DOM（跟篩選共用同一套元件與 class，`#sortSheetOverlay`/`#sortSheet`），兩者互斥——開排序會收篩選，開篩選會收排序，`toggleDesktopSortPanel()`/`toggleDesktopPanel()` 跟 `openMobileSortSheet()`/`openMobileFilterSheet()` 互相呼叫對方的 close function（**v30.2 曾新增 `end_date_desc`「結束日：遠到近」，v41 移除**，見下方 v41 條目）
- `sortLocations(arr)`：
  - `end_date_asc`：沿用 `limited` 欄位（`"2026/07/01～2026/07/20"` 格式，取「～」後半段當結束日，`getEndDate()`）比較——舊版曾經用 `getEnd()` 回傳固定 `9999/12/31` 當佔位值，這個寫法「近到遠」時剛好把無期限排最後，但如果曾經想加「遠到近」方向，同一個佔位值會讓無期限機台變成排最前面，邏輯是巧合對、不是設計對，v22 改成明確判斷 `null` 才是對的做法。**v41 起改成三組固定優先權**（不再只有「有/無期限」兩種狀態）：① 進行中（結束日 ≥ 今天）→ 依結束日離今天的天數差排，越快到排越前面；② 常態機（無 `limited`）→ 排在①之後，彼此用作品名稱（`character` 欄位，篩選面板上顯示為「作品」，v33.2 前稱「IP」）`localeCompare('zh-Hant')` 排序（跟篩選作品選項同一套規則）；③ 已過期未下架（有 `limited` 但結束日 < 今天）→ 排最後，優先權比常態機還低，組內一樣依離今天的天數差排（結束日越接近今天排越前面），理由是這種資料本身該更新卻還沒更新，不該讓它排到常態機前面誤導使用者。①③ 兩組實際上是同一條算式（`Math.abs(結束日 - 今天)` 由小到大），因為①全部是未來/今天、③全部是過去，天數差絕對值天然對應到各自語意上的「越接近今天排越前面」，不用分別寫兩套比較邏輯
  - `start_date_asc`（v41 新增）：新增 `getStartDate()`（`utils.js`，取「～」前半段當開始日，結構對稱 `getEndDate()`）。同樣分三組固定優先權：① 已開始（有 `limited` 且開始日 ≤ 今天）→ 依開始日新到舊排（越晚開始、離今天越近的排越前面，等於「最新上架」）；② 尚未開始（有 `limited` 但開始日 > 今天）→ 排在①之後，組內依開始日由近到遠排（越快開始的排越前面，等於「即將登場」）——**不能**併進①一起用同一條算式，跟結束日排序的①③不同，這裡①②兩組「離今天越近」的日期方向剛好相反（①是越近的過去、②是越近的未來），硬套同一條 `Math.abs()` 算式雖然數字上算得出來，但①②混在一起排的話會讓「已經開始很久」跟「還沒開始」的機台互相穿插，語意不對，所以先分組固定優先權、組內才各自用對應方向排；③ 常態機（無 `limited`）→ 排最後，用作品名稱排（跟結束日排序同一套慣例）
  - **設計上的取捨**：這個排序刻意沒有對應的「遠到近」方向（v41 移除的 `end_date_desc` 就是「結束日：遠到近」，`start_date_asc` 從頭就沒做「遠到近」）——「結束日最遠」「開始日最舊」這種排序沒有明確的使用情境（不像「快結束了」會讓人想趕快去、「最新上架」會讓人想去看新的），且 `end_date_desc` 上線後才發現「結束日遠到近，可能根本還沒開始」這種資料本身就會讓排序結果顯得矛盾（一個還看不到的機台被排到最前面），與其做兩個方向再各自修邏輯漏洞，不如只留一個有明確使用情境、邏輯乾淨的方向
  - `distance_asc`/`distance_desc`：Haversine 公式算直線距離（台灣範圍不需要更複雜的橢球模型），需要 `userCoords`（使用者座標）才能排，沒有座標時直接回傳原陣列不排序（防呆，理論上選這個選項前一定已經觸發過定位流程）
- **定位權限流程**：`requestUserLocation()` 包一層 Promise 呼叫 `navigator.geolocation.getCurrentPosition()`，`enableHighAccuracy: false`（找機台這種場景不需要，換取更快定位）、`maximumAge: 300000`（5 分鐘內快取位置可重用）；已知拒絕過的狀態存 `localStorage`（key: `geo_permission_denied`），下次點擊直接跳過 API 呼叫（因為 iOS Safari 拒絕過就不會再跳權限視窗，重複呼叫也沒用）
- **提示文案拆四種**（`GEO_ERROR_MESSAGES`），對應 `err.status`：已知拒絕過（本地判斷，不呼叫 API）／`denied`（本次拒絕）／`timeout`（逾時）／`unavailable`（裝置不支援或瀏覽器不支援 geolocation）——刻意不合併成一句「請確認定位權限」，因為逾時跟裝置不支援跟權限完全無關，合併文案會誤導使用者去翻手機設定
- 提示文字（`showSortHint()`）顯示位置：桌面 `#sortPanelHint`（dropdown 內、選項上方）、手機 `#sortSheetHint`（bottom sheet 內、選項上方），選單保持開啟不會自動收合，讓使用者看得到提示

### 裝置類型判斷：排版 vs 分析用途要分開
- `isMobileFilterLayout()`：`matchMedia('(max-width: 900px)')`（v33.4 起從 768px 改為 900px），純粹決定「篩選要顯示 dropdown 還是 bottom sheet」，跟裝置無關，縮小桌面視窗也會觸發 mobile 排版（這是刻意的，排版本來就該跟著視窗寬度走）
- `isMobileMapLayout()`：`matchMedia('(max-width: 900px)')`，決定地圖模式要顯示桌機常駐側欄還是手機 bottom sheet；v23 起跟 `isMobileFilterLayout()` 統一使用同一個斷點（原本地圖是 640px、篩選是 768px 兩組不同斷點，各自獨立判斷，v23 合併成一組，同時刪除所有 640px 相關的 CSS media query；v33.4 起這個共用斷點從 768px 改為 900px）
- `getDeviceType()`：`matchMedia('(pointer: coarse)')`，判斷輸入裝置是否為觸控；v24 起同時結合 `isStandaloneMode()` 判斷是否為已安裝的 PWA，回傳四種值：`mobile`/`mobile_pwa`/`desktop`/`desktop_pwa`，給 GA 事件的 `device` 參數用。用寬度判斷裝置類型在分析上不準（縮小桌面視窗會被誤記為 mobile），所以 GA 相關的 `device` 一律用這個，不要沿用 `isMobileFilterLayout()`/`isMobileMapLayout()`（**v31 起**：PWA 功能移除後不再主動導引安裝，新造訪理論上不會再產生 `mobile_pwa`/`desktop_pwa`，這兩個值只會在尚未被 `sw.js` 自我卸載清乾淨的舊安裝使用者身上短暫出現，函式本身沒有刪除，不影響既有邏輯）
- `isStandaloneMode()`（v24 新增）：`matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`，是唯一的 standalone 判斷來源，`getDeviceType()` 呼叫這一個（v31 起 A2HS banner 的 `isStandalone()`／`pwa_launch_mode` 事件已隨 `js/pwa.js` 一起移除，不要再找這兩個）


- `#searchInput`（`.search-box-desktop`）：桌機列表模式，mobile 隱藏（`display: none`）
- `#searchInputMobile`（`.search-box-mobile`）：手機列表模式，`font-size: 16px` 防 iOS zoom，desktop 隱藏；**v20 起地圖模式也共用這一個**（原本 `body.map-view .toolbar {display:none}` 這條隱藏規則拿掉了）
- ~~`#mapSearchInput`~~：v20 已移除，連同 `#clearMapSearch`、`#mobileCountBadge` 一起刪掉，不要再找這幾個 id
- 兩個 input（`#searchInput`、`#searchInputMobile`）互相同步 value；`applyFilters()` 讀 `#searchInput` 的值
- 對應清除按鈕：`#clearSearch`、`#clearSearchMobile`，clear 時兩個 input 與按鈕一起清除

### Google Sheet 欄位（v30.4 大改：欄位重新排序 + 新增永久ID）
- A–R 共 18 欄：`id, type, name, limited, venue, city, addr, lat, lng, character, edition, perDraw, image, note, hours, shareImage, permId, lastUpdated`
- **跟舊版排序差異很大**，`limited`（期間限定）從原本 K 移到 D、`image`/`note`/`hours` 順序也重排過，改動 `parseCSVRow` 之後的欄位對照時務必逐一核對，不要憑舊版記憶推算
- `permId`（Q 欄，v30.4 新增）：**分享連結真正比對的依據**，取代原本用 A 欄流水號當識別碼的做法；新增資料時由 Apps Script（`permanent-id.gs`，見下方「分享連結永久ID機制」）自動產生，格式 `yyyyMMdd-HHmmss-列號`，一旦產生絕對不能手動修改或在該列刪除後重複使用給別的機台
- `lastUpdated` 讀取位置：`firstRow[17]`（R 欄，只有第一列——標題列下方那一列——會填這格）
- A 欄 `id` 現在**只是給管理者排序/整理用的流水號**，可以自由重新編號，不再是分享連結的依據；`main.js`/`map.js` 少數地方仍用它做 GA `machine_id`、DOM `data-machine-id`／marker 對照表的 key（跟分享連結無關，這些用途不受重新編號影響，因為只在單次頁面 session 內部使用，不需要跨時間穩定）

### 分享連結永久ID機制（v30.4 新增）
**問題根源**：早期分享連結（`?id=<A欄流水號>`）拿 A 欄當識別碼。A 欄同時也是管理者排序/整理用的欄位，只要活動下架被刪除、之後新增資料時剛好填到同一個編號，舊分享連結就會**沒有任何警告地**顯示成另一台機台的內容——`main.js`/`share.js` 的比對邏輯本身沒有 bug，單純是 A 欄的值不保證跨時間穩定對應同一台機台。

**解法**：新增 Q 欄 `permId`，這欄的值一旦產生就絕對不能改、不能在該列被刪除後拿去用在別的地方，跟 A 欄的排序用途完全脫鉤。

**實作**：
- `permanent-id.gs`（Google Apps Script，**不在這個 repo 的 `push.sh` 流程裡**，需要另外貼到 Google Sheet 的「擴充功能 → Apps Script」手動設定，設定步驟見檔案內註解）：
  - `onSheetEdit(e)`（installable trigger，`setupTrigger()` 建立）：偵測到有資料但 `permId` 欄還是空的列，自動補上 `yyyyMMdd-HHmmss-列號`格式的值；貼上多列資料時 `e.range` 涵蓋整個範圍，用迴圈逐列檢查，不會漏掉批次貼上的狀況
  - `backfillExistingRows()`：一次性函式，幫現有資料補齊 `permId`（新機制上線時要先手動執行一次）
  - 列號當保險尾綴：避免同一批次處理多列時，時間戳記秒級解析度剛好撞在同一秒
- **分享連結產生**（`shareLocation(permId, machineId, source)`，`main.js`）：URL 帶 `permId`；GA `machine_id` 仍用 A 欄的 `machineId`（維持跟 `card_click`/`trackGmapsClick` 等其他事件的 `machine_id` 格式一致，方便在 GA4 後台串同一台機台的完整互動路徑，不要因為這次改動讓它跟著切成永久ID格式）
- **分享連結解析（`main.js`，`?id=` 載入時）**：三段式判斷，**只有永久ID精準比對成功才自動開啟該機台詳情**：
  1. `exactTarget = allLocations.find(l => l.permId === urlId)` 命中 → 正常開啟（`openGridModal`/`openDesktopSidebar`/`openMobileSheetSummary`），送 `share_link_opened`
  2. 精準比對失敗，退回 `legacyTarget = allLocations.find(l => l.id === urlId)`（相容修正上線前產生的舊格式連結）命中 → **刻意不開啟任何內容**，安靜地正常顯示首頁，送 `share_link_legacy_fallback`——因為 A 欄的值可能事後被重新指派給別的機台，fallback 找到的那一列不保證是原本分享的那一台，寧可安靜地不顯示，也不要冒著顯示錯誤機台內容的風險
  3. 兩者都找不到 → 顯示「已下架」toast，送 `share_link_target_missing`
- **`api/share.js`（社群平台預覽圖）**：邏輯較寬鬆，**保留 A 欄 fallback 且會直接採用其結果**（永久ID優先比對，找不到才退回比對 A 欄，比對到就回傳對應的分享圖，不像 `main.js` 那樣刻意安靜處理）——這是刻意的不對稱設計：預覽縮圖顯示成別的機台的代價（使用者點進去之前，只是看到一張可能不準的縮圖）遠比「點進去後被誤導看到一個看似正常、其實是別台機台的完整詳情」小很多，而且使用者點進去後 `main.js` 那邊的三段式判斷會擋住錯誤內容的顯示，最壞情況只是連結「沒有生效」，不會誤導
- 這個機制**只保護修正上線後產生的新連結**；上線前已經流出去的舊連結，只能靠 fallback 機制盡量還原（機台還在且 A 欄沒被重新指派時能正常運作），沒辦法完全消除「A 欄被重新指派後舊連結失效」的風險

### 分享單一地點（v20 大改：新增動態 OG Meta；v30.4 改用永久ID）
- 分享出去的網址從 `?id=<id>` 改成 `/api/share?id=<id>`（一支 Vercel Serverless Function，見下方「分享連結 OG Meta」）；**v30.4 起 `<id>` 是 `permId`（永久ID），不是 A 欄流水號**，詳見上方「分享連結永久ID機制」
- v24 起：在地圖模式分享時，`shareLocation()` 額外帶上 `&view=map`；`api/share.js` 白名單轉發 `view=map`（其他 query 參數一律丟棄）；頁面載入後若偵測到 `?id=` + `view=map`，切換到地圖模式並直接展開該機台詳情（desktop: `openDesktopSidebar`，mobile: `openMobileSheetSummary({ preferFull: true })`），不走原本的 `openGridModal()`
- **`?id=` 只在初次載入時處理一次**（`!silent` guard）：背景刷新/下拉刷新重複呼叫 `loadFromSheet()` 不會重跑這段邏輯，避免使用者關閉詳情後背景刷新又把它彈回來
- 找不到對應機台（永久ID跟 A 欄流水號都比對不到，代表真的整列被刪除下架）時顯示 toast「這台機台的資訊已經下架囉」，並送出 `share_link_target_missing` GA 事件；只比對到 A 欄流水號（舊格式連結，機台可能還在但不確定是不是原本那一台）則安靜不顯示，送 `share_link_legacy_fallback`
- `showToast(msg)`：fixed 定位，bottom 80px，2 秒後自動消失

### 搜尋結果網址即時同步（v30.8 新增）
**不是一個「分享按鈕」，是網址列本身就是分享連結**：使用者搜尋或套用篩選時，網址列會即時同步更新（`history.replaceState`，不新增瀏覽紀錄、不觸發真正的頁面跳轉），複製網址列貼給別人，對方點開就會看到同樣的搜尋結果，不需要額外點擊任何東西產生連結。

**跟單一機台分享連結（見上方「分享連結永久ID機制」）是兩種獨立的分享類型，互斥**：`?id=` 存在時一律走單一機台那條路徑，完全不看 `q`/`type`/`city`/`ip` 這幾個參數；`?id=` 不存在時才檢查後面這組。

**URL 參數設計**：不新增 serverless function，直接用 query string 表達當下的搜尋 + 篩選狀態，指向網站本身（不像單一機台分享要繞過 `api/share.js` 換 OG 圖，因為搜尋結果沒有「這一筆專屬圖片」可換，用網站預設的 OG 圖即可）：
- `q`：搜尋關鍵字（`#searchInput` 的 value，原文不特別編碼，交給 `URLSearchParams` 處理）
- `type`／`city`／`ip`：對應 `FILTER_CONFIG` 三個維度目前選中的值，多選用逗號分隔（例如 `city=臺北市,新北市`），key 名稱直接沿用 `FILTER_CONFIG[].key`，不用額外對照表，之後篩選維度增減也不用同步改這裡
- `view`：沿用單一機台分享連結已經在用的同一個參數，`map` 代表分享當下是地圖模式，對方點開後會 `setView('map')`

**同步網址**（`syncSearchUrl()`，`js/main.js`）：只從 `applyFilters()` 呼叫，沒有任何關鍵字／篩選條件時網址會乾淨地回到 `pathname`（不留空的 `?`）。**刻意不放進 `setView()`**：`setView()` 在頁面初始化時（`setView('grid')` 早於 `loadFromSheet()` 解析網址參數）跟單一機台分享連結落地時（`?id=` 分支會呼叫 `setView('map')`，但不會呼叫 `applyFilters()`）都會被呼叫到，如果在 `setView()` 裡同步網址，會在網址列的 `?id=` 或原始查詢字串還沒被讀取前、或單一機台深連結落地後，就把它洗掉。`applyFilters()` 只在使用者真的搜尋/篩選，或還原搜尋分享連結時才會被呼叫，時機才安全。**刻意不帶排序狀態**：距離排序（`distance_asc`/`distance_desc`）依賴分享者當下的定位座標，帶到連結裡對方點開套用分享者的座標沒有意義；結束日排序理論上可以帶，但目前先不做，維持跟排序無關的單純度。

**還原連結**（`loadFromSheet()` 的 `?id=` 判斷 `else` 分支，`js/main.js`）：讀到 `q`/`type`/`city`/`ip` 任一參數就代表是搜尋結果連結，寫回兩個搜尋框 value、直接對 `filterState[cfg.key]` 賦值（`filterState` 物件屬性可以直接改，見上方「跨檔案依賴要注意」），呼叫 `renderFilterBar()` 重新畫 pill 選中狀態，再呼叫 `applyFilters()` 套用（這次呼叫會連帶觸發 `syncSearchUrl()`，把網址正規化成跟還原後狀態一致，屬於良性的冪等行為）。跟 `?id=` 判斷共用同一個 `!silent` guard，只在真正的初次載入處理一次。

**GA4 事件**：`search_url_restored`（帶著搜尋/篩選參數的網址被打開、狀態被還原的那一刻；`has_keyword`, `has_filter`, `view`(map/grid), `device`）；全新事件，尚未在 GA4 後台的「GA4 事件追蹤表」資料庫登記，也還沒在「自訂定義」註冊 `has_keyword`/`has_filter` 這兩個新參數（`view`/`device` 都是既有維度，不用重新註冊）。沒有對應的「點擊分享」事件，因為沒有分享按鈕可以點——分享動作本身（複製網址列）發生在瀏覽器層級，前端偵測不到。

**跟 `sw.js` 的關係**：只動到 `index.html`／`js/main.js`／`style.css`，`index.html` 在 `SHELL_ASSETS` 清單裡，`CACHE_VERSION` 從 `'v30.7'` bump 到 `'v30.8'`。

**v35 追加**：`app.html` 的 `#btnGrid`／`#btnMap` 這兩顆 view-toggle 按鈕的 `onclick`，從單純 `setView('grid')`/`setView('map')` 補上 `window.syncSearchUrl && window.syncSearchUrl();`；`js/main.js` 對應新增 `window.syncSearchUrl = syncSearchUrl;` 讓 inline `onclick` 能呼叫到（比照 `window.shareLocation`／`window.filterByCharacter` 既有的跨檔案呼叫慣例）。純粹手動切換 grid／map 版面（沒有搜尋/篩選變動）過去不會同步網址，現在會——跟 `events.html` 這次同一輪加上的「總覽／月曆分頁籤也同步網址」是對稱的修正（見下方「搜尋結果分享連結：`eventsSyncSearchUrl()`」的 v35 段落）。

### 作品標籤點擊快速篩選（v33.4 追加）
grid modal（`main.js` `openGridModal()`）、地圖詳情面板（`map.js` `buildDetailContentHtml()`，桌機側邊欄／mobile bottom sheet 共用）的「作品：${loc.character}」這一行，從純文字改成 `<button class="popup-character-link">`（新增的 CSS class，`style.css`，虛線底線＋hover 變藍，視覺語言比照既有的 `.popup-title.event-title-link`，`events.html` 因為共用 `style.css` 也直接可用，見下方「活動詳情 Modal」）。

**`filterByCharacter(character, machineId, source)`（`main.js`，掛在 `window` 讓 `map.js` 動態產生的 HTML 也能呼叫，比照 `trackGmapsClick`／`shareLocation` 既有的跨檔案呼叫慣例）**：
- 把作品名稱塞進 `#searchInput`／`#searchInputMobile`，呼叫 `applyFilters()`（搜尋比對邏輯本來就吃 `loc.character`，不用新寫篩選規則，純粹是幫使用者代打字）
- **依目前是不是地圖模式（`document.body.classList.contains('map-view')`）決定要不要切換 view**，不是看 `source` 字串——列表模式（grid modal 觸發）關掉 modal、`setView('grid')`；地圖模式（`source==='map_detail_panel'` 時一定符合這個條件）刻意不切換 view，只呼叫 `window.closeDetailPanel(true)` 立刻收合詳情面板。`applyFilters()` 內部 `renderMapLocations()` 本來就會再呼叫一次 `closeDetailPanel(true)`（有 `closingDetailPanel` 防重入旗標擋著，兩次呼叫是安全的），先手動呼叫一次純粹是避免畫面在 `applyFilters()` 跑完之前，短暫還顯示著舊的詳情內容
- 地圖模式收合詳情後，桌機側邊欄／mobile bottom sheet 會自動改顯示篩選後的地點列表（`renderDesktopDefaultPanel()`／`sheetLoc` 為 `null` 時的 `renderMobileSheetContent()`），不用額外處理——維持「使用者本來就在地圖模式」的心智模型，不會被無預警推去列表 view
- 作品名稱塞進 inline `onclick` 屬性前先 `character.replace(/'/g, "\\'")` 跳脫單引號，避免作品名稱本身含英文撇號（例如羅馬拼音）時把 `onclick` 字串弄斷——這個專案目前沒有全站共用的 HTML/JS 屬性跳脫工具函式，其他既有的 inline `onclick`（`shareLocation`／`trackGmapsClick` 等）也沒有做這層跳脫，這裡算是新增的個案處理，不是補齊既有缺口
- GA `character_tag_click`（全新事件）：`character`、`machine_id`、`source`(grid_modal/map_detail_panel)、`device`；尚未在 GA4 後台「自訂定義」註冊，也還沒登記進「GA4 事件追蹤表」Notion 資料庫

### 分享連結 OG Meta（v20 新增，`api/share.js`）
**為什麼需要**：LINE / Threads / Discord / Facebook 的爬蟲不會執行 JavaScript，只讀 HTML `<head>` 裡寫死的 `og:title`/`og:image`。原本分享連結直接指向 `index.html?id=xxx`，不管哪個機台，社群平台抓到的都是同一份寫死的預設 meta（網站 logo），縮圖永遠一樣。

**做法**：新增 `api/share.js`（Vercel Serverless Function，路徑用查詢字串 `?id=`，不是動態路由資料夾），流程：
1. 讀 `req.query.id`
2. 依機台動態換圖（**v28.3 新增，v30.4 改為 permId 優先比對**）：`getShareImageUrl(id)` 打 Sheet CSV，先比對 `permId`（Q 欄），找不到才退回比對第 0 欄 `id`（A 欄流水號，相容修正上線前的舊格式連結），命中就回傳第 15 欄（分享圖）的值；**找不到、該欄空白、或抓取 CSV 失敗，都 fallback 回固定的 `/og.png`**（不讓分享頁面因為這支輔助邏輯掛掉）。標題／描述固定：「KADO！抽卡機在哪」、「想找抽卡機 / 相卡機？到「KADO！抽卡機在哪」找找，快速掌握最新的機台資訊！」
3. `<script>location.replace('/?id=xxx')</script>` 把真人導回正常網站

**幾個容易踩的坑（都是這次實際炸過的）**：
- **不要用 `<meta http-equiv="refresh">` 做跳轉**：Facebook 的爬蟲會乖乖跟著 meta refresh 走，導致爬到跳轉後的首頁、抓到首頁的 meta 而不是我們寫的內容。只留 JS `location.replace()`，爬蟲不執行 JS 就不會跳走
- **`og:image:width` / `og:image:height` 一定要明確寫**，尤其 LINE 對這兩個標籤敏感，沒有時常常直接不顯示圖
- **動態路由資料夾 `api/share/[id].js` 這個寫法在這個專案上一直卡在 Vercel 路由規則裡 404**（`config.json` 裡的 `check:true` fallback 行為沒排除清楚，具體原因沒有完全查清楚），改用**查詢字串** `api/share.js?id=xxx` 之後就正常了，路由規則簡單很多、風險低很多。之後不要再改回動態路由資料夾這個寫法
- **專案一定要有 `package.json`**（哪怕內容幾乎是空的），不然 Vercel 會把整個專案當純靜態網站處理，完全不會建置 `/api` 底下的任何 serverless function，Functions 分頁永遠不會出現
- **`public/` 資料夾會讓 Vercel 誤判「這就是整個網站」**：如果 `index.html` 放在專案根目錄、`public/` 只是拿來放額外的靜態檔案（例如 `og.png`），Vercel 零設定判斷會把 `public/` 當成唯一輸出目錄，導致 `index.html` 完全消失、首頁變 404。必須到 Project Settings → Build and Deployment → Output Directory，手動 override 設成 `.`（代表專案根目錄）。**目前 `og.png` 已經搬到專案根目錄（不在 `public/` 裡）**，直接對應 `/og.png`，不要再放回 `public/`
- `vercel deploy --prebuilt --prod` 能跳過雲端建置、直接部署本機建置結果，除錯時很好用（能鎖定「是本機建置的問題還是雲端部署設定的問題」），但如果本機建置本身依賴的專案設定是錯的（例如上面 Output Directory 那個問題還沒修），會直接把錯的結果推上正式站，比正常的 GitHub 自動部署更危險——不需要深度除錯時盡量用 `git push` 走 GitHub 自動部署，不要習慣性用這個指令

**v35 新增：P 欄依 grid／map 分兩張分享圖**——過去 P 欄（`SHARE_IMAGE_COL`，index 15）只能填一張圖，`grid` 檢視跟 `map` 檢視分享同一台機台時看到的縮圖永遠一樣。v35 改成 `pickShareImage(raw, isMapView)`：P 欄可以用「,」或「、」分兩張圖，第一張給 grid 檢視分享用、第二張給 map 檢視分享用。**規則刻意保守**：一定要湊滿兩張才會分別套用；只填一張（不管有沒有帶分隔符號）或完全空白，一律視為「沒有專屬分享圖」，grid 用固定預設圖 `/og.png`、map 用新增的 `/map-og.png`，不會把單獨那一張誤套到另一個檢視。`api/share.js`（分享按鈕導轉頁）跟 `api/index.js`（`/` 直接帶 `?id=` 落地）各自獨立宣告同一套 `pickShareImage()`，跟這個專案「CommonJS serverless function 之間無法互相 import，重複一份」的既有慣例一致。

### 自動刷新 + 下拉刷新（v24 新增，v31 起與 PWA 脫鉤）
- **問題背景**：PWA standalone 模式沒有瀏覽器重整按鈕，使用者無法主動更新資料，只能 force quit 重開（這是當初新增這兩個功能的起因，但功能本身跟裝置有沒有安裝成 PWA 無關，一般瀏覽器分頁開著一樣會作用）
- **v31**：PWA 功能整體移除，這兩個功能從 `js/pwa.js` 搬進 `js/main.js`，邏輯完全沒變，純粹是檔案搬家
- **自動刷新**：監聽 `document.visibilitychange` 與 `window.focus`（focus 當 iOS/in-app browser 的備援），回到前景時若距上次成功抓取（`lastFetchTime`）超過 `REFRESH_THROTTLE_MS`（30 分鐘）才真的打 API；`loadFromSheet({ silent: true, trigger: 'auto' })`
- **下拉刷新**：touch 手勢掛在 `#gridView`（列表模式的捲動容器），`scrollTop === 0` + 往下拉超過 60px（`PULL_TRIGGER_PX`）放開才觸發；視覺上用 `.ptr-indicator` / `.ptr-spinner` 顯示進度；`loadFromSheet({ silent: true, trigger: 'pull' })`，繞過節流（使用者主動操作不應被擋）
- **`silent` 模式**：不清空列表成「載入中」畫面，失敗時只用 toast 提示「更新失敗，請稍後再試」，不覆蓋使用者正在看的內容；初次載入不屬於 silent（`trigger: 'initial'`）
- **`!silent` guard on `?id=` handler**：`loadFromSheet()` 裡偵測分享連結的邏輯只在 `!silent` 時跑，避免背景刷新不斷把使用者已關掉的詳情彈窗重新彈出來
- **⚠️ v26.1 修正：spinner 卡住不轉、體感卡頓後直接收回**（bug 在 v26 期間發現並修好，但 v26 已經 push 上線、需要靠 `CACHE_VERSION` 再 bump 一次才能讓已快取的使用者拿到修好的檔案，詳見「Service Worker 快取版本管理」的 v26.1 條目）——根因是 `touchend` 觸發 loading 狀態時，`indicator.classList.add('loading')` 加上 CSS `animation: ptr-spin 0.7s linear infinite`（終點 `transform: rotate(360deg)`，沒寫 `from`）的**同一個 tick**，又呼叫 `setIndicatorHeight(PULL_TRIGGER_PX)` 把 spinner 的 inline `transform` 設成 `rotate(360deg)`——瀏覽器抓「animation 沒寫 from 時的隱含起點」是「動畫開始那一刻元素的當下計算值」，剛好也是 `360deg`，等於整段動畫是「從 360 度轉到 360 度」，視覺上完全不動；`loadFromSheet()` resolve 後 `.finally()` 拿掉 `.loading`、收回高度，體感就是「卡住不轉，然後直接收回」。修法：進入 loading 狀態時改成 `indicator.style.height = ...`（只設高度）+ `spinner.style.transform = ''`（清空殘留角度），讓 CSS animation 從乾淨的 `0deg` 起點開始轉，不呼叫會連帶設角度的 `setIndicatorHeight()`

### 排序後捲動重置（v24 新增）
- `applySortState()` 在 `renderGrid()` 之後，額外把 `#gridView`（列表模式）和 `.map-scroll-wrapper`（地圖模式側欄/sheet）的 `scrollTop` 重設為 0；排序＝重新給名次，捲動位置停在原地等於使用者看到的已經是不同排序下的名次，體驗上很混亂

### 無障礙 aria-label（v24 新增）
- 補上所有純圖示按鈕的 `aria-label`：`#btnGrid`/`#btnMap`（手機版文字被 CSS 隱藏）、`#clearSearch`/`#clearSearchMobile`、`.grid-modal-close`、兩個 `.popup-close-btn`（原本用裸 `✕` 字元）、三組情境的 carousel prev/next（各 2 個，共 6 個）
- 不影響任何邏輯或視覺；focus-visible 樣式留待後續補

### PWA / 加到主畫面（A2HS Banner，v21 新增，⚠️ v31 起功能已移除）

**⚠️ v31：這個功能已經整個移除，以下是移除前的歷史記錄，留著是為了之後如果想重新啟用，不用重新設計一次。實際程式碼已經不存在了，不要照著下面的描述去找檔案。**

**移除方式**（詳見「Service Worker 快取版本管理」v31 條目）：`js/pwa.js` 整個刪除；`app.html`／`events.html` 拿掉 `<link rel="manifest">`／`apple-touch-icon`／`theme-color`／`apple-mobile-web-app-*` meta／A2HS banner 的 HTML／CSS；`sw.js` 改寫成自我卸載版本。`manifest.json`／`icons/` 資料夾原封不動保留（只是沒有任何地方連結它們），復原時直接把連結加回去就好，不用重新產生圖示。

- 檔案結構：`manifest.json`、`sw.js` 都要放**專案根目錄**（不能放子資料夾），因為 service worker 的作用範圍是它所在路徑以下，`register('/sw.js')` 預期它在根目錄；圖示放 `icons/`，路徑寫死在 `manifest.json` 跟 `index.html` 兩處，改資料夾名稱要兩邊一起改
- Maskable icon 安全區檢查：用 PIL 抓非背景色像素的 bounding box，確認四邊 margin 都 ≥ 畫布寬度的 10%（512px 畫布要 ≥51px）就算落在安全區內；這個專案的 logo 本身留白已經足夠，maskable 版直接沿用一般版本，沒有額外重新排版
- SVG 轉 PNG 工具選擇：環境內建的 `convert`（ImageMagick）沒有 `rsvg-convert` delegate 會直接失敗；改用 `pip install cairosvg --break-system-packages`可行，但**濾鏡效果支援不完整**（`feGaussianBlur`/`feColorMatrix` 這類陰影效果會被忽略），如果 icon 有陰影一定要保留，改用 Figma 直接 export PNG（Figma 會完整算 filter），不要用 SVG 原始檔轉

**顯示邏輯：互動門檻制，不靠瀏覽器/固定延遲判斷**
- 累計「查看詳情」次數（grid 詳情按鈕 `card_click` + 地圖上點**單一**機台 marker，`locs.length === 1` 那個分支，cluster 點擊不算）達 `VIEW_THRESHOLD = 3`，用 `localStorage`（key: `a2hsCardViews`）跨造訪永久累計；或單次瀏覽停留超過 `DWELL_MS = 20000`（20 秒），兩者達成其一即觸發，用 `window.a2hsRecordCardView()` 這個掛在 `window` 上的函式讓外部（grid/marker 的 click handler）呼叫
- Android 的**顯示時機**已經改成自己的互動門檻判斷，但**實際安裝動作**技術上仍然一定要先拿到瀏覽器發出的 `beforeinstallprompt` 事件物件才能呼叫 `.prompt()`，這點無法繞過；如果互動門檻已達成但事件還沒來，`tryTrigger()` 會先跳過，事件一到（`beforeinstallprompt` handler 裡）會再呼叫一次 `tryTrigger()` 補顯示
- 關閉退避：`localStorage`（key: `a2hsDismiss`）記 `{count, lastDismissed}`，關過 3 次永久不顯示，否則每次關閉後要間隔 14 天才再顯示；用次數+時間戳而不是單純布林值，是因為 iOS Safari 的 ITP 機制在超過 7 天沒有主動互動時可能清掉 localStorage，用累加式設計即使某次記錄遺失，最壞情況也只是使用者多看到幾次，不會出現「怎麼一直跳出來」的體驗災難

**⚠️ 最容易踩的坑：DOM 元素定義順序晚於 script，`getElementById` 拿到 `null` 且完全沒有錯誤訊息**
`a2hs-banner` 的 HTML 一度被放在主要 `<script>` 標籤**之後**（跟 `share-toast` 一起）。inline `<script>` 沒有 `defer`，瀏覽器解析到那一行會馬上執行，這時候後面（在原始碼順序上）才出現的 `a2hsBanner` 這個元素根本還沒被解析出來，`document.getElementById('a2hsBanner')` 拿到 `null`。因為程式碼裡剛好有 `if (!banner) return` 這種防呆判斷，導致「安靜地失敗」——不會顯示、也不會噴任何 console 錯誤，肉眼完全看不出原因，只能照抓 bug 的方式一路查到「兩者在原始碼中的相對順序」才會發現。**修法**：所有會被 script 用 `getElementById` 抓取的 DOM 元素，HTML 一定要放在對應 `<script>` 標籤**之前**（或者把整段查詢包進 `DOMContentLoaded`/`window.onload` 回呼裡延後執行，但這個專案選擇前者，改動範圍比較小）。

**Bottom sheet 疊層**：`.a2hs-banner` 的 `z-index` 是 `2100`，故意設得比手機地圖模式的 `.sidebar`（`z-index: 2000`）高，banner 永遠蓋在最上面，不管 sheet 展開到哪一層；曾經嘗試過動態計算 sheet 高度、讓 banner 貼在 sheet 上緣正上方（掛 4 個同步點：`setView`/`applySheetLevel`/`touchmove`/`resize`），後來確認「直接蓋在最上面」的體驗可以接受，改回這個簡單很多的做法，動態同步的程式碼已經整個移除

**平板版型**：`@media (min-width: 768px)` 固定寬度 `400px`、水平置中（`left: 50%; transform: translateX(-50%)`）、`bottom: 12px`；Android 平板不用額外判斷 UA（本來就含 `android` 字樣會觸發），iPad 因為 iPadOS 13+ 預設偽裝成 Mac UA，`isIos` 判斷抓不到，維持現狀不特別處理（等於 iPad 目前不會顯示這個 banner）

### Service Worker 快取版本管理（v22 修正）
- **根因**：`CACHE_VERSION` 從 v21 引入 SW 之後一直卡在 `'v1'`，從未跟著 release 更新過。SW 的清快取邏輯是「版本號改變時，`activate` 才會清掉舊的 cache」，版本號沒動，`SHELL_CACHE` 裡的 `index.html` 等殼層資源就一直是第一次快取時的舊版本，改版後使用者要手動清瀏覽記錄才看得到最新內容
- **疊加問題**：`sw.js` 本身沒有設定 no-cache header，可能被瀏覽器一般 HTTP cache 卡住，導致連「偵測 SW 檔案內容是否變化」這個瀏覽器內建機制都沒被觸發
- **修法**：
  1. `CACHE_VERSION` 改成對齊 release 版號（`'v24'`），之後每次 release 只要動到 `SHELL_ASSETS` 清單裡的檔案（`index.html`、`manifest.json`、`favicon.svg`，或更新 Leaflet CDN 版本號）就要同步 bump，維持整數格式（`v25`、`v26`...），不用語意化版本
  2. 新增 `vercel.json`，對 `/sw.js`、`/`、`/index.html` 都設 `Cache-Control: no-cache, no-store, must-revalidate`，確保瀏覽器每次都重新抓這幾個檔案去比對，不會被一般 HTTP cache 擋掉 SW 的更新偵測
  3. 因為 `sw.js` 本身已經 no-cache，之後只調整 `fetch` handler 內部邏輯（不影響 `SHELL_ASSETS` 清單）而不動 `CACHE_VERSION` 也沒關係——瀏覽器會自己偵測到 `sw.js` 檔案 byte 不同、觸發新版安裝
- **2026/07 補充（`CACHE_VERSION` 跟對外版本號脫鉤）**：`CACHE_VERSION` 判斷要不要 bump，只看「這次改動有沒有動到 `SHELL_ASSETS` 清單裡任一檔案的 bytes」，跟這次改動在語意上算不算一個值得對外公布的版本（README/Notion 那個 v24、v25）無關——即使是純架構重構、沒有任何使用者可見的功能變化（例如 2026/07 從單一 `index.html` 拆成 ES Modules，`index.html` 內容本身變了），只要動到 `SHELL_ASSETS`，`CACHE_VERSION` 一樣要 bump，不然已安裝 PWA 的舊使用者會持續吃到快取住的舊殼層。這次剛好兩邊都遞增到同一個數字（`v25`）純屬巧合，不代表兩套編號以後永遠對得上——`CACHE_VERSION` 是機械式開關，Notion/README 的版本號才是語意判斷
- **v26**：`index.html`（`#topBar` wrapper 結構）、`style.css`、`js/main.js` 都改了，`index.html` 在 `SHELL_ASSETS` 清單裡，因此 bump；`style.css`／`js/main.js`／新增的 `js/scroll.js` 本來就不在 `SHELL_ASSETS`，靠 catch-all 的 `cacheFirst` 規則自然重抓，不受影響但仍受惠於這次 bump（`activate` 會整組清掉舊版 `SHELL_CACHE`，這些檔案也會一起變成 cache miss，強制重新打網路抓最新版本）
- **v26.1**：`v26` 已經 push 上線之後，才發現並修好 `js/pwa.js` 下拉刷新 spinner 的 bug（見「PWA 自動刷新 + 下拉刷新」）——這代表已經有使用者的 `cardradar-shell-v26` 快取住了有 bug 的舊版 `pwa.js`，即使把修好的檔案 push 上去，`CACHE_VERSION` 字串沒變、快取名稱沒變，`cache-first` 還是會命中舊快取，不會重新抓。這次沒有對應的新對外版號（README/Notion 仍算 v26 這個 release 的一部分），純粹需要一個「沒出現過的新字串」去觸發 `activate` 清快取，因此用 `'v26.1'`——再次印證 `CACHE_VERSION` 是機械式開關，只看「需不需要讓已快取的使用者重新抓檔案」，跟對外版本號語意上算不算一個新版本無關
- **v27**：更新日誌功能上線，動到 `index.html`／`style.css`／`js/main.js`（都在 `SHELL_ASSETS` 清單裡），`CACHE_VERSION` 從 `'v26.1'` 改為 `'v27'`；同時新增 `isChangelogRequest()` 判斷，讓 `changelog.json` 跟 Google Sheet 資料一樣走 network-first（原本會落入 catch-all 的 cache-first 殼層快取，導致之後只更新 `changelog.json` 內容、沒動到其他殼層檔案時，已安裝 PWA 的使用者看不到新增的更新日誌條目）
- **v28**：修正 search/filter/sort 連動失效、drag-to-full 高度異常三個 bug（見上方「跨檔案依賴要注意」的實際案例），動到 `main.js`／`sort.js`／`map.js`，`CACHE_VERSION` 從 `'v27'` bump 到 `'v28'`
- **v28.1**：`v28` 已經 push 上線之後，才發現 `closeDesktopPanels` 沒有從 `filters.js` export 出去，導致 PC 排序按鈕丟 `ReferenceError`；補上 `export`/`import` 後，`CACHE_VERSION` 從 `'v28'` 改為 `'v28.1'`，讓已經快取住舊版 `sort.js`/`filters.js` 的使用者能拿到修好的檔案
- **v28.2**：修好「內容 ≥ full 時，上滑拖曳卡在 mid 附近上不去 full」的問題，動到 `js/map.js`：(1) `touchend` 改成依放開瞬間實際量到的高度找最接近的一階，不再永遠只跳固定一階，長距離單次拖曳才能一次跨到 `full`；(2) 內容量測（`measureSheetContentHeight()`）改成先等內容裡的圖片 `load`/`error` 完才量 `scrollHeight`——`.popup-img` 沒有固定高度／`aspect-ratio`，圖片還沒載入完成前是 0px，量測沒等圖片就量會漏算圖片高度，把有圖片的長內容誤判成短內容，導致拖曳上限被鎖在太小的高度。`CACHE_VERSION` 從 `'v28.1'` 改為 `'v28.2'`
- **v28.3**：`api/share.js` 分享圖從固定 `/og.png` 改為依機台動態抓取，新增 `getShareImageUrl(id)`，依 `?id=` 到 Google Sheet CSV 找對應列第 15 欄（分享圖），找不到/空白/抓取失敗一律 fallback 回 `/og.png`；只動到 `api/share.js`（不在 `SHELL_ASSETS` 清單、是 serverless function 不受 SW 快取影響），`CACHE_VERSION` 未變動
- **v29**：網站更名為「KDAO！抽卡機在哪」、網域從 `cardradartw.vercel.app` 搬到 `kadotw.vercel.app`（舊網域設定 301 轉址保留舊分享連結）。動到 `index.html`（title、structured data、apple-mobile-web-app-title、A2HS banner 文案）、`manifest.json`、`api/share.js`（`SITE_URL`/`TITLE`/`DESCRIPTION`/`og:site_name`）、app icon 四個尺寸（同檔名覆蓋，`manifest.json`/`index.html` 路徑不用改）；`index.html` 在 `SHELL_ASSETS` 清單裡，`CACHE_VERSION` 從 `'v28.3'` bump 到 `'v29'`。`sitemap.xml`、`robots.txt` 網域同步更新；`counterapi.dev` 命名空間（`cardradartw`）與結構化資料 `alternateName`（`Card Radar TW`）刻意保留舊名字未跟著改——前者改了會讓累積訪客數歸零，後者是讓搜尋引擎知道舊站名也對應同一個網站
- **v30**：訪客計數改用自架 Cloudflare Worker + KV，取代第三方 `counterapi.dev`（見上方「訪客計數 Banner」）。新增 `worker.js`／`wrangler.toml`（不在 `SHELL_ASSETS`，獨立部署到 Cloudflare，不隨 Vercel 走）；動到 `visitor.js`（API 網址）、`sw.js`（`isNoCacheRequest` 判斷的網域），`CACHE_VERSION` 從 `'v29'` bump 到 `'v30'`，確保已快取住舊版 `visitor.js` 的使用者能拿到指向新 API 的版本。舊系統累積的訪客數（2000）用 Worker 的 `/reset` 端點手動接續，不從 0 重算
- **v30.1**：埋碼稽核發現 `map_marker_click` 文件記錄的參數（`machine_type`）跟程式碼實際送出的參數（`machine_count`）對不上，回去看程式碼才發現這個事件原本就沒送 `machine_type`——單一機台點擊時其實拿得到 `locs[0].type`，只是當初沒補上。修正 `js/map.js` 的 `marker.on('click', ...)`，補上 `machine_type: locs.length === 1 ? locs[0].type : null`，讓地圖上直接點機台圖示也能在 GA4 拆分抽卡機／相卡機的點擊數據；`machine_count` 保留（cluster 時仍可用來知道涵蓋幾台）。只動到 `js/map.js`，`CACHE_VERSION` 從 `'v30'` bump 到 `'v30.1'`
- **v30.2**：新增排序選項「結束日：遠到近」（`end_date_desc`）。動到 `js/sort.js`（`SORT_OPTIONS` 加入新選項）、`js/grid.js`（`sortLocations()` 改為依 `dir` 乘數決定方向；**無期限的常態機不管哪個方向都一律排最後**，不受 `dir` 影響，因為沒有結束日不等於「最遠」，是另一種狀態，兩個方向都不該把它排進日期區間裡）。`sort_change` 事件本身不用改程式碼就自動記錄新的 `sort_key` 值（`selectSortOption(key)` 沿用既有參數傳遞邏輯），但事件表裡列舉的 `sort_key` 可能值要記得同步補上 `end_date_desc`，不然回頭看報表會看到一個「文件沒寫過」的值感到困惑
- **v30.3**：埋碼健檢（已經一段時間沒新增埋碼、但功能持續在加，回頭抓 repo 全面比對「有互動但沒埋碼」的地方）發現三個缺口，補上：
  - `sort_panel_open`／`sort_panel_close`：排序面板/sheet 原本只追蹤「選了什麼」（`sort_change`），沒追蹤「打開來看但沒選」這個行為，跟篩選面板（有 `filter_panel_open`/`filter_panel_close`）不對稱。動到 `js/sort.js`（`closeDesktopSortPanel`/`closeMobileSortSheet` 改成吃 `method` 參數，只有真的傳了 method 字串才記錄，選排序導致的自動收合刻意不傳、避免跟 `sort_change` 重複記一次同個時間點）、`js/filters.js`（開篩選面板時關掉排序面板的呼叫點，標記 `switch_panel`）。**修正時順便抓到一個潛在 bug**：原本 `sortSheetClose`/`sortSheetOverlay` 的 `addEventListener` 直接把 `closeMobileSortSheet` 當 callback 傳進去，瀏覽器會把 click 的 `Event` 物件當第一個參數傳入；改成 `method` 參數後這樣寫會把 `Event` 物件誤當成 `method` 送進 GA4，已改成箭頭函式明確傳入 `method` 字串
  - `search_clear`：搜尋框清除（X）按鈕原本完全沒追蹤，跟篩選 pill 的清除 icon（有 `filter_clear`）不對稱。動到 `js/main.js`，`source` 沿用 `search_box_focus` 既有的 `desktop_toolbar`/`mobile_toolbar` 慣例
  - `grid_modal_close`：列表模式的機台詳情彈窗關閉原本完全沒追蹤，地圖模式的對應行為（`detail_panel_close`）卻有。動到 `js/main.js` 的 `closeGridModal(e)`，`method` 判斷邏輯直接比照 `changelog_close` 的既有寫法
  - 只動到 `js/sort.js`／`js/filters.js`／`js/main.js`，`CACHE_VERSION` 從 `'v30.2'` bump 到 `'v30.3'`
- 純資料更新（Google Sheet 內容變動）不受影響，本來就是走 `DATA_CACHE` 的 network-first
- **v30.4**：分享連結改用永久ID（`permId`，Q 欄），見上方「分享連結永久ID機制」。動到 `js/main.js`（`shareLocation()`/`?id=` 解析邏輯/parseCSVRow 欄位對照全部重排）、`js/map.js`（分享按鈕改帶 `permId`）、`api/share.js`（`getShareImageUrl()` 改用 `PERMANENT_ID_COL`）；`main.js`/`map.js` 在 `SHELL_ASSETS` catch-all 範圍內，`CACHE_VERSION` 從 `'v30.3'` bump 到 `'v30.4'`。`api/share.js` 本身不受 SW 快取影響（serverless function，`isNoCacheRequest` 排除），這部分改動不需要靠 bump 觸發更新
- **v30.5**：倒數 badge 擴及 grid modal／地圖詳情面板（見上方「倒數 Badge」）。動到 `js/main.js`／`js/map.js`，`CACHE_VERSION` 從 `'v30.4'` bump 到 `'v30.5'`
- **v30.6**：`v30.4` 上線後發現舊格式分享連結（A 欄流水號）被誤判成「已下架」——原本只比對 `permId`，沒有 fallback 機制，導致修正上線前產生、機台其實還在的舊連結全部顯示已下架 toast。補上三段式判斷（永久ID精準比對才自動開啟／A 欄 fallback 比對到但刻意不開啟／兩者都找不到才顯示已下架），新增 `share_link_legacy_fallback` GA 事件；`api/share.js` 也補上同樣的 fallback（但保留採用 fallback 結果，跟 `main.js` 刻意安靜處理不同，見上方「分享連結永久ID機制」的不對稱設計說明）。動到 `js/main.js`、`api/share.js`；`main.js` 在 `SHELL_ASSETS` catch-all 範圍內，`CACHE_VERSION` 從 `'v30.5'` bump 到 `'v30.6'`
- **v30.8**：搜尋結果的網址列即時同步，見上方「搜尋結果網址即時同步」章節。只動到 `js/main.js`（`syncSearchUrl()`／`applyFilters()` 內呼叫／`?id=` 判斷的 `else` 分支還原邏輯），不涉及任何新 UI 元素，`index.html`／`style.css` 沒有變動；`main.js` 在 `SHELL_ASSETS` catch-all 範圍內，`CACHE_VERSION` 從 `'v30.7'` bump 到 `'v30.8'`
- **v30.9**：修好 `v30.7` 引入的 `api/index.js`（首頁 `/` 動態 OG meta）其實從未真的生效過的 bug。**根因**：Vercel 的路由優先權是「同路徑的靜態檔案 > `vercel.json` 的 `rewrites`」；專案根目錄一直有一個 `index.html`，導致 `/` 這個請求永遠直接命中這份靜態檔案，`"/" -> "/api/index"` 的 rewrite 規則排不到，`api/index.js` 形同虛設——不管是 `/?id=` 分享連結還是 `v30.8` 的搜尋結果分享連結，社群平台爬蟲抓到的其實一直是完全沒有 `og:image` 的空殼（實測 `https://kadotw.vercel.app/` 完全沒有任何 `og:` 標籤，反而沒有撞名靜態檔案的 `/api/share` 是正常的，藉此定位到根因）。**修法**（Vercel 官方文件建議的標準解法：把撞名的靜態檔案或 function 其中一個改名）：
  - `index.html` → `app.html`（改名，讓 `/` 不再對應任何實體檔案，rewrite 才會真的接手）
  - `api/index.js`：`fs.readFileSync` 改讀 `app.html`
  - `events.html`：原本寫死的兩處 `href="index.html"` 改成 `href="/"`
  - `sw.js`：`SHELL_ASSETS` 移除已經不存在的 `/index.html`（不移除的話 `cache.addAll()` 會因為抓不到 404/redirect 而讓整個 SW 安裝失敗）
  - `vercel.json`：拿掉多餘的 `/index.html` header 規則（檔案已不存在），新增 `/index.html -> /` 的 301 redirect 相容舊的直接連結
  - `README.md`／`docs/spec.md` 同步更新
  - `main.js`／`app.html` 本身沒有變動，但 `sw.js`／`vercel.json` 都動了，屬於殼層層級的修正，`CACHE_VERSION` 從 `'v30.8'` bump 到 `'v30.9'`
- **v31：PWA 功能整體移除**（Gill 決定的產品方向調整，不是 bug 修正）。移除範圍：
  - `js/pwa.js` 整個刪除（A2HS 安裝提示 banner + Service Worker 註冊）
  - `app.html`／`events.html`：拿掉 `<link rel="manifest">`、`apple-touch-icon`、`theme-color`、`apple-mobile-web-app-*` meta
  - `app.html`：拿掉 A2HS banner 的 HTML；`style.css`：拿掉對應的整塊 CSS
  - `js/grid.js`／`js/map.js`：拿掉 3 處呼叫已不存在的 `window.a2hsRecordCardView` 的死代碼
  - **保留並搬家**：「回到前景自動刷新」「下拉刷新」這兩個跟安裝與否無關的功能，搬進 `js/main.js`（見「自動刷新 + 下拉刷新」章節）
  - **`sw.js` 沒有刪除，改寫成自我卸載版本**：已經安裝過 PWA 的舊使用者裝置上還留著舊版 `sw.js` 在背景運作，直接砍掉這個檔案的話，那些人的瀏覽器抓 `sw.js` 會拿到 404，既有的 SW 不會被自動卸載、會繼續套用舊的離線快取邏輯，永遠看不到新內容。新版 `sw.js` 的 `activate` 階段做的事：清空所有快取（`caches.keys()` 全部 `delete`）、呼叫 `self.registration.unregister()`、把當下開著的 client 視窗 `navigate` 一次讓它們立刻改用一般網路請求。已安裝使用者下次連網開啟 App 時會自動跑完這個流程、退回一般網頁模式
  - **`CACHE_VERSION` 機制隨之整個作廢**：新版 `sw.js` 已經沒有版本字串、沒有任何 `cache-first` 邏輯，「動到 `SHELL_ASSETS` 就要 bump」這條規則的存在理由（強迫瀏覽器重新抓被快取住的殼層檔案）不再成立。**之後任何新功能都不用再 bump 任何東西**——這不是「這次剛好不用 bump」，是這個機制已經永久消失了
  - **`manifest.json`／`icons/` 保留原檔案，只是拿掉連結**：不刪除，方便之後如果想重新啟用 PWA，直接把連結加回去即可，不用重新產生圖示
  - 動到 `app.html`／`events.html`／`style.css`／`js/main.js`／`js/grid.js`／`js/map.js`／`js/utils.js`／`sw.js`；`js/pwa.js` 刪除

### 倒數 Badge（v23 新增，v30.5 擴及詳情彈窗）
- `getEndingBadge(loc)`/`getEndDate(loc)`：解析 `limited` 欄位（`"2026/06/24～2026/07/12"` 格式，取「～」後半段）算出結束日，跟今天比較天數差
- 只在結束日 3 天內顯示：今天結束 → 「最後一天」，明天 → 「倒數 2 天」，後天 → 「倒數 3 天」；超過 3 天或沒有 `limited` 欄位都不顯示（回傳 null，呼叫端直接不渲染）
- **卡片**：顯示於 `.card-badge-row`，跟既有的 type-badge 同一個 flex row：type-badge 靠左、`.ending-badge` 靠右（`justify-content: space-between`）
- **詳情彈窗（v30.5 新增）**：grid modal（`main.js` `openGridModal()`）、地圖詳情面板（`map.js` `buildDetailContentHtml()`，桌機側邊欄／mobile bottom sheet／cluster popup 選項後的詳情三處共用同一個函式）都補上了，用新的 `.modal-badge-row`（`display:flex; gap:8px`，**不做** `space-between`）把 type-badge 跟 ending-badge 緊鄰排在一起——跟卡片版的「兩端對齊」是刻意不同的版型，因為 modal 裡沒有第三個元素需要撐開對齊；`main.js` 用 `.modal-type-badge` class 控制外層 margin（原本就有這個 class 但沒接上，這次順便接起來取代原本的 inline style），`map.js` 則是把 badge 群組包在 headerRow 內，跟關閉鈕維持原本的 `space-between`
- 背景 `#FFCF48`、黑字；中途討論過用紅色，最後定案黃色
- 動到 `main.js`／`map.js`，`CACHE_VERSION` 從 `'v30.4'` bump 到 `'v30.5'`（見「Service Worker 快取版本管理」）

### Icon 系統
- 全站使用 Material Symbols inline SVG（從 Google Fonts 下載 SVG 檔，`fill="#000000"` 改為 `fill="currentColor"`）
- Type badge 使用 FILL1 版本（實心）
- Filter pill 的展開/收合用同一顆 `arrow_drop_down` icon + CSS `transform: rotate(180deg)` 切換，不是切換兩顆 icon（v18 以前的 filter chip 用兩顆 icon 切換 active 狀態，v19 改版後已不適用）
- 彈窗（地圖 popup / grid modal）資訊欄不使用 icon，純文字標籤
- **View Toggle 按鈕（v34）**：`app.html` 的地圖／列表 icon、`events.html` 的月曆 icon 都採「outline + fill 兩顆 SVG 疊放、依 `.view-btn.active` 用 CSS `display:none`/`block` 切換」的寫法（各自有 `xxx-icon-outline`／`xxx-icon-fill` 兩個 class），而不是用單一 SVG 換色。目前套用範圍：`.map-icon-outline`/`.map-icon-fill`（app 地圖）、`.grid-icon-outline`/`.grid-icon-fill`（app 列表）、`.calendar-icon-outline`/`.calendar-icon-fill`（events 月曆）。`events.html` 總覽 icon、`.events-link` FAB icon 是靜態單顆 SVG，沒有 outline/fill 切換需求
- **⚠️ v34 追加：`.grid-icon-outline`/`.grid-icon-fill` 一度只有 HTML 標記、沒有對應 CSS 規則**：新增這兩顆 class 時只複製了 `.map-icon-outline`/`.map-icon-fill` 的 SVG 標記，忘了複製對應的三條 CSS 切換規則（`.grid-icon-fill { display: none; }`／`.view-btn.active .grid-icon-outline { display: none; }`／`.view-btn.active .grid-icon-fill { display: block; }`），導致 `#btnGrid` 的兩顆 SVG 沒有預設隱藏其中一顆、不論啟用狀態都同時疊著顯示；補上對應規則後修復
- **`.events-multi-pill`／`.events-bar-multi-badge`「N 地點」圖示（v34 追加）**：原本用一般定位圖示（`location_on` 系列），且三個使用位置（月曆橫幅／拼貼格狀卡片／拼貼列表卡片）尺寸不一致；統一改用 `map_pin_heart` FILL icon（16×16），`.events-bar-multi-badge`（月曆橫幅角標）原本完全沒有 icon，補上同款 12×12 icon

### 列表 view-btn icon bug 與其他細部樣式調整（v34 追加）
- **`.loc-card-grid`／`.loc-card` hover 效果，經過幾輪調整才定案**：
  1. 起點（v34 前面幾批改動留下的狀態）：`border-color: var(--fill-blue); transform: translateY(-2px); box-shadow: 0 8px 24px var(--fill-blue-16);`
  2. 第一輪：改成 inset 邊框，`box-shadow: inset 0 0 0 2px var(--fill-blue)`，拿掉外陰影與 `transform`
  3. 第二輪：補回外陰影（`0px 8px 24px rgba(0, 102, 255, 0.16)`），變成 `box-shadow: inset 0 0 0 2px var(--fill-blue), 0 8px 24px rgba(0, 102, 255, 0.16)`
  4. 第三輪（最終定案）：補回 `transform: translateY(-2px)` 上移動畫，inset 邊框從 2px 改細成 1px；最終樣式：`box-shadow: inset 0 0 0 1px var(--fill-blue), 0 8px 24px rgba(0, 102, 255, 0.16); transform: translateY(-2px);`
  - `.loc-card:hover`（地圖模式側邊欄／mobile bottom sheet 地點清單卡片）同步套用一樣的最終效果
- **`.collage-list-wrap` 補 `padding-top`，避免拼貼列表第一排卡片 hover 效果被裁掉**：events 頁拼貼列表的捲動容器是巢狀兩層（見「拼貼列表獨立包一層 `.collage-list-wrap`」章節）——外層 `.events-page-body`（`padding-top: 8px`）＋內層 `.collage-list-wrap`（真正裁切卡片內容的那層，原本完全沒有 `padding-top`）；`.loc-card-grid:hover` 的 `translateY(-2px)` 位移＋外陰影會被內層自己的 `overflow-y: auto` 邊界裁掉一截，只有第一排卡片會出現這個現象。補上 `.collage-list-wrap { padding-top: 8px; }`；手機版（≤900px）原本已有補償固定頂部工具列高度的 `padding-top: var(--events-top-bar-height, 0px)`，改成 `calc(8px + var(--events-top-bar-height, 0px))`，兩者疊加不互相蓋掉
- **`.filter-panel`（篩選桌機 dropdown）補 `overflow-x: hidden`**：原本只設 `overflow-y: auto`，CSS 規格規定一軸是 `auto`/`scroll`、另一軸是預設的 `visible` 時，瀏覽器會把 `visible` 那軸隱性當成 `auto` 處理，導致極端情況下面板可以左右滑動；補上明確的 `overflow-x: hidden` 後只會上下捲動
- **`.events-bar-title`（月曆橫幅標題）補上 `font-weight: 500`**（原本沒設，繼承預設的 400）
- 動到 `style.css`／`events.css`／`js/events.js`

### GA4 自訂事件（v19 起，v21 新增 PWA / 加到主畫面相關事件，v22 新增排序/定位相關事件，v23 新增 sheet 自動展開／關閉方式追蹤，v24 新增 PWA 刷新/分享連結追蹤、getDeviceType 擴充為 PWA 感知，v31 起 PWA 相關事件停用）
| 事件名稱 | 觸發時機 | 參數 |
|---|---|---|
| `search_box_focus` | 點擊搜尋框（兩個 input 各自觸發） | `source`（desktop_toolbar/mobile_toolbar；v23 文件曾誤記 map 這個值，程式碼中實際不存在，v24 已修正）, `device` |
| `search` | 輸入關鍵字（debounce 800ms，共用 timer） | `search_term`, `device` |
| `filter_click` | 點擊篩選面板/sheet 裡的選項 | `filter_type`, `filter_value`, `filter_state`(on/off), `device` |
| `filter_panel_open` | 打開篩選 pill 的面板或 bottom sheet | `filter_type`, `device` |
| `filter_panel_close` | 使用者主動關閉面板/sheet（程式自動觸發的收合不算，見下方保護機制） | `filter_type`, `had_selection`, `device` |
| `filter_clear` | 點擊篩選 pill 上的清除（X）icon，且該類別當下有套用中的篩選（v22 起從全域「清除篩選」按鈕改為單一 pill 各自清除，`clearFilterKey(key)`） | `filter_type`, `device` |
| `filter_result` | `applyFilters()` 執行後（debounce 800ms，僅在有套用篩選時記錄） | `type`, `city`, `ip`（各自 join 成字串）, `result_count`, `device` |
| `view_toggle` | 切換列表 / 地圖（跳過初始化那次） | `view_mode`, `device` |
| `card_click` | 點擊機台卡片 | `machine_id`, `machine_name`, `machine_type`, `source`(map_sidebar_list/map_cluster_popup/grid), `device` |
| `map_marker_click`（v30.1 修正參數） | 直接點地圖上的機台圖示（跟透過清單點擊的 `card_click` 是不同路徑）；點到的可能是單一機台，也可能是多台機台聚合成的 cluster 圖示 | `machine_id`（cluster 時為 null）, `machine_type`（單一機台時才有值，cluster 時為 null，因為裡面可能混著抽卡機/相卡機沒有單一值）, `machine_count`（這次點擊涵蓋幾台機台，可用來篩出 `=== 1` 的單一機台點擊）, `device` |
| `gmaps_click` | 點擊「在 Google Maps 查看」連結 | `machine_id`, `source`(grid/map_popup/grid_modal/share_modal), `device` |
| `share_click` | 點擊分享按鈕（v24 補上 `device`；v23 文件曾誤記 source 含 map_popup，實際值是 map_detail_panel） | `machine_id`, `source`(grid_modal/share_modal/map_detail_panel), `device` |
| `lightbox_open` | 點圖放大 | `machine_id`, `device` |
| `carousel_nav` | 輪播圖 prev/next（刻意不帶 machine_id，避免同一人滑多張洗版；v24 補上 `device`） | `direction`(prev/next), `device` |
| `sheet_toggle` | 手機地圖模式手動拖拉 bottom sheet（切換地圖模式時的程式化重置不算；v24 補上 `device`） | `state`(v23 起為 peek/mid/full/content，取代原本的 open/peek), `device` |
| `sheet_auto_expand`（v23） | 搜尋/篩選出結果，`applyFilters()` 判斷 sheet 原本在 peek 就自動展開到 mid 的那一刻 | `device` |
| `detail_panel_close`（v23） | 使用者主動關閉詳情面板/sheet；`closeDetailPanel(forcePeek, method)` 的 `method` 參數決定觸發位置 | `method`(x_button/empty_map_tap/popup_native_close), `device` |
| `report_click` | 點擊回報表單連結（v24 補上 `device`） | `device` |
| `auto_refresh`（v24） | 回到前景後通過節流門檻（距上次抓取超過 30 分鐘）、真的觸發背景刷新 | `device` |
| `pull_to_refresh`（v24） | 列表模式下拉超過 60px 放開手指、真的觸發刷新 | `device` |
| `data_refresh_error`（v24） | 靜默刷新失敗（auto 或 pull 觸發，初次載入失敗走另一套流程，不算） | `trigger`(auto/pull), `device` |
| `share_link_opened`（v24；v30.4 起限定永久ID精準比對成功） | 分享連結的 `?id=` 精準比對到 `permId` | `machine_id`, `view`(map/grid), `device` |
| `search_url_restored`（v30.8） | 讀到 `?q=`/`?type=`/`?city=`/`?ip=` 任一參數並還原成搜尋/篩選狀態的那一刻（帶搜尋條件的網址被打開） | `has_keyword`, `has_filter`, `view`(map/grid), `device` |
| `share_link_legacy_fallback`（v30.6 新增） | 永久ID比對失敗，退回比對 A 欄流水號有找到列（舊格式連結，機台可能還在但無法確認是不是原本那一台）；此時**不會**自動開啟任何內容 | `machine_id`(連結裡的 A 欄值), `device` |
| `share_link_target_missing`（v24） | 分享連結的 `?id=` 永久ID跟 A 欄流水號都找不到對應機台（已下架/刪除） | `machine_id`, `device` |
| `a2hs_engagement_met`（v21，⚠️ v31 停用） | ~~累計查看詳情達 3 次，或單次停留超過 20 秒（兩者擇一）~~——PWA 移除後不再觸發，僅供查歷史資料 | `reason`(cumulative_views/dwell_time), `platform` |
| `a2hs_banner_shown`（v21，⚠️ v31 停用） | ~~加到主畫面 banner 實際顯示~~——PWA 移除後不再觸發，僅供查歷史資料 | `platform`(android/ios_safari/ios_in_app) |
| `a2hs_banner_dismissed`（v21，⚠️ v31 停用） | ~~使用者關閉 banner~~——PWA 移除後不再觸發，僅供查歷史資料 | `reason`(close_x/ack) |
| `a2hs_prompt_result`（v21，⚠️ v31 停用） | ~~Android 原生安裝視窗的使用者選擇~~——PWA 移除後不再觸發，僅供查歷史資料 | `outcome`(accepted/dismissed), `platform`(固定 android) |
| `pwa_installed`（v21，⚠️ v31 停用） | ~~`appinstalled` 觸發（PWA 安裝完成）~~——PWA 移除後不再觸發，僅供查歷史資料 | `platform`, `source`(a2hs_banner/native_browser_ui) |
| `pwa_launch_mode`（v21，⚠️ v31 停用） | ~~每次頁面載入判斷 standalone/browser 開啟~~——PWA 移除後不再觸發，僅供查歷史資料 | `mode`(standalone/browser) |
| `sort_change`（v22，v30.2 曾新增 `end_date_desc`，v41 移除、新增 `start_date_asc`） | 選擇排序方式並實際套用（距離排序需等定位成功才觸發，選了但定位失敗不算） | `sort_key`(end_date_asc/start_date_asc/distance_asc/distance_desc), `device` |
| `geo_permission_result`（v22） | 距離排序觸發 `navigator.geolocation` 定位請求後取得結果的當下 | `geo_result`(granted/denied/timeout/unavailable), `device` |
| `changelog_open`（v27） | 打開更新日誌 modal/sheet | `source`(header_desktop/header_mobile_list), `device` |
| `changelog_close`（v27） | 關閉更新日誌 modal/sheet | `method`(x_button/backdrop_click), `device` |
| `sort_panel_open`（v30.3） | 打開排序 dropdown（桌機）或 bottom sheet（手機） | `device` |
| `sort_panel_close`（v30.3） | 使用者主動關閉排序面板/sheet，且面板原本真的是開著的（`toggleDesktopSortPanel()`/`closeDesktopSortPanel(method)`/`closeMobileSortSheet(method)` 內部都會先檢查 `wasOpen`）；選了排序選項導致的自動收合**不算**，那個時間點已經有 `sort_change` 記錄，重複記一次沒有額外資訊 | `method`(toggle_button/outside_click/switch_panel/x_button/backdrop_click), `device` |
| `search_clear`（v30.3） | 點擊搜尋框的清除（X）按鈕；桌機/手機兩個輸入框各自的清除鈕都會觸發（因為兩邊 value 是同步的，清一邊等於兩邊都清空，但只算使用者實際點擊的那一顆按鈕） | `source`(desktop_toolbar/mobile_toolbar), `device` |
| `grid_modal_close`（v30.3） | 關閉列表模式的機台詳情彈窗（grid modal）；`method` 判斷邏輯比照 `changelog_close`：background 點擊時 `closeGridModal(event)` 有傳事件物件、X 按鈕 `closeGridModal()` 沒有傳 | `method`(x_button/backdrop_click), `device` |
| `character_tag_click`（v33.4 新增） | 點擊機台詳情彈窗（grid modal）／地圖詳情面板（桌機側邊欄／mobile bottom sheet）的「作品」標籤，篩出同作品所有機台 | `character`, `machine_id`, `source`(grid_modal/map_detail_panel), `device` |

**追蹤時的保護機制**（避免程式自動觸發的行為污染數據）：
- `filter_result` / `filter_clear`：沒有套用任何篩選時不記錄（純搜尋、初始狀態、清除已經是空的都不算）
- `filter_panel_close`：`clearAllFilters()` 導致的關閉、視窗 `resize` 導致的自動收合，都透過 `skipTracking` 參數明確跳過
- `sheet_toggle`：只在 `initBottomSheet()` 裡真正的拖拉手勢分支（`touchend`）觸發，且只在層級真的改變時才記錄；程式化的高度變動（`applySheetLevel()` 被搜尋展開、篩選重置、關閉詳情等邏輯呼叫）不埋事件，避免這些自動觸發污染數據
- `sheet_auto_expand`（v23）：只在「原本在 peek、且這次篩選/搜尋有結果」這個分支觸發；已經在 mid/full 時篩選/搜尋不會觸發（維持原本高度，也不記錄）
- `detail_panel_close`（v23）：`closeDetailPanel(forcePeek, method)` 只有在**沒有** `forcePeek`、**有** `method`、且 `sheetLoc` 非空（真的正在看某台機台詳情）時才記錄；篩選/搜尋改變觸發的 `forcePeek` 重置、或根本沒開任何東西時點空白處，都不算數，避免跟 `filter_result` 那類事件重複計數同一次操作
- `geo_permission_result`（v22）：只有實際呼叫 `navigator.geolocation.getCurrentPosition()` 才會觸發。已知拒絕過（`localStorage` 的 `geo_permission_denied`）之後直接顯示提示、不再呼叫 API，這種情況不會產生事件——這代表這個事件反映的是「呼叫嘗試次數」的授權率，不是「不重複使用者」的授權率，兩者會有落差
- 所有自訂參數（`filter_type`、`source`、`device`、`result_count` 等）要在 GA4 後台「管理 → 自訂定義 → 自訂維度」手動註冊，才能在標準報表/Explore 查詢；v23 新增的 `sheet_auto_expand`（無自訂參數，只有標準的 `device`）已註冊，`detail_panel_close` 的 `method`（維度名稱：「關閉方式」）**v30.3 稽核截圖確認已經註冊完成**，下方 v24 清單那條「尚未註冊」已過時，見 v30.3 章節更新

**v24 待完成清單**（GA4 後台「管理 → 自訂定義 → 自訂維度」）：
- ~~`method`（`detail_panel_close` 專用，v23 起）：全新參數，尚未在 GA4 後台註冊~~ → **已於 v30.3 確認註冊完成**（維度名稱「關閉方式」），見下方 v30.3 章節
- `view`（`share_link_opened` 專用）：全新參數，尚未在 GA4 後台註冊
- `trigger`（`data_refresh_error` 專用）：全新參數，尚未在 GA4 後台註冊
- `device` 維度說明文字待更新：v24 起值從 mobile/desktop 擴充為 mobile/mobile_pwa/desktop/desktop_pwa，GA4 後台自訂維度的說明文字需手動更新

**v27 待完成清單**：
- 「GA4 事件追蹤表」資料庫新增 `changelog_open`／`changelog_close` 兩筆記錄；`新增版本`跟`觸發位置`的 schema 選項裡還沒有「v27」跟「更新日誌 Modal/Sheet」，需要手動到資料庫設定裡加選項（工具權限沒有 `update-data-source`，沒法自動加）
- `Sheet 狀態`（`state`）說明文字待更新：目前後台還寫舊的 open/peek，應改為 peek/mid/full/content
- `觸發來源`（`source`）說明文字待更新：目前後台列出的 source 值有部分已過時（如 map_popup、map_list），需修正為實際值
- 「GA4事件追蹤表」資料庫（v27）：`changelog_open`/`changelog_close` 已新增記錄，但「新增版本」跟「觸發位置」schema 選項裡還沒有「v27」跟「更新日誌 Modal/Sheet」，需手動到資料庫設定裡加選項（工具權限沒有 `update-data-source`，無法自動加）

**v30.3 待完成清單**：
- `sort_panel_open`／`sort_panel_close`／`search_clear`／`grid_modal_close` 這四個新事件**沒有引入任何全新的參數名稱**——都是沿用既有的 `method`、`source`、`device`，不用新增自訂維度。截圖核對 GA4 後台「自訂定義」後確認：`method`（關閉方式）、`source`（觸發來源）、`device`（裝置類型）都已經註冊過，四個新事件不用等任何維度註冊就能在報表上查得到
- 但有 **3 個既有維度的「說明」欄位文字沒有跟著新值更新**，內容還停在舊版本，需要去 GA4 後台手動編輯：
  - **排序方式**（`sort_key`）：目前只寫 `end_date_asc/distance_asc/distance_desc`，缺 v30.2 新增、v41 已移除的 `end_date_desc`，也缺 v41 新增的 `start_date_asc`——回頭補charts說明文字時直接寫最終值（`end_date_asc/start_date_asc/distance_asc/distance_desc`），不用把已經移除的 `end_date_desc` 也列進去
  - **觸發來源**（`source`）：截圖看不到完整內容，但至少缺 `search_clear` 沿用的 `desktop_toolbar`/`mobile_toolbar`（這兩個值其實 `search_box_focus` 早就在用，只是說明欄位本來就沒寫全，之前沒發現）
  - **關閉方式**（`method`）：截圖顯示到 `x_button/backdrop_click/empty_map...` 就被截斷，缺 v30.3 新增的 `toggle_button`/`outside_click`/`switch_panel`
- 「GA4 事件追蹤表」資料庫需要新增這四筆記錄（工具權限沒有新增資料庫 row 的操作，需人工在 Notion 裡加）——**已於 v30.3 完成**，四筆都已新增

**v30.6 待完成清單**：
- `share_link_legacy_fallback` 沒有引入新的參數名稱（沿用既有的 `machine_id`、`device`），不用新增自訂維度，但「GA4 事件追蹤表」資料庫需要新增這筆記錄（工具權限沒有新增資料庫 row 的操作，需人工在 Notion 裡加）

**v30.8 待完成清單**：
- `search_url_restored` 這個全新事件需要到 GA4 後台「管理 → 自訂定義 → 自訂維度」註冊 `has_keyword`／`has_filter`（`view`/`device` 都是既有維度）
- 「GA4 事件追蹤表」資料庫需要新增這兩筆記錄（工具權限沒有新增資料庫 row 的操作，需人工在 Notion 裡加）

**⚠️ `addEventListener` 直接傳函式參照的坑**：`addEventListener('click', someFn)` 會把 `event` 物件當作 `someFn` 的第一個參數傳入。如果 `someFn` 的第一個參數是拿來控制邏輯用的（例如 `skipTracking`），會被 `event` 物件（永遠 truthy）誤判，導致邏輯整個相反卻不會報錯。要嘛改用箭頭函式包一層再傳（`addEventListener('click', () => someFn())`），要嘛該參數不要放在第一位。
- **v30.3 實例**：補 `sort_panel_close` 埋碼時，`closeMobileSortSheet` 從無參數改成吃 `method` 參數，而 `sortSheetClose`/`sortSheetOverlay` 原本的寫法正好是 `addEventListener('click', closeMobileSortSheet)` 這種直接傳函式參照的寫法——改參數簽章前就先抓到、順手改成箭頭函式，沒有實際踩雷上線，但差一點就是本文件警告的那個坑

**`data-machine-id` 屬性**：grid 卡片、地圖 popup、詳情 modal 的容器上都有這個屬性，`lightbox_open` 事件靠 `e.target.closest('[data-machine-id]')` 反查回是哪個機台，不用在每個開圖的地方各自傳一次 id。

### 圖片 URL 處理
- `driveUrlToImage(url)`：Google Drive 連結轉換為 `thumbnail?id=...&sz=w800`（`uc?export=view` 已被 Google 封鎖）
- Cloudinary 連結加上 `/upload/w_800,q_auto,f_auto/` 最佳化參數
- 建議優先使用 Cloudinary，Drive 直連長期不穩定

### 訪客計數 Banner
- 位置：`#topBar` 內、header 正上方，全寬，文字置中；v26 起併入 `#topBar`，mobile 列表模式下跟 header/toolbar/filter-bar 一起滑動隱藏/顯示（見下方「#topBar 滑動隱藏（v26 新增）」）
- **v30 起改用自架 Cloudflare Worker + KV**，取代原本的第三方 `counterapi.dev`（免費服務沒有 SLA，隨時可能停用/改規則，換成自己架的服務完全掌控在自己手上）
  - Worker 原始碼：`worker.js`；部署設定：`wrangler.toml`（KV binding `VISITOR_KV`）；不放在 `SHELL_ASSETS`，是獨立部署到 Cloudflare 的服務，不隨主站 Vercel 部署走
  - API：`GET https://visitor-counter.gillsponge-601.workers.dev/`（每次載入累加 KV 裡的數字 +1 並回傳目前值），`visitor.js` 負責呼叫並寫進 DOM
  - 手動改數字（例如接續舊系統累積的數字）：`GET /reset?value=N&secret=xxx`，`secret` 存在 Cloudflare Worker 的 Secret（`RESET_SECRET`），不寫死在程式碼或 git 裡；v30 上線時用這個端點把數字從 0 接續設回舊系統累積的 2000
- 計數方式：page view（非 unique visitor）；曾討論過要不要用 `localStorage` 旗標做「同一瀏覽器不重複計」，結論是不做——現有語意就是「次數」而非嚴謹去重，真要看 unique visitor 直接查 GA4 後台的「使用者數」即可，不必為了公開 banner 多背一套邏輯
- API 失敗時 banner 靜默隱藏，不影響其他功能
- **⚠️ v22 修正：曾被 SW 誤快取導致數字凍結**——`sw.js` 的 `fetch` handler 裡，`isDataRequest`／`isImageRequest` 都判斷不到的請求會全部掉進最後的 catch-all，用 `cacheFirst(request, SHELL_CACHE)` 處理，counter API 也符合這個條件，導致第一次呼叫後就被快取住，之後每次 refresh 都拿到快取的舊回應，人數永遠不會增加。修法是新增 `isNoCacheRequest(url)`，符合的請求直接 `fetch(request)` 繞過快取，不進 `cacheFirst`；v30 換 Worker 後，判斷式裡的網域同步從 `api.counterapi.dev` 改成 `visitor-counter.gillsponge-601.workers.dev`

### #topBar 滑動隱藏（v26 新增）
- **範圍**：header + toolbar + `#filterBar` + 訪客計數 banner 包成 `#topBar` 一個 wrapper；只在 `max-width: 900px`（v33.4 前為 768px）**且** `body:not(.map-view)`（列表模式）生效——地圖模式下 `#topBar` 維持原本 static flow，`position`／高度完全不受影響，因為 `map.js` 的 mobile bottom sheet `full` 高度是動態貼齊 filter-bar 下緣算出來的（見「Mobile Map Bottom Sheet」），改動這個會牽一髮動全身
- **實作方式**：`#topBar` 在生效範圍內改 `position: fixed; top:0`，用 `transform: translateY(-100%)` 做隱藏，而不是 `max-height` 動畫——`max-height` 過渡時，畫面高度會先跟著實際內容走、直到動畫值低於內容高度才「突然」開始收合，觀感是「捲了一段才卡一下才開始消失」，`transform` 沒有這個問題
- **滑動判斷邏輯**（`js/scroll.js`，監聽 `#gridView` 的 `scroll`，不是 window scroll，因為捲動容器是 `#gridView` 本身）：
  - 往下滑：累積 delta 超過 `HIDE_THRESHOLD`（8px）才隱藏，避免手抖誤觸
  - 往上滑：delta 一有負值就立刻顯示，不設門檻（對應「哪怕滑一點點」的需求）
  - 捲動位置在 `TOP_SAFE_ZONE`（頂部 24px）內一律強制顯示，避免捲到頂端時因為零星 delta 抖動
- **`#gridView` 的 `padding-top`**：因為 `#topBar` 變成 `fixed`（脫離文件流），`#gridView` 要保留對應高度避免第一批卡片被蓋住，寫成 `calc(12px + var(--top-bar-height, 0px))`；`--top-bar-height` 這個 CSS variable 由 `js/scroll.js` 動態量測 `#topBar.getBoundingClientRect().height` 寫入，**不是寫死的數字**
  - **量測時機的坑**：訪客計數 banner 是非同步出現的（`visitor.js` 抓到人數後才把 `display:none` 打開），如果只在 `resize` 時重新量測，banner 突然跳出來的那一瞬間高度會沒跟上、內容被蓋住一小段。改用 `ResizeObserver` 直接盯 `#topBar` 本身的尺寸變化，banner 出現、螢幕旋轉、未來任何內容變動都會自動觸發重新量測，不用為每個成因各自補監聽
- **`setView()` 切換時**：呼叫 `resetTopBarScrollState()`（`js/scroll.js` export），確保切到地圖模式或切回列表時 bar 狀態一定重置成可見、高度重新量測乾淨，不會殘留「切換前恰好處於隱藏狀態」的殘影
- **z-index**：`#topBar` 用 `250`，比 header 原本的 `200` 高一點但遠低於 filter/sort sheet（2200/2201）跟各種 modal（9999+），不會蓋過那些主動觸發的互動層，見「面板/sheet 疊層順序」段落，之後新增 fixed 定位元素記得先看這裡列的所有 z-index 值
- **mobile 列表模式間距（v26 調整）**：filter-bar 底部到第一張卡片的距離，從原本 `.filter-bar` 的 `padding-bottom: 12px` + `#gridView` 的 `padding-top: 12px` 疊加成 24px，改成只留 `#gridView` 自己的 12px——`body:not(.map-view) .filter-bar { padding-bottom: 0; }`，只在列表模式生效，地圖模式的 `.filter-bar` 維持原本 12px（`full` sheet 高度計算依賴這個值，不能動）
- **GA**：評估過不加新事件——這是捲動手勢驅動的連續 UI 動畫，跟現有事件（`view_toggle`、`card_click` 等）對應「明確使用者意圖」的性質不同，硬加會產生大量低價值事件，還會排擠 GA4 免費額度裡真正重要事件的採樣

### Header 順序（PC）
`最後更新時間 ｜ 回報表單 ｜ 更新日誌 　[列表][地圖]`（v27 起新增「更新日誌」）

- **窄螢幕修正（v32）**：`<412px`（例如 iPhone SE）header 右側多了活動入口圖示後標題沒地方喘息，`@media (max-width: 412px)` 把 `.logo h1 span`（副標題「抽卡機在哪」）隱藏，只留「KADO！」品牌字，避免標題被壓到換行或截斷
- mobile header 的 `padding` 從 `20px` 改成 `20px 20px 20px 12px`（左邊縮窄），配合新增的 FAB 騰出空間

### 更新日誌（v27 新增）
- `js/changelog.js`：讀取根目錄 `changelog.json`、渲染條目列表、開關 modal/sheet、觸發 GA event
- `changelog.json`（根目錄，跟 `manifest.json` 同層）：`date`/`version`/`text` 三欄，`text` 可為字串（單筆）或陣列（同天多筆，各自變成一個 bullet），`version` 純內部對照用、不顯示給使用者
- `index.html`：桌機 header 的「最後更新｜回報表單」後方新增「更新日誌」連結；手機列表模式上方同一排的 meta 資訊也同步加上；新增獨立的 `changelog-overlay`/`changelog-panel` 彈窗結構——刻意不共用既有的 `grid-modal`（機台詳情，寬度太窄）跟 `filter-sheet`（篩選排序 bottom sheet，多段拖曳太複雜），另起一套簡單版：桌機置中 modal（`max-width: 480px; max-height: 80vh`）、手機純 CSS media query 切成貼底單一高度 sheet（`max-height: 70vh`），不做拖曳/snap 手勢
- 標題下方加一行 `made by @yywggwyy` 署名（Space Mono，灰字）
- **z-index**：2300，蓋過 filter/sort sheet（2200/2201）（v31 起 A2HS banner 已移除，不再是排序考量之一）
- **⚠️ 開發時踩過的坑**：mobile 版原本只把 `.header-right .report-link` 跟 `.header-divider` 列入隱藏清單，沒把新的 `.changelog-link` 也列進去，導致桌機那顆連結在手機 header 上跟著跑出來、跟手機列表列的那顆重複——已補上隱藏規則
- `sw.js`：新增 `isChangelogRequest()` 判斷，讓 `changelog.json` 走 network-first（見「Service Worker 快取版本管理」v27 條目）
- GA4 事件：`changelog_open`（`source`: header_desktop/header_mobile_list，`device`）、`changelog_close`（`method`: x_button/backdrop_click，`device`）；GA4 後台「新增版本」跟「觸發位置」schema 選項還沒有「v27」跟「更新日誌 Modal/Sheet」，需手動到資料庫設定加選項（工具權限沒有 `update-data-source`，無法自動加）

---

## 活動行事曆頁（`events.html`，v32 新增，v33 起隨機台頁互相連結，v33.1 補上作品欄位／分享 OG 圖，v33.3 相關機台卡片列補左右箭頭，v33.4 初始載入效能修正＋搜尋結果分享連結）

跟 `app.html` 是完全獨立的頁面（同分頁導航過去，不是 overlay/modal），header logo／右下角 FAB 互相導覽。整理「非常駐機台」的實體活動（動漫快閃店、聯名展覽、簽名會、CAFÉ／餐廳聯名、特典活動），資料來自同一份 Google Sheet 的另一個分頁（欄位規格見上方「Google Sheet 欄位」章節旁的活動分頁說明，或 `spec.md`）。

### 為什麼是獨立頁面、獨立一批模組
`main.js` 頂層會連帶載入 `filters.js`／`sort.js`／`map.js`／`scroll.js`，這些模組初始化時都預期 `app.html` 才有的 DOM（例如 `#filterSheetOverlay`、`#sortSheetOverlay`）。若 `events.js` 直接 `import` 這條鏈，在 `events.html` 上執行會直接噴錯、整條 import chain 中斷，行事曆畫不出來。因此拆成完全獨立的一批檔案：`events.js`（頁面邏輯，不 import `main.js`）、`events-data.js`（資料層，fetch 活動分頁 CSV）、`events-header.js`（抓「最後更新」時間戳，不需要 `main.js` 整份協調邏輯；v32.1 起同時 fetch 機台分頁比較時間戳，見「最後更新元素」）、`events-scroll.js`（手機版頂部 bar 滑動隱藏，照抄 `scroll.js` 但要盯 3 種子模式的捲動容器）。

### 共用工具搬遷到 `utils.js`
以下邏輯原本各自定義在不同檔案，因為 `events.js` 也需要用、又不能拖進 `main.js`/`grid.js` 那條鏈，搬到零依賴的 `utils.js`，行為完全不變，`grid.js`/`main.js` 改成從 `utils.js` import 同一份：
- `TW_CITY_ORDER`（原在 `filters.js`）
- `getEndDate()`／`getEndingBadge()`（原在 `grid.js`）——`period` 欄位沿用跟 `limited` 一樣的 `"yyyy/MM/dd～yyyy/MM/dd"` 格式，直接複用同一套判斷，不重寫
- `driveUrlToImage()`（原在 `main.js`）
- `haversineKm()`（原在 `grid.js`）——拼貼模式距離排序取「一組活動裡離使用者最近的那個地點」也要用

`grid.js` 開頭額外重新 `export { getEndingBadge }` 一次，是因為 `main.js` 既有 `import { getEndingBadge } from './grid.js'` 語句，這樣改動範圍只在 `grid.js`/`utils.js`，不用連帶改 `main.js` 的 import 來源。

### 共用 UI 元件抽出：`filter-widget.js` / `sort-widget.js`
首頁的篩選/排序 pill＋桌機下拉面板＋手機 bottom sheet 這整套 UI 渲染／開合／換行後量寬／GA 事件邏輯，跟 `events.js` 的篩選/排序需求幾乎一模一樣，直接從 `filters.js`／`sort.js` 抽成兩個通用元件：
- `createFilterWidget({ config, getOptions, state, barEl, sheetOverlayId, ..., isMobileLayout, onChange, gaPrefix, onTogglePanel, onOpenSheet, onOutsideClose, onResizeClose })` — 「資料從哪來」「選完要做什麼」「選取的意義是什麼（未選=全部 or 未選=都不顯示）」「要不要跟排序面板互相關閉」全部透過參數/callback 注入，元件本身只管畫 UI、開合、量寬、送 GA
- `createSortWidget({ options, initialKey, sheetOverlayId, ..., isMobileLayout, onChange, gaPrefix, onTogglePanel, onOpenSheet, onOutsideClose, onResizeClose })` — 差異：排序選項是垂直清單不換行，不需要量寬機制；多一套定位權限流程（`geoPermissionDenied`／`requestUserLocation`／`GEO_ERROR_MESSAGES`），這塊是排序元件獨有

`filters.js`／`sort.js`（首頁）跟 `events.js`（行事曆頁）各自呼叫 `createXxxWidget()` 建立**自己的一份實例**，掛在各自的 DOM id 上，兩份實例互不相干；`sort-widget.js` 的 DOM id（`sortBtn`/`sortPanel`/...）是寫死字串，因為一個頁面只會有一個排序元件實例，不像篩選元件同一頁有機台/IP/縣市三組、需要 `data-key` 動態區隔。

首頁 `filters.js`／`sort.js` 現在只保留：首頁專屬的選項資料計算（`buildFilterOptions`）、跟 `main.js`/`grid.js`/`map.js` 的串接（`applyFilters`／`sortLocations`／`renderMapLocations`）、跟對方（篩選 ⇄ 排序）面板互相關閉的 hook。

### 資料分組：同一檔活動在多地點
Sheet 仍是「一列＝一個地點」，畫面渲染前用「標題＋期間」把同一檔活動的多個地點合併成一組（group）——月曆橫幅／當日活動清單／拼貼卡片／詳情 Modal 都吃 group。分組 key（`g0`/`g1`...）用 `ensureGroupKeyMap()` 在第一次用到時從**未經篩選**的 `allEvents` 算一次，不受篩選狀態影響（避免篩選切換時同一組的 key 對不起來），也不直接拿標題字串當 key（避免標題含逗號等字元打斷 `data-group-key` 屬性值）。這是務實做法，不用改 Sheet 結構；真的遇到「兩檔不同活動剛好同標題同期間」的巧合，建議加一欄專用的「活動群組ID」取代字串比對。

### 機台⇄活動自動比對（v33，`js/event-match.js`）
不新增 Google Sheet 欄位，機台「店名＋期間限定」對活動「標題＋期間」做正規化字串比對；`app.html`（`main.js`／`map.js`）跟 `events.html`（`events.js`）共用同一份 `js/event-match.js`，不各自複製一份——這條規則屬於單一事實來源很重要的類型，機台端判斷「這台有沒有活動」、活動端判斷「這個地點有哪些機台」，兩邊各自維護一份、改一邊忘記改另一邊，會出現互相矛盾的結果且不容易發現。

**`normalizeForMatch()`**：`String.normalize('NFKC')`（全形英數轉半形）+ 正規表示式去除空白／全形半形括號／常見標點，轉小寫。比對前雙方欄位都先跑這個函式，避免全半形或標點差異造成比對失敗。

**`matchMachineToEventRow(machine, eventRows)`**：
- `hasNoEventLinkTag(machine.note)` 為真直接回傳 `null`（見下方排除標記）
- 用正規化後的 `title`+`period` 篩出候選（`eventRows.filter(...)`）；候選 0 筆回傳 `null`，1 筆直接回傳該筆
- 候選 >1 筆（同一檔活動在多地點開）依序用「篩到剩一筆就採用」的邏輯縮小範圍，不是同時 AND 三個條件：
  1. `machine.city === ev.city`（縣市完全一致）
  2. `ev.venue.includes(machine.venue) || machine.venue.includes(ev.venue)`（場地子字串互相包含，兩邊填法不一定對稱，誰包含誰都算）
  3. `haversineKm()` 取最近的一筆（雙方都要有合法經緯度才會跑這段）
  - 三段都沒篩出唯一結果 → 回傳 `null`（寧可不標，不要標錯，貫穿整套邏輯的原則）

**`findRelatedMachines(eventRow, machines, groupLocations)`**：反向查詢用，`events.js` 呼叫時一定要傳完整 `group.locations`（不能只傳 `eventRow` 自己一筆），否則多地點活動裡，同標題同期間的機台會被每個地點都判定成相關——內部對每個候選機台重跑一次 `matchMachineToEventRow(m, groupLocations)` 做消歧，只留下 `match.id === eventRow.id` 的。

**手動排除標記**：`NO_EVENT_LINK_MARK = /[【\[]\s*不連結活動\s*[】\]]/`，機台備註欄位（N 欄）符合就永遠跳過自動比對，不管標題/期間多相似；`stripNoEventLinkTag()` 在顯示備註文字時把標記本身拿掉（全域版 regex `replace`），使用者看不到標記文字。

**渲染／埋碼串接**：
- `machineTitleHtml(loc, { className, source })`（`main.js`/`map.js` 共用渲染函式）：比對到活動時標題變成 `<a class="event-title-link">`，inline `onclick="trackEventTitleClick(...)"` 送 `event_title_click`（比照既有的 `trackGmapsClick` 寫法，掛在 `window` 上——因為 `main.js`／`map.js` 兩邊渲染出的 HTML 都要能呼叫到，函式本身只在 `main.js` 定義一份）
- `relatedMachinesHtml()`（`events.js`）：每張卡片加 `data-machine-id` 屬性，`bindLocationSectionEvents()` 內用 `addEventListener` 送 `related_machine_click`，寫在同函式既有的 `gmaps_click`／分享按鈕綁定旁邊，同一套綁定時機
- 兩個事件的參數細節見下方「GA4 事件（活動行事曆專屬）」

**兩個跨頁連結的 `target` 刻意不同**：`machineTitleHtml()` 產生的機台標題連結（機台→活動）沒有 `target="_blank"`，同頁跳轉；`relatedMachinesHtml()` 產生的相關機台卡片連結（活動→機台）有 `target="_blank" rel="noopener"`，另開分頁。這不是疏漏，是兩邊使用情境不同：機台標題連結是「看機台時順便看一下對應活動」，同頁跳轉可以直接用瀏覽器上一頁鍵退回機台，體驗比較連續；相關機台卡片是在活動詳情 Modal 裡，使用者可能想依序點好幾台相關機台比較，或者看完某台機台後還想回來繼續看同一個活動的其他資訊（分享、地圖等），另開分頁能保留原本開著的活動 Modal 狀態，不用重新點一次進來。**這個理由是事後從程式碼行為反推、不是當初 commit 訊息或既有文件寫明的決策依據**，之後如果要調整（例如統一成同一種行為），建議先跟 Gill 確認這個推測是否符合原意。

**已知限制**：兩檔不同活動剛好「標題完全一樣、期間也完全一樣」時，比對規則本身無法區分是巧合還是同一檔活動，目前沒有防呆機制（機率低，暫不處理）。

### 活動多作品／IP 支援（v34 新增）
活動的「作品（IP）」欄位（J 欄）原本假設一活動只有一個 IP，但實際上聯名快閃常常同時掛 2～10+ 個 IP，一路貫穿資料層、卡片、Modal、搜尋、篩選四處，這次改成陣列：

- **`js/events-data.js`（`loadEvents()`）**：J 欄原始字串用頓號「、」拆開（不是逗號——CSV 本身用逗號分隔欄位，`parseCSVRow` 雖然有處理引號內逗號，但頓號更不容易讓填表的人跟真正的欄位分隔搞混）：
  ```js
  const characters = String(cols[COL.character] || '').split('、').map((s) => s.trim()).filter(Boolean);
  ```
  回傳物件同時保留 `character: characters[0] || ''`（單數、給還沒逐一改用陣列的舊程式碼 fallback 用）跟 `characters`（完整陣列）。舊資料（單一 IP、沒有頓號）解析後 `characters` 是長度 1 的陣列；空值則是空陣列——所有用到的地方都要 `|| []` 防呆。
- **`js/events.js` `visibleEvents()`**：關鍵字搜尋跟 IP 篩選都改成看 `ev.characters` 整個陣列（`.some()`），篩選邏輯是「選中的 IP 清單裡，有任一個出現在這個活動的 `characters` 陣列」的 OR 邏輯（不是要求同時符合全部選中的 IP，符合一般多選篩選直覺）；`ipOptions()` 篩選選項來源也改成 `allEvents.flatMap((ev) => ev.characters || [])` 先攤平再去重。
- **活動詳情 Modal（`characterChipsHtml()`）**：跟原本單一 IP 一樣維持「文字＋底線連結」呈現，刻意不做成 pill——這裡是完整資訊頁，pill 色塊比較適合摘要性質的卡片，Modal 一排色塊反而顯得擁擠。`MODAL_CHARACTER_LIMIT = 4`：4 個以內全部攤開、用「、」連接；超過 4 個時只顯示前 4 個，其餘包進 `.character-chips-rest`（`[hidden]`）並補一個「+N 個作品」按鈕（`#eventDetailCharacterToggle`）可展開/收合。**收合狀態刻意不顯示任何省略符號**（曾經一度用「...」表示還有更多，後續依 Gill 指示移除，因為看起來像被截斷或出錯）——分隔用的「、」本身也用一個獨立 `<span id="eventDetailCharacterSep" hidden>` 包起來，預設 `hidden`，展開時 `hidden` 屬性連同 `.character-chips-rest` 一起打開，不用改 `textContent` 塞字串。每個作品名稱各自是一個 `.popup-character-link` 按鈕，各自綁定點擊事件（`bindLocationSectionEvents()`），點哪個就呼叫既有的 `filterEventsByCharacter()` 篩出同作品的所有活動（沿用「活動詳情 Modal 作品標籤點擊快速篩選」既有機制，不用重寫）。展開/收合這個互動本身新增 GA4 事件 `character_chips_toggle`（`expanded`, `event_id`, `source`, `device`），跟點作品名稱本身觸發的既有 `character_tag_click` 是兩個不同事件，職責不同（一個是「篩選」意圖、一個是「看更多」意圖）。
- **拼貼卡片（`eventListCardHtml()`／`characterTagsForCard()`）**：`CARD_CHARACTER_LIMIT = 1`，卡片固定只顯示 1 個代表作品 tag，其餘數量合併顯示成同一個 pill 裡的淡化「+N」文字（`.tag-more-text`，`font-size:14px; color:var(--fill-gray-64)`，沒有自己的底色/邊框，視覺上就是同一顆 tag pill 裡的次要文字），例如「美少女戰士 +4」——不是另外開一個 pill、也不是卡片外面另起一行文字。理由跟「固定顯示數量、不依內容長短動態調整」一致：同一個 grid 裡卡片高度要盡量對齊，IP 數量落差太大時全部展開會破壞版面。多地點活動先把每個地點的 `characters` 攤平去重（`[...new Set(group.locations.flatMap((l) => l.characters || []))]`，保留第一次出現的順序，也就是 Sheet 填寫順序決定誰排最前面）；若使用者當下有套用作品／IP 篩選（`eventsFilterState.ip` 非空），`characterTagsForCard()` 會把「命中篩選條件」的 IP 排到最前面當代表，卡片才能一眼對上「為什麼會出現在篩選結果裡」，不用點進 Modal 確認。
- **討論過程中的設計調整**：Modal 內作品呈現最初考慮做成 pill chip，後來依 Gill 指示改回文字連結；卡片摘要則相反方向，從「顯示 2 個 pill + 文字 +N」收斂成「1 個 pill + 合併在同個 pill 裡的 +N」；Modal 收合狀態的「...」後續確認整個移除，不用任何符號表示還有更多。

### 快速篩選 pill：今日活動／有抽卡 / 相卡機（v34 新增）
`events.html` 篩選列新增兩顆快速篩選按鈕：「今日活動」（`start <= 今天 <= end`，篩掉還沒開始／已結束的活動）跟「有抽卡 / 相卡機」（該活動透過既有的機台⇄活動自動比對 `findRelatedMachines()` 能找到至少一台相關機台）。討論時排除掉「進行中／未開始」這種時間篩選，因為活動本來就已經照時間排序在最前面，篩這個沒有實質意義。

- **視覺沿用 `.filter-pill`**：跟類型／作品／縣市三顆篩選 pill 共用同一套樣式，不是另外做一組 checkbox；純粹點擊 toggle active（再點一次＝取消），active 時顯示跟 `filter-widget.js` 同一套 `.pill-clear`（✕）清除圖示，圖示本身包在按鈕內（`.pill-icon`），點擊會直接觸發按鈕自己的 click（toggle off），不需要另外攔截事件。
- **DOM 位置**：靜態 HTML 裡 `.quick-filter-group` 寫在 `events.html`，由 JS 的 `positionQuickFilterGroup()` 在初始化跟每次 `filterWidget.render()` 之後搬進 `#eventsFilterBar` 裡的 `.filter-scroll`（跟類型／作品／縣市 pill 同一個容器），夾在篩選 pill 跟排序按鈕（`.sort-group`）中間。**必須搬進 `.filter-scroll` 內、而不是當成它的 sibling**：`.filter-scroll` 才有 `overflow-x: auto`（≤900px 生效），搬到外面會導致這兩顆快速篩選 pill 在手機版無法跟類型／作品／縣市三顆 pill 一起左右滑動——這是實作過程中發現並修正的問題。`filterWidget.render()` 會整個清空重畫 `#eventsFilterBar`，所以每次重畫後都要再呼叫一次 `positionQuickFilterGroup()` 把 `.quick-filter-group` 重新搬進去。
- **`[hidden]` 覆寫**：`.filter-pill` 本身設了 `display: inline-flex`，author stylesheet 的優先權蓋過瀏覽器預設的 `[hidden] { display: none }` UA 規則，所以要另外加 `#eventsTimeFilterPill[hidden] { display: none; }` 明確覆寫，才能讓 JS 設的 `hidden` 屬性真的生效——跟既有 `.character-chips-rest[hidden]` 是同一個坑。
- **只在總覽（拼貼）檢視顯示，月曆檢視隱藏**：總覽 view 六顆控制項全顯示（類型／作品／縣市／今日活動／有抽卡相卡機／排序）；月曆 view 只顯示四顆（類型／作品／縣市／有抽卡相卡機），「今日活動」pill 跟「排序」按鈕都隱藏——理由是月曆檢視本身就是照日期瀏覽，「今日活動」篩選在這個檢視下語意重複。隱藏邏輯在 `setView()` 裡，比照既有 `.sort-group` 的 `hidden` 切換方式處理。
- **篩選邏輯在月曆檢視刻意繞過**：雖然「今日活動」pill 在月曆檢視被隱藏，但 `eventsTimeFilter.ongoingOnly` 這個狀態本身不會被清掉——`visibleEvents()` 的篩選條件裡額外判斷 `state.view === 'calendar'` 就直接跳過這條時間篩選，這樣使用者在總覽選了「今日活動」之後切到月曆再切回總覽，原本的選擇會被保留，不會因為畫面上看不到 pill 就悄悄被重置。
- **GA4**：新增 `events_quick_filter_toggle`，見下方「GA4 事件（活動行事曆專屬）」。

### 「相關機台」卡片列左右箭頭（v33.3 新增）
`relatedMachinesHtml()` 的卡片列（`.related-machines-list`，橫向 `overflow-x: auto`）原本只能靠 trackpad 雙指滑動或觸控滑動操作，滑鼠使用者缺乏「這裡還有更多」的視覺提示，也沒有直覺的操作方式（Shift+滾輪很少人知道）。v33.3 加上左右箭頭按鈕解決這個發現性問題：

- **按鈕一律渲染在 DOM 裡**（`.related-machines-wrap` 內固定放 prev/next 兩顆 `<button>`），顯示與否交給 CSS／JS 判斷，不是動態插入 DOM。
- **`@media (pointer: fine)`**：排除手機／平板觸控裝置（本來滑動就很自然，不需要按鈕）。⚠️ 這個 media feature 沒辦法區分「滑鼠」跟「trackpad」——瀏覽器角度兩者都是 fine pointer——所以 trackpad 使用者也會看到按鈕，是可接受的多餘 UI，不影響原本的滑動操作。跟月曆 hover 外框（見「月曆橫幅列排版與 hover 外框」章節）用的 `(hover: hover)` 不是同一個 media feature，這裡刻意選 `pointer: fine`，因為重點是排除觸控輸入而不是排除「移過去不點」的手勢能力。
- **`initRelatedMachinesScroll(loc, source)`**（新函式，掛在 `bindLocationSectionEvents()` 裡，所以初次開 modal、切換城市 tab 都會重新判斷一次）：用 `scrollWidth > clientWidth` 判斷卡片列是否真的溢出，溢出才加 `.has-overflow` class 讓按鈕顯示；`scroll` 事件同步更新左右按鈕的 `disabled` 狀態（捲到底/捲到頭就 disable 該側，避免點了沒反應）。點擊用 `list.scrollBy({..., behavior: 'smooth'})` 一次捲兩張卡片的寬度（含 12px gap）。
- **GA4**：新增 `related_machines_nav_click`，參數沿用 `related_machine_click` 同一套命名（`event_id`/`source`/`device`），額外帶 `direction`(prev/next)。事件細節見下方「GA4 事件（活動行事曆專屬）」。

### 「相關機台」卡片列箭頭按鈕視覺重做（v34，本節依「7 月曆 events-page-body 間距」chat 重寫）
沿用 v33.3 加的按鈕邏輯（DOM 一律渲染、`pointer: fine` 排除觸控、`initRelatedMachinesScroll()` 判斷溢出跟 disabled 狀態），這次只換按鈕本身的視覺與 icon（跟下一節「「相關機台」卡片徽章樣式與 hover 外框」是不同改動：那節動的是卡片本身的 type-badge／hover 外框，這節動的是卡片列兩側的箭頭按鈕）：
- 改成毛玻璃圓形按鈕：半透明白底 `rgba(255,255,255,.8)` + `backdrop-filter: blur(4px)`、`0.5px solid rgba(28,28,30,.08)` 髮絲邊框，陰影從 `box-shadow` 換成 `filter: drop-shadow(0px 4px 12px rgba(28,28,28,.08))`（跟 Figma 規格一致；`drop-shadow` 不受 `border-radius`/`backdrop-filter` 裁切影響，`box-shadow` 在有 `backdrop-filter` 時容易被裁掉一角）
- 按鈕內圖示改用專案既有的 `svg icon/chevron_forward_20dp_000000_FILL.svg`（`fill="#000000"` 改 `fill="currentColor"`，比照專案 Icon 系統慣例），取代原本的 unicode `‹`/`›` 字元；prev 方向不另外準備反向 icon，直接用同一顆 forward icon 疊 `transform: scaleX(-1)` 鏡射
- `:disabled { opacity: .3 }` 是既有規則，沒有改動——prev 按鈕預設 disabled（卡片列預設捲到最左），視覺上會比 next 淡，是預期行為不是沒套到新樣式
- ⚠️ 這兩項改動（本節＋上面的間距修正）曾經在後續的並行編輯中被意外洗回舊版本（毛玻璃樣式/icon 變回白底方塊＋unicode 字元），本節重寫時已確認 `events.css`／`js/events.js` 目前確實套用這份樣式，如果之後又看起來「沒有毛玻璃」，先檢查是不是又被洗掉，而不是假設從沒實作過

### 「相關機台」卡片徽章樣式與 hover 外框（v34 新增）
`relatedMachinesHtml()` 卡片（`.related-machine-item`）原本是直排：文字型 `.type-badge`（跟機台頁卡片同款「抽卡機／相卡機」文字＋色框）疊在名稱上方。v34 改成跟 `.cluster-popup-item`（cluster popup 清單）同一套緊湊徽章語言：

- **type-badge 改純 icon**：JS 端從輸出 `${m.type}` 文字改成輸出 `MACHINE_TYPE_BADGE_ICON[m.type]`（既有的 16px SVG icon 常數，先前只有拼貼卡片的 `machineTypeBadgesHtml()` 在用），CSS 端 `.related-machine-item .type-badge` 從文字 badge 的 `padding: 4px 8px; font-size: 12px` 改成跟 `.cluster-popup-item .type-badge` 一致的 `padding: 4px; border-radius: 4px; align-self: center`，卡片變窄、辨識度改靠圖示顏色（`.gacha`／`.photocard` 既有配色不變）。
- **版面從直排改橫排**：`.related-machine-item` 的 `flex-direction` 從 `column` 改 `row`、`align-items: center`，badge 跟 `.related-machine-name` 並排、`gap: 8px`；卡片自身 padding 從 `12px 12px 12px` 改成 `8px 12px`（上下 8px／左右 12px，橫排後名稱行數變少，不需要原本直排預留的上下空間）。
- **卡片高度以最高的為準**：`.related-machines-list`（橫向捲動容器）補上 `align-items: stretch`（原本沒設，預設值其實也是 `stretch`，這裡顯式寫出來避免之後誤改）；配合 `.related-machine-item` 固定寬度 `flex: 0 0 144px`，同一列裡文字行數不同的卡片仍會拉齊高度。
- **hover 外框改用 `inset box-shadow`**：一開始用 `box-shadow: 0 0 0 1px var(--fill-blue)`（往外擴散），結果上下兩側被裁掉一小段、左右正常——原因是 `.related-machines-list` 設了 `overflow-x: auto`，CSS 規範規定只要一個軸的 `overflow` 不是 `visible`，另一軸沒明確指定時會被隱含當成 `auto`（不是 `visible`），所以垂直方向其實也在裁切；左右因為 `.related-machines-list` 有 `gap: 12px` 讓外擴的 1px 有地方去，上下容器本身沒有預留空間，外擴的 1px 直接被裁掉。改成 `box-shadow: inset 0 0 0 1px var(--fill-blue)`（往內擴散、疊在既有 1px border 上）後不會超出卡片本身的 border-box，自然不會被裁切，上下左右都完整。

### 初始載入效能：`loadMachines()` 不該卡住第一次渲染（v33.4 修正，commit `f476f6e`）
v33 上線時 `initEventsPage()` 是 `await Promise.all([loadEvents(), loadMachines().catch(() => [])])`——`loadMachines()`（`js/machines-data.js`，機台分頁**另一份** Google Sheet CSV）只給 `machineTypeBadgesHtml()`（卡片上的抽卡機／相卡機徽章）跟 `relatedMachinesHtml()`（詳情 Modal 的「相關機台」清單）用，跟活動列表本身能不能顯示完全無關，卻被綁進同一個 `Promise.all`，導致月曆／總覽第一次渲染要多等一份 Google Sheet 的公開發布 CSV（本身就有一段 redirect，單次抓取常見 1~2 秒以上）才會出現，實測初次可互動時間明顯變慢。

v33.4 拆開兩份等待：
- `initEventsPage()` 改成只 `await loadEvents()` 就跑 `filterWidget.render()`／`sortWidget.render()`／`renderAll()`，畫面立刻可互動
- `loadMachines().catch(() => [])` 改成背景 `.then()`：載完後只呼叫一次 `renderAll()` 補上卡片徽章／相關機台清單（會晚一兩秒浮現，不再擋住整頁）
- 新增模組層級變數 `openModalState = { group, idx, source } | null`，在開啟 Modal／切換城市 tab 時更新、關閉 Modal 時清空；`loadMachines()` 背景載入完成時，如果 `openModalState` 不是 `null`（代表使用者這時候已經開著活動詳情 Modal，例如透過 `?event=` 分享連結直接落地就自動開了 Modal），額外重新渲染一次 `#eventDetailLocationSlot` 補上「相關機台」，避免因為機台資料晚到而永遠空白
- `eventsLoaded`／`machinesLoaded` 都只是模組內的記憶體旗標，不會跨頁面重新整理保留——每次重新整理都是完全重抓兩份 sheet，這點跟 v33 之前一樣沒有改變，只是不再互相卡住彼此

### 搜尋結果分享連結：`eventsSyncSearchUrl()`（v33.4 新增，比照機台首頁 `syncSearchUrl()`，commit `f476f6e`）
機台首頁 `js/main.js` 的 `applyFilters()` 每次都會呼叫 `syncSearchUrl()`，把搜尋關鍵字／篩選條件／目前是地圖還是列表用 `history.replaceState` 寫回網址列，讓「複製網址列」本身就是分享連結。`events.html` 原本完全沒有這套機制（`?event=` 單一活動分享連結是唯一的分享方式），v33.4 補上對稱的版本：

- **`eventsSyncSearchUrl()`**：讀 `eventsSearchKeyword`（trim 後）、`eventsFilterState`（`category`／`ip`／`city`）、`state.view`，組成 `?q=`／`category`／`ip`／`city`／`view`（只有 `state.view === 'calendar'` 才寫 `view`，總覽是預設值不用寫，跟機台首頁「只有非預設的 `map` 才寫 `view`」同一個省略邏輯）寫回網址列
- **呼叫時機刻意跟機台首頁一致**：只從 `setEventsSearchKeyword()`（搜尋框輸入／清除）跟 `filterWidget` 的 `onChange`（篩選 pill 變動）呼叫，**不放進 `setView()`／`setCollageLayout()`**——純粹切換總覽／月曆／格狀／列表本身不會觸發網址同步，只有連帶搜尋/篩選變動時才會把當時的 `state.view` 一起打包寫進去。這跟機台首頁的 `syncSearchUrl()` 只從 `applyFilters()` 呼叫、不放進 `setView()` 是同一個理由：`setView()` 在頁面初始化跟 `?event=`／`?q=` 深連結還原流程裡都會被呼叫到，如果在裡面同步網址，會在網址列的分享參數還沒被讀取完就把它洗掉
- **還原邏輯**：`initEventsPage()` 的 `?event=` 解析新增 `else` 分支——沒有 `?event=` 才偵測 `?q=`／`category`／`ip`／`city`／`view=calendar`，直接寫欄位／`eventsFilterState`／呼叫 `filterWidget.render()` 重新畫 pill 選中狀態，**刻意不呼叫 `setEventsSearchKeyword()`**（那個函式會順便呼叫 `eventsSyncSearchUrl()` 把網址列洗回去，這裡篩選/view 都還沒還原完，太早同步會把其他參數蓋掉），全部欄位設定完才一次 `renderAll()`（或 `setView('calendar')`，內部本來就會呼叫 `renderAll()`）；還原完送 `events_search_url_restored` GA4 事件（`has_keyword`／`has_filter`／`view`／`device`）
- **兩種分享連結互斥**：跟機台首頁「`?id=` 優先於 `?q=`」同一個判斷順序，`?event=` 判斷優先，沒有 `?event=` 才輪到 `?q=`／篩選參數

**v35 追加：把「總覽拼貼格／列表版面」跟「day-events-panel 開著哪一天」也一起同步進網址**，補齊 v33.4 版本沒涵蓋到的兩種畫面狀態：
- `eventsSyncSearchUrl()` 新增兩個參數：`state.view === 'collage' && state.collageLayout === 'list'` 時寫 `layout=list`（總覽是拼貼格的預設值，不用另外標記）；`currentOpenDayKey`（新增的模組層級變數，記錄目前 day-events-panel 開著的是哪一天，沒開就是 `null`）非空時，轉成 ISO 格式（`dayKeyToIso()`，內部 dayKey 格式是「YYYY-M-D」，月份 0-indexed 不補零，對外一律轉成人看得懂的「YYYY-MM-DD」）寫 `day=`
- **總覽／月曆分頁籤（`#eventsViewTabs .view-btn`）跟拼貼格狀／列表切換鈕（`#eventsCollageLayoutToggle .collage-layout-btn`）的 click handler，從單純呼叫 `setView()`／`setCollageLayout()` 改成額外呼叫 `eventsSyncSearchUrl()`**——比照機台首頁 v35 同步做法（見上方「搜尋結果網址即時同步」），讓使用者手動切換版面本身也會即時反映到網址列，不用等到搜尋/篩選才同步。頁面初始化、`?event=`／搜尋結果分享連結還原時仍是直接呼叫 `setView()`/`setCollageLayout()`，不經過這個 click handler，不會太早把網址列洗掉，這點跟 v33.4 的既有設計一致
- `openDayEventsPanel(key)` 開始時設定 `currentOpenDayKey = key`，結尾呼叫 `eventsSyncSearchUrl()`；`closeDayEventsPanel()` 結尾清空 `currentOpenDayKey = null` 再呼叫一次 `eventsSyncSearchUrl()` 把 `day=` 從網址拿掉，不然重新整理會又自動彈開
- **還原邏輯**：`?event=` 分支新增「`layout=list` 時先 `setCollageLayout('list')` 再開彈窗」，背景版面才會跟分享者當初看到的一致；搜尋結果分支的進入條件從「有關鍵字/篩選/`view=calendar`」擴充成也接受 `layout=list` 或 `day=` 單獨存在，還原時依序 `setView('calendar')`（如果有）→ `setCollageLayout('list')`（如果有）→ `renderAll()` → 如果有 `day=` 就轉回內部 dayKey、把 `state.month` 校正到該月份（`clamp` 到 `MIN_MONTH`）、`renderAll()` 一次、再 `openDayEventsPanel(dayKey)` 展開面板
- 這一步是為了讓「月曆點日期展開 day-events-panel」跟「總覽切成列表版面」這兩個原本完全沒有分享機制的畫面狀態，也能靠網址列本身分享出去（詳見下方「分享（`shareEvent()`）」的 `from` 參數，這是同一輪改動的另一半）

### 月曆檢視 / 總覽（拼貼）檢視
- **月曆**：月份格線，有活動的日期顯示「橫幅」（`.events-bar`，色碼對應 `EVENT_CATEGORIES`），超過可視高度收進「+N 更多」。點橫幅或「當日活動」清單卡片開詳情 Modal。`MIN_MONTH`（2026/05）鎖住最早可翻到的月份，避免翻到早於資料建置起點的空月曆讓人誤以為系統壞了；預設仍開「當月」，不是鎖死顯示最早月份
- **總覽**（`state.view: 'collage'`，v32 起是預設 view；對外顯示文字刻意用「總覽」不用「列表」，因為內部還有格狀/列表次要切換，兩層都叫「列表」會混淆）：卡片拼貼排版，不受月份侷限，一次看到全部符合篩選的活動；已結束/尚未結束分兩組各自排序，分組固定不受排序影響。內部「格狀／列表」切換（v32）是兩顆各自獨立的圖示按鈕，不是循環按鈕
- 排序（結束日/距離）只在總覽有意義，UI 掛在跟篩選 pill 同一排的 `#eventsFilterBar`，`setView()` 切到月曆時把 `.sort-group` 設成 `hidden`

### `eventsFilterState`／搜尋關鍵字獨立於 `state` 物件之外（v32）
類型／IP／縣市篩選狀態、搜尋關鍵字都刻意不掛在 `events.js` 主要的 `state` 物件上，而是各自獨立宣告：`filter-widget.js` 的 `clearFilterKey()` 清除時是把整個 `state[key]` 重新指派一個新陣列（`state[key] = []`），不是原地 splice——如果掛在 `state.xxx` 上，清除後 `state` 裡的參照會跟 widget 內部用的物件對不上，「清除」按鈕會變成沒有實際效果，獨立成物件、渲染時直接讀這個，就不會有兩份參照要對齊的問題。選取語意跟首頁一致：未選＝顯示全部，選了才篩成只顯示那幾種，跟首頁 `main.js` 的 `applyFilters()` 是同一個判斷方式；city 的比對依據是每個地點自己的 `city` 欄位，同一檔活動只要有任一地點落在篩選縣市裡就會顯示。

### 月曆橫幅列排版與 hover 外框（v32）
月曆改成「橫幅事件條」樣式：每週一列，上面 7 天日期數字，下面接一整排橫幅（每個活動一條，寬度依它在這一週實際涵蓋的天數橫向延伸，只算月曆內顯示出來的天，不延伸到留白格），同一週日期重疊的活動分到不同 row 疊放，沒重疊的共用同一 row；超過 `MAX_VISIBLE_ROWS` 條時預設只顯示前幾條，底下出現「全部顯示」/「部分顯示」可展開/收合，每一週各自獨立記住展開狀態（`state.expandedWeeks`）。

滑鼠移到有活動的日期格子時，這一天的整欄（從日期數字格一路往下到當週橫幅區底部）會浮現藍色外框，讓使用者一眼看出這天對應到下面哪些橫幅。外框不能單純用格子本身的 border/box-shadow 做，因為日期數字列（`.events-week-daynums`）跟橫幅列（`.events-week-bars`）是兩個獨立的 CSS Grid、欄寬算法不一樣（前者只有 1px gap 無 padding，後者有 12px padding + 12px gap），兩者的「欄」在像素上對不齊。改用一個獨立的絕對定位圖層（`.events-week-hover-col`，每週一個）蓋在整週容器上，寬度／位置套用跟背景直向格線（見月曆格線那段的 `calc((100% + 1px) / 7)` 推導）同一套算法，才能跟畫面上原本看得到的直向格線完全對齊。欄位 index 直接用「格子在 `.events-week-daynums` 裡的第幾個 child」算，不用額外資料屬性。外框只在滑鼠裝置開（觸控裝置沒有「移過去但不點」這個手勢）。

### 拼貼格狀排版：JS 輪流分欄取代 CSS multi-column（v32）
原本用純 CSS multi-column（`column-count`）排版，缺點是閱讀順序會變成「先填滿第一欄、再填第二欄」，不是使用者預期的「由左到右、由上到下」。改成 JS 依序把卡片「輪流」分配到各欄（卡片 0→欄0、1→欄1、2→欄2...、N→欄0...），欄位本身仍用 flex 直排、圖片原生比例決定卡片高度，維持無縫貼齊的瀑布流視覺；差別只在「哪張卡放進哪一欄」改成依序輪流，不是照欄位目前高度最短的去放，讀者由左到右掃過去看到的就是資料原本的排序（跟月曆一致：快結束的在前）。代價是同一「列」的卡片底部不會剛好切齊，但比讀取順序錯亂更能接受。欄數要跟 `events.css` 的 `.events-collage-grid` 對應斷點（1100px／720px／420px）保持一致，兩邊改動要一起改；螢幕寬度跨過欄數斷點時（resize debounce 150ms）欄數要重新分配並重繪。

### 拼貼排序（v32，v41 調整選項與方向邏輯）
拼貼排序沿用共用的 `sort-widget.js`。**⚠️ 本節標題原本記錄「只有三個選項，沒有距離：遠到近」，跟實際程式碼（`EVENTS_SORT_OPTIONS` 一直都有 `distance_desc`）不符**——回頭查不出這份文件跟程式碼是哪個時間點開始對不上，v41 這次順手校正成跟現況一致，之後如果又要調整距離排序方向數量，記得這裡也要同步改。

`EVENTS_SORT_OPTIONS`（v41 起）：`end_date_asc`（default）、`start_date_asc`、`distance_asc`、`distance_desc`，跟首頁 `js/sort.js` 的 `SORT_OPTIONS` 選項組合完全一致，但這是兩份獨立宣告、獨立維護的陣列（`events.js` 刻意不 import `js/sort.js`，理由見上方「為什麼是獨立頁面、獨立一批模組」），改一邊不會自動同步到另一邊。v41 比照首頁排序調整（見「排序系統」章節 v41 條目）拿掉 `end_date_desc`、新增 `start_date_asc`，理由跟規則兩邊相通，不重複寫一次。

排序結果不是直接決定畫面順序，是餵給總覽的「還沒結束」／「已結束」分組（`collageGroups()`，依 `group.end >= 今天` 分組）各自內部排序，分組本身固定不受排序影響——這個分組結構剛好跟首頁 v41 新增的「已過期排最後」概念殊途同歸，只是首頁是排序邏輯裡內建的規則，這裡是本來就存在、獨立於排序鍵之外的分組。`compareGroupsBySort(a, b, sortKey, userCoords, today)`：
- `distance_asc`/`distance_desc`：取每個 group 裡離使用者最近的地點算距離，沒有座標時 `groupDistanceKm()` 回傳 `Infinity`
- `end_date_asc`：組內用「離今天天數差絕對值」排序（`Math.abs(end - today)`）——`ongoing` 分組全部是未來/今天，效果等同「越快結束排越前面」；`ended` 分組全部是過去，效果等同「越接近今天結束的排越前面」，同一條算式通用兩種分組，跟首頁「結束日：近到遠」拆三組後組 1／組 3 共用同一條算式是同一個道理（這裡因為 ongoing/ended 分組本來就存在，不用再另外拆）
- `start_date_asc`（v41 新增）：已開始（`start <= 今天`）優先權高於尚未開始（`start > 今天`），已開始組內依開始日新到舊（離今天最近排最前），尚未開始組內依開始日由近到遠（越快開始排最前）；`ended` 分組裡的 group 必定已經開始過，天然全部落在「已開始」這一支，不會意外混進「尚未開始」
- `today` 由 `collageGroups()` 算好後傳入，`compareGroupsBySort()` 本身不重算，避免 ongoing/ended 分組跟排序方向各自用一份「今天」在極端情況（例如跨過午夜）算出不一致的結果

### 篩選 ⇄ 排序面板互相關閉：同檔案內用 closure 處理宣告順序（v32）
`events.js` 建立 filterWidget 時就要參照稍後才宣告的 sortWidget（互相關閉 hook），靠的是箭頭函式的 closure（等到真的被呼叫時 sortWidget 早就指派好了）——跟 CLAUDE.md「跨檔案依賴要注意」提過的「函式宣告會在模組載入時先掛好」是同一種順序不敏感的寫法，只是這次是同一個檔案內的 const closure，不是跨檔案 import。

### 總覽切到月曆時，當日活動 drawer 要跟著收起（v32）
`setView()` 切到「總覽」時，如果當日活動 drawer（`#dayEventsOverlay`）還開著要跟著收起——它是 non-modal 的，使用者切視圖不會先關掉它，drawer 內容又是特定某一天的活動，留著蓋在總覽上面沒有意義；只在真的開著時才呼叫收起，避免每次切換視圖都多送一次 `events_day_more_close` GA 事件。

### 「當日活動」清單（drawer）：non-modal 設計（v32）
桌機是「往左推」的 non-modal drawer——月曆本身仍可互動、不鎖背景捲動（鎖了使用者就翻不了月/點不了其他天，跟 non-modal 的初衷矛盾），overlay 用 `pointer-events: none`；手機才是貼底 modal sheet，鎖 body 捲動。點清單卡片開詳情 Modal 後 drawer **不會**自動關閉（同一天常有多場活動，看完一場很可能想接著看下一場，逼使用者關 Modal 再重新點日期太麻煩），改成手動同步卡片的 `.selected` class，不整份重繪、不重新綁 listener。詳情 Modal 的 z-index（9999）本來就蓋過 drawer（2250），不需要處理疊層。`closeDayEventsPanel()` 的 `method` 參數用 `methodOverride` 區分「使用者關閉」跟「`setView()` 切到總覽時程式自動收起」（v32），避免污染 GA。

**關閉活動詳情 Modal 時不能無條件清空 body 捲動鎖定**：手機版 drawer 開著時本來就鎖了 `body` 捲動（`.day-events-open` class + inline `overflow:hidden`），點卡片開詳情不會自動收合 drawer，所以關閉詳情 Modal 時如果直接清空鎖定，會變成「drawer 還開著、背景卻能捲動」；`closeEventDetailModal()` 只在 drawer 沒開（或桌機版本來就沒鎖）時才清空鎖定。

Drawer 頂部要跟月曆頂部切齊，量的是 `.events-page-body` 的 `getBoundingClientRect().top`（頁面本身不整頁捲動，這個 top 值等於 header + 訪客 banner 目前實際佔用的高度），寫進 CSS variable `--events-header-h`；訪客 banner 非同步出現，用 `ResizeObserver` 盯 header/banner 本身尺寸變化，不用為每個成因各自補監聽（跟首頁 `--top-bar-height` 是同一個坑、同一種修法）。

### 活動詳情 Modal
視覺沿用機台詳情彈窗（`.grid-modal-overlay`／`.grid-modal-box`／`.popup-*`），id 換一組（`#eventDetailOverlay`/`#eventDetailContent`）避免撞名，這裡沒有 import `main.js`，是獨立一份。已結束的活動顯示「已結束」badge（沿用倒數 badge 外形只換顏色）優先於倒數 badge。同一組涵蓋不只一個地點時顯示城市頁籤（`cityTabsHtml`），切頁籤只換 `#eventDetailLocationSlot` 內容，不整份重繪。「更多資訊」對應表單 L 欄（原欄位名叫「備註」，內容已改成連結），固定顯示「查看 →」文字。K 欄圖片可逗號分隔多張，統一轉陣列（`eventImages()`）供縮圖（`eventThumbUrl()`，只取第一張）與詳情輪播共用。圖片外層包一層 `.popup-img-wrap`（灰底、12px padding、圓角），跟機台 modal 同外觀，不讓圖片直接鋪滿寬度貼齊 modal 邊緣。多圖輪播沿用跟機台 modal 同一套 `.carousel` 元件與事件委派模式（掛在 `document`，因為 modal 內容是動態塞進去的 `innerHTML`）。**v33.1 新增**：`locationSectionHtml()` 的地點資訊區塊補上「作品：${loc.character}」這一行，跟其他欄位（場地／地址／營業時間）同一套「有值才渲染」寫法，放在場地之前；欄位本身是既有的 `character`（J 欄，events-data.js 的 `COL.character`），先前只用在拼貼卡片/篩選/搜尋，詳情 Modal 一直沒有顯示，這次補上。**v34 新增**：J 欄改支援同一活動填多個作品／IP（頓號「、」分隔），這裡的顯示也從單一 `character` 改成完整的 `characters` 陣列清單，見下方「活動多作品／IP 支援（v34 新增）」。

**v33.1 新增：圖片放大 Lightbox**——單張圖／輪播圖的 `<img>`（`eventDetailImageHtml()`）都補上 `data-lightbox` 屬性（輪播切換圖片的 `data-carousel-action` 監聽器裡同步更新這個屬性，不然放大出來的還是第一張），點擊開啟共用的 `.lightbox`（`events.html` 新增 `#eventLightbox`/`#eventLightboxImg`，跟機台版 `#lightbox`/`#lightboxImg` 換一組 id 避免撞名；`.lightbox` 樣式沿用 `style.css` 共用的那份，z-index 99999 蓋過詳情 Modal 的 9999，不用額外調整）。**跟機台版的綁定方式刻意不同**：機台的 `openLightbox`/`closeLightbox` 宣告在 `main.js` 裡，靠 `app.html` 寫死的 `onclick="closeLightbox()"` 呼叫，所以 `main.js` 特地把它們掛到 `window`（見「🌐 掛到 window」那段）；`events.js` 從頭到尾沒有這套 window 掛載慣例（所有 overlay 的開關都是 JS `addEventListener` 綁的，例如 `#eventDetailOverlay`/`#dayEventsOverlay`），這裡延續同樣的寫法，用 `document.getElementById('eventLightbox').addEventListener('click', closeEventLightbox)` 跟一個 `[data-lightbox]` 的 `document` 委派點擊監聽器，不新增任何 `window.X = X` 綁定，行為結果跟機台版一致。新增 `events_lightbox_open` GA 事件（`event_id` 取 `state.selectedGroupKey` 對應的 group、`device`），對應機台版的 `lightbox_open`。

### 活動詳情 Modal 作品標籤點擊快速篩選（v33.4 追加）
比照機台版（見上方「作品標籤點擊快速篩選」），`locationSectionHtml()` 的「作品：${loc.character}」行改成 `<button id="eventDetailCharacterLink" class="popup-character-link">`（沿用同一顆 CSS class，`style.css` 兩頁共用樣式，不用另外定義）。

**跟機台版的綁定方式刻意不同**：`events.js` 從頭到尾沒有 `window.X = X` 這套掛載慣例（見上方「圖片放大 Lightbox」段落的說明），這裡延續同樣寫法——`bindLocationSectionEvents()`（每次開 Modal／切城市 tab 都會重新綁一次，跟 `eventDetailGmaps`／`eventDetailShare` 同一批）補上這顆按鈕的 `addEventListener('click', ...)`，不是 inline `onclick`。

**`filterEventsByCharacter(character, eventId, source)`（`events.js`）**：
- 關掉活動詳情 Modal（`closeEventDetailModal()`），呼叫既有的 `setEventsSearchKeyword(character)`（本來就會 `renderAll()` + `eventsSyncSearchUrl()`，不用重寫篩選邏輯）
- **刻意不強制切換月曆／總覽檢視**——點擊當下在月曆就留在月曆（篩選後月曆只剩符合的橫幅），在總覽就留在總覽，比照機台版地圖模式留在地圖的邏輯，不會把使用者推去另一個檢視。最初版本曾經無條件切去總覽（理由是月曆一次只看得到一個月、篩選結果可能分散在好幾個月份），後來依 Gill 指示改成不切換
- GA `character_tag_click`：沿用跟機台版同一個事件名稱（跟 `search_box_focus`／`search_clear` 這兩個事件在兩頁共用同名、只靠 `source` 分辨是同一個做法），參數改用 `event_id`（比照 `related_machine_click`／`related_machines_nav_click` 已經在用的欄位名，不是 `machine_id`）：`character`, `event_id`, `source`, `device`；全新事件，尚未在 GA4 後台「自訂定義」註冊，也還沒登記進「GA4 事件追蹤表」Notion 資料庫

### 分享連結永久ID機制（活動版，v33.2 新增）
比照機台「分享連結永久ID機制」（見上方機台章節），活動分頁新增 O 欄「永久ID」（`permId`），格式與產生方式相同——`permanent-id.gs` 的 `SHEET_CONFIGS` 陣列已擴充成同時支援兩個分頁各自的 `checkCol`/`permIdCol`/`headerRow` 設定：
```js
const SHEET_CONFIGS = [
  { name: '抽卡 / 相卡', checkCol: 3, permIdCol: 17, headerRow: 1 },
  { name: '活動',       checkCol: 3, permIdCol: 15, headerRow: 2 },
];
```
問題根源跟機台一致：`?event=` 原本直接帶地點 A 欄流水號，A 欄同時是管理者排序/整理用的欄位，活動下架被刪除、之後新增資料剛好填到同一個編號時，舊分享連結會沒有任何警告地顯示成另一個活動地點的內容——`js/events.js`／`api/event-share.js` 的比對邏輯本身沒有 bug，單純是 A 欄的值不保證跨時間穩定對應同一個地點。

**實作**：
- `js/events-data.js`：`COL` 對照新增 `permId: 14`（O 欄），`loadEvents()` 回傳物件補上 `permId: cols[COL.permId] || ''`
- `js/event-match.js`：`eventUrl(eventRow)` 從帶 `eventRow.id` 改成帶 `eventRow.permId`——機台詳情標題連到對應活動這條路徑（見下方「機台⇄活動自動比對」）也要用到穩定連結，不是只有 `shareEvent()` 按鈕
- `js/events.js`：`shareEvent()` 產生的網址帶 `primary.permId`（不是 `primary.id`）；`?event=` 解析改成**三段式判斷**（完全比照機台 `?id=` 的解析邏輯，見 `js/main.js`）：
  1. `permId` 精準比對成功 → 正常開啟對應活動詳情＋城市頁籤，送 `events_share_link_opened`
  2. 精準比對失敗、退回比對到 A 欄流水號有找到列（舊格式連結，機台可能還在但無法確認是不是原本那個地點）→ 刻意不開啟任何內容，安靜地正常顯示行事曆頁，送新事件 `events_share_link_legacy_fallback`
  3. 兩者都找不到 → 顯示「這個活動的資訊已經下架囉」toast，送 `events_share_link_target_missing`
- GA 的 `event_id` 參數維持使用 A 欄流水號（不是永久ID），跟其他 `events_*` 事件的 `event_id` 格式保持一致，方便在 GA4 後台串同一組活動的完整互動路徑，不因這次改動而切格式
- `api/event-share.js`：`getShareInfo(id)` 的比對邏輯從 `parsed.find(cols => cols[0] === id)`（A 欄）改成比對 `PERMANENT_ID_COL`（O 欄，index 14）；**跟機台 `api/share.js` 目前版本（v30.7 起）一致，不保留 A 欄 fallback**——比對不到永久ID就直接 fallback 回預設圖 `event-og.png`，不嘗試退回比對 A 欄
- 這個機制只保護修正上線後產生的新連結；上線前已經流出去的舊連結，靠 `events.js` 端的 A 欄 fallback 盡量還原（安靜不顯示，至少不會誤導成別的活動），`api/event-share.js` 端沒有對應 fallback（社群平台預覽縮圖比對不到就退回通用預設圖，代價比機台端小很多，見機台「分享連結永久ID機制」章節裡「不對稱設計」的說明，這裡沿用同樣的取捨）

### 分享（`shareEvent()`）
`?event=<地點永久ID>` 網址（**v33.2 起改用 O 欄永久ID，取代原本的 A 欄流水號**；多地點時固定帶第一個地點的 permId）本身在載入時讀取還原的邏輯見上方「分享連結永久ID機制（活動版）」的三段式判斷，這裡不重複說明。

**v33.1 新增：動態 OG 分享圖**——`shareEvent()` 產生的網址從原本直接指向 `events.html?event=xxx` 改成指向新的 `/api/event-share?id=xxx`（**v33.2 起 `id` 為地點永久ID**，v33.1 上線時暫用 A 欄流水號，這次補上永久ID機制後改過來）。`api/event-share.js` 是機台 `api/share.js` 的活動版對照組，同樣是給不執行 JS 的社群平台爬蟲讀 `og:image` 用，真人點擊會被 `location.replace()` 立刻導回 `events.html?event=xxx`：
- 圖片分兩種：活動分頁 **N 欄「分享圖」**（Cloudinary 網址，選填，v33.1 新增此欄），指定了就用；沒填、找不到對應 id、或抓表失敗，一律 fallback 回專案根目錄新增的活動專屬預設圖 `event-og.png`（2400×1260，OG 標籤仍宣告 1200×630，跟機台 `/og.png` 是同一套慣例：2x 圖檔、宣告 1x 尺寸）
- 標題／描述固定為行事曆頁專屬文案（不像圖片那樣依活動動態換），跟機台 `api/share.js` 的做法一致——不管分享哪個活動，卡片標題/描述都一樣，只有圖片會變
- **v33.2 起不保留 A 欄 fallback**（見上方「分享連結永久ID機制（活動版）」）：比對到永久ID（或抓表失敗、保守當作可能有效）就帶 `?event=` 導回活動頁；確定找不到、或根本沒帶 id，導回 `events.html` 首頁（不帶參數）

**v35 大改：N 欄從一張圖擴充成依「從哪裡點開分享」分四張圖，且新增 `api/events.js` 讓搜尋結果分享連結也有預覽圖**——起因是原本 `events.html` 是靜態檔案，`/events.html?q=...` 這種「搜尋結果」分享連結完全沒有走過 `api/event-share.js`，社群平台爬蟲抓到的一直是完全沒有 `og:image` 的空殼，跟機台端 v30.9 修過的問題是同一個根因（Vercel「同路徑靜態檔案優先於 rewrite」的路由規則）。

**修法完全比照機台 `app.html`／`api/index.js` 那一套**：
- SPA 殼層檔案改名成 `events-app.html`（原本的 `events.html` 刪掉，內容原封不動搬過去），讓 `/events.html` 不再對應任何實體檔案
- `vercel.json` 新增一條 rewrite：`{ "source": "/events.html", "destination": "/api/events" }`
- 新增 `api/events.js`：跟 `api/index.js` 是同一套做法的活動版對照組——不是導轉頁，回傳的就是真正的 `events-app.html` 內容本身，只是動態把 `og:title`/`og:image` 等標籤塞進 `<head>`，真人訪客看到的頁面內容跟 `js/events.js` 讀取 URL 參數的邏輯完全不受影響
- **沒有 `?event=`（一般訪客／搜尋結果／純切換版面）時，依目前是哪一種「純預設狀態」決定要用哪張預設圖**（`pickPageDefaultImage(query)`），優先權：`day`（day-events-panel）> `view=calendar`（月曆）> `layout=list`（總覽·列表）> 其餘情況（總覽·拼貼格，也是完全沒帶參數時的最終 fallback）。四張預設圖：總覽·拼貼格用既有的 `event-og.png`，另外新增 `events-list-og.png`（總覽·列表）／`events-calendar-og.png`（月曆）／`events-day-og.png`（day-events-panel），上線時三張暫時先放跟 `event-og.png` 相同的暫用檔案，之後有正式設計圖時直接覆蓋對應檔名即可，不用再動程式

**單一活動的分享圖（N 欄）也從一張擴充成依分享入口分四張**——`pickShareImage(raw, from)`：N 欄用「,」或「、」分四張圖，依 `shareEvent()` 是從哪裡點開分享的（見 `js/events.js` 的 `FROM_BY_SOURCE` 對照表：`events_collage_grid`→`grid`、`events_collage_list`→`list`、`calendar_bar`→`bar`、`events_day_panel`→`card`）分別對應：
1. 第一張＝總覽·拼貼格卡片
2. 第二張＝總覽·列表卡片
3. 第三張＝月曆的 events-bar
4. 第四張＝月曆 day-events-panel 裡的 events-card

跟機台 P 欄同一個保守規則：一定要湊滿四張才會分別套用；沒湊滿四張（完全空白、或只填了一兩三張）都視為「這個情境沒有專屬圖」，直接退回對應情境的預設圖，不會誤把其中一張套到別的情境。`api/events.js`（直接落地）跟 `api/event-share.js`（分享按鈕導轉頁）各自獨立宣告同一套 `pickShareImage()`／`SHARE_IMAGE_FALLBACK_BY_FROM`／`SHARE_IMAGE_INDEX_BY_FROM`，環境不同無法互相 import。

**`shareEvent()` 新增 `from` 參數，分享連結額外帶上背景版面參數**：`shareEvent(group, source)` 依 `source` 透過 `FROM_BY_SOURCE` 算出 `from`，網址從 `/api/event-share?id=xxx` 改成 `/api/event-share?id=xxx&from=grid|list|bar|card`。`api/event-share.js` 用白名單只認這四個值（其餘一律當成 `grid`，不把任意 query 原封轉發），除了選圖之外，`backgroundParamsFor(from)` 也依 `from` 決定真人點進來後導去的背景版面要帶什麼參數：`grid` 不用額外參數（總覽·拼貼格本來就是預設值）、`list` 帶 `&layout=list`、`bar`／`card` 帶 `&view=calendar`——這兩個參數沿用上面「搜尋結果分享連結」v35 新增的網址同步機制，`events-app.html` 落地後 `initEventsPage()` 的還原邏輯會自動處理，不用再另外寫一套。

### FAB：首頁 ⇄ 行事曆頁互通（v32）
兩邊各自放一顆 `.events-link`（共用 `events.css` 的樣式），手機/桌機統一是畫面右下角常駐 FAB，桌機 hover 展開成膠囊顯示文字。

**⚠️ v32 修正的坑：`will-change: transform` 會替 `position: fixed` 子孫元素建立新的 containing block**
FAB 原本放在 `#topBar`／`#eventsTopBar`（滑動隱藏用的 wrapper）裡面。這個 wrapper 手機版的滑動隱藏動畫用 `will-change: transform`；瀏覽器對「有 `will-change: transform`」的元素跟「真的套用了 transform」一視同仁，都會替內部 `position: fixed` 的子孫元素建立新的 containing block——這代表 FAB 的 `fixed` 定位變成「相對這個祖先元素」而不是「相對視窗」，肉眼看到的症狀是 FAB 沒有貼在視窗右下角，而是貼在 `#topBar` 右下角，並隨 `#topBar` 的 `translateY` 隱藏/顯示動畫一起飄走。**修法**：把 FAB 移出 `#topBar`／`#eventsTopBar`，變成 `body` 的直接子元素，恢復單純的「相對視窗 `position: fixed`」。之後任何新增的 fixed 定位 UI，如果放在有 `will-change`/`transform` 的容器裡出現「明明是 fixed 卻沒有貼齊視窗」的怪現象，先往這個方向查。

### 手機版頂部工具列滑動隱藏（`events-scroll.js`，v32）
邏輯照抄 `scroll.js` 的 `#topBar` 版本（往下滑累積超過 `HIDE_THRESHOLD` 才隱藏、往上滑立刻顯示、`TOP_SAFE_ZONE` 內強制顯示）。差異：`events.html` 沒有「地圖/列表」兩種模式各自的捲動容器，而是「月曆／拼貼格狀／拼貼列表」三種子模式各自獨立的捲動容器（`#eventsDayGrid`／`#eventsCollageGrid`／`#eventsCollageListWrap`，同一時間只有一個可見、真的在捲動），所以同時掛在三個容器上，各自用 `Map` 追蹤自己的 `{ lastScrollTop, downAccum }`，不共用單一變數，避免切換子模式時把另一個容器殘留的捲動狀態誤判成一次大幅度滑動。`resetEventsTopBarScrollState()` 在 `setView()`／`setCollageLayout()` 切換任一子模式時都要呼叫，確保 bar 狀態乾淨。

**`#eventsTopBar` 的實際範圍與踩過的坑（v32）**：`#eventsTopBar` 包住訪客 banner／header／搜尋列／`.events-filter-row`（篩選 pill + 月曆導航/拼貼排列切換）／星期列，五者一起隨滑動隱藏/顯示；`.events-page-body` 底下真正捲動的是「月曆／拼貼格狀／拼貼列表」三種子模式各自的容器（`#eventsDayGrid`／`#eventsCollageGrid`／`.collage-list-wrap`），不是 `.events-page-body` 本身。星期列一開始沒有跟著搬進 `#eventsTopBar`，留在 `.events-page-body` 裡靠 `padding-top` 補償高度——結果 `.events-page-body` 不是真正的捲動容器，這段 `padding-top` 永遠不會消失，滑動隱藏 `#eventsTopBar` 後畫面頂端留下一塊固定不消失的空白色塊，修法是把星期列也搬進 `#eventsTopBar`、`padding-top` 補償改吃在三個真正會捲動的子容器上。

**⚠️ 這個 `padding-top` 補償規則第一次修正時沒生效的坑**：三個子容器各自散落著好幾條 `@media(max-width:720px)` 的 `padding-top` 舊規則，跟新規則的 selector specificity 完全一樣，CSS 只能靠「寫在檔案更後面」的規則覆蓋前面的——第一次補丁寫的位置比大部分舊規則早，`.events-collage-grid` 因此被舊規則蓋掉、完全沒生效，`.collage-list-wrap` 剛好沒有同名舊規則卡在後面所以矇對；後來確認要把新規則移到檔案最後面才真的對三個容器都生效。**之後在 `events.css` 加任何「本來就有同名舊規則、只是要覆寫」的規則，先確認新規則寫在檔案裡的位置夠後面，不要只看 selector 對不對就以為一定生效。**

### `.events-page-body` 殘留 padding-top 造成星期列與月曆格線間多 8px 空隙（v34 修正，本節依「7 月曆 events-page-body 間距」chat 重寫）
星期列搬進 `#eventsTopBar` 之後（見上一段），`.events-page-body` 理論上不該再需要自己的 `padding-top` 補償——月曆／拼貼格狀／拼貼列表三個真正的捲動子容器（`.events-day-grid`／`.events-collage-grid`／`.collage-list-wrap`）各自都已經帶了自己的 `padding-top: 8px`。但 `.events-page-body` 本身還留著一份同樣 8px 的 `padding-top`，是搬遷當時沒清乾淨的殘留，效果是月曆檢視下星期列跟日期格線之間多出一段看起來像 bug 的 8px 空隙（兩層 8px 疊加）。v34 修正：把 `.events-page-body` 的 `padding-top` 改成 0（保留左右 `padding: 0 20px`），並在該規則上方加註解說明 top padding 已經個別交給三個子容器自己負責，不該再放回 `.events-page-body` 這層。

### 月曆捲動重做：放棄「星期列 sticky + 整頁捲動」（v32）
舊版讓月曆整頁（`.events-page-body`）自己捲動、星期列用 `position: sticky` 貼在頂端；實測不管桌機還是手機，快速滑動時都會看到已經捲過去的日期列殘影疊到星期列上面。試過 `translateZ(0)` 強制合成圖層、`clip-path` 換掉 `overflow:hidden` 兩個方向都修不好，錄影確認問題出在 sticky 本身跟整頁捲動的節奏對不齊，不是圓角或圖層的問題。改成月曆本身是固定高度的元件：`.events-layout`／`.events-calendar-col` 都是 `flex: 1; min-height: 0` 一路把剩餘高度往下傳，星期列跟工具列維持一般文件流的自然高度（`flex-shrink: 0`，本來就不會被捲動經過，完全不需要 sticky），真正捲動的只有月曆格線本身（`.events-day-grid`，自己 `overflow-y: auto`），滑動完全不會碰到 sticky 機制，殘影問題不會再出現。`.events-page-body` 自己保留的 `overflow-y: auto` 只是保險（理論上不會觸發），不是主要捲動來源。

### 月曆卡片高度：flex:1 → flex:0 1 auto（v32.1 修正）
**問題**：Gill 回報「月曆沒有活動時，最底部那一 row 應該顯示預設的高度（和其他 row 一樣），而不是無限延伸到底部」——實測在篩選出 0 筆活動的月份最明顯（例如篩到一個完全沒有活動的縣市），月曆最後一週會被拉出一大段跟其他週高度完全不成比例的空白，看起來像 bug。

**根因**：`.events-day-grid`（月曆真正的捲動容器）原本是 `flex: 1`，等同 `flex: 1 1 0%`——關鍵在 `flex-basis: 0%`：瀏覽器分配高度時完全不看內容實際多高，一律從 0 開始撐滿 `.events-calendar-col` 剩下的所有可視高度。內容（週列）不夠多時，這個框依然會被撐到跟版面剩餘空間一樣高，多出來的空白留在框「裡面」；疊加上直向格線背景畫在整個 `.events-day-grid` 上、`.events-week-row:last-child` 又刻意拿掉了下框線，空白區跟最後一週之間沒有任何視覺分界，看起來就像最後一週本身無限延伸到卡片底部。

**修法**（`events.css` + `js/events.js`）：
- `js/events.js` 的 `renderEventsCalendar()`：渲染出來的週列不再直接塞進 `#eventsDayGrid`，改包一層 `<div class="events-weeks">`，`.events-weeks` 才是真正裝週列內容的容器
- `events.css` 新增 `.events-weeks { flex-shrink: 0; padding-bottom: 20px; background-image: repeating-linear-gradient(...); }`：把直向格線背景跟原本「捲到底留 20px」的 `padding-bottom` 都搬到這一層——`flex-shrink: 0` 讓這層永遠維持自然內容高度，格線只會畫到實際週列的高度為止，不會延伸到卡片以外
- `.events-day-grid` 的 `flex: 1` 改成 `flex: 0 1 auto`（grow:0／shrink:1／basis:auto）：`basis:auto` 讓框的「預設大小」直接等於 `.events-weeks` 的實際內容高度，`grow:0` 代表內容不夠高時不會被硬撐大，卡片自然收到跟內容一樣高，多出來的空間變成 `.events-calendar-col` 的留白（在白色卡片邊框「外面」，不是卡片內部的空白）；保留 `flex-shrink:1` + 既有的 `min-height:0`，內容真的超過可視高度時（月份週數多、展開全部橫幅…），這個框還是會被壓縮到剩餘可視空間、靠 `overflow-y:auto` 內部捲動，不影響「`.events-day-grid` 是唯一真正捲動來源」的設計（見上方「月曆捲動重做」）
- 順手拿掉 `.events-week-row:last-child { border-bottom: none; }`，讓最後一週跟其他週一樣保留下框線——即使極端情況下卡片底部仍留一點空白（例如 flex-shrink 壓縮到剩餘空間但還沒完全貼齊），也有清楚的框線跟內容分界，不會再誤判成「這一列」的一部分

**驗證方式**：`flex: 1`（`flex-basis: 0%`）vs `flex: 0 1 auto`（`flex-basis: auto`）是純粹的 CSS flexbox 基礎行為差異，不依賴資料狀態；本機起 dev server 開 `events.html`，月曆篩到 0 筆活動的縣市/月份，量測 `.events-day-grid` 高度應該緊貼 `.events-weeks` 的實際內容高度（週列高度總和 + 20px padding-bottom，手機版還要再加 `--events-top-bar-height` 這份合法的頂部留白），跟卡片可視高度只會差 1px 內的邊框誤差。

### `.events-filter-row`：篩選列 ⇄ 月曆導航 ⇄ 拼貼排列切換共用同一列（v32）
`.filter-bar`（篩選 pill）、`.events-toolbar`（月曆上/下個月導航）、`.events-collage-toolbar`（拼貼排列切換）合併成同一列 `.events-filter-row`，彼此垂直置中；`.events-toolbar`／`.events-collage-toolbar` 互斥顯示（依 `state.view` 用 `[hidden]` 切換），視覺上是同一個「靠右」的位置，同一時間只會出現其中一個。`.events-toolbar`／`.events-collage-toolbar` 都用 `flex-shrink: 0`（不能設 `flex:1`/stretch，不然會把對方的位置搶走或把整列擠爆），靠 `.filter-bar` 的 `flex:1` 把它們推到最右邊。

手機（月曆模式下，桌機那種「跟 filter-bar 同一列、靠右」在窄螢幕會被 pill 群組的橫向捲動擠到看不見，改成讓 `.events-filter-row` 在 ≤900px（v33.4 前為 768px）允許換行（`flex-wrap: wrap`）。`.events-toolbar` 真正被迫吃滿 `width: 100%`（強制換到下一行）的斷點是 ≤959px——單一行放不下一個佔滿整列寬度的 item，會自動被擠到下一行，效果等同「另起一行」但不用真的搬動 DOM；900～959px 這段區間 `.events-toolbar` 仍維持跟 `.filter-bar` 同一行（`.filter-bar` 的 `flex:1` 會先收縮讓出空間），只有窄到 959px 以下才真的換行，比原本統一用 900px 的版本多留了一點「同一行」的空間（**v34 追加調整**：原本 900px 就會強制換行，這次拆成兩個斷點）。換行後用 `:has()` 偵測（`.events-filter-row:has(> .events-toolbar:not([hidden]))`）把 `.events-filter-row` 原本給 pill 列準備的 `margin-bottom: 20px` 縮成 `12px`，避免換行後工具列跟月曆之間顯得太鬆；`:not([hidden])` 是為了排除拼貼模式（`.events-toolbar` 被隱藏、`.events-collage-toolbar` 顯示）不受這次調整影響，維持原本 20px。**v34 追加**：≤900px 且月曆檢視（同樣用 `.events-filter-row:has(> .events-toolbar:not([hidden]))` 判斷）時，`.filter-scroll`（類型／作品／縣市 pill 的捲動容器）上方多留 `margin-top: 4px`，讓換行後的第二行跟第一行的 pill 列不要貼太緊。

### 拼貼列表獨立包一層 `.collage-list-wrap`，避免被重繪洗掉（v32）
手機列表排列模式專用的「最後更新｜回報表單｜更新日誌」列，要跟卡片一起被捲走（不是固定在頂部），不能直接塞進 `#eventsCollageList` 裡面——那個容器的 `innerHTML` 每次篩選/排序/資料重新載入都被 `renderCollageList()` 整段覆寫，塞在裡面會被洗掉。改成外面包一層 `.collage-list-wrap`（真正的捲動容器，`overflow-y: auto` 搬到這裡），這一排固定當第一個 child、`#eventsCollageList`（純卡片格線）當第二個 child，兩者一起被 wrap 捲動，grid 重新渲染不會動到這排；`hidden` 屬性也是切在 `.collage-list-wrap` 這一層（`applyCollageContainers()`），不是切在內層的 `#eventsCollageList`。

### 拼貼「當日活動」drawer 開合動畫對齊（v32）
`.events-page-body` 的 `margin-right`（drawer 開啟時把月曆「往左推」）補上 `transition`，時間曲線刻意跟 `.day-events-panel` 本身的滑入 transition 對齊，兩邊視覺上像同一塊東西在移動，不是各自獨立的兩個動畫。

### Day events panel／月曆導航／events-card 視覺細修（v34）
一批針對月曆導航跟「當日活動」drawer 的小型視覺調整，跟功能邏輯無關：

- **`.events-nav-group`（月曆上/下個月按鈕）補上 hover 效果**：原本沒有任何 hover 狀態，新增 `border-radius: 50%` + hover 時 `background: var(--fill-gray6); color: var(--fill-blue)`，比照 `.day-events-close`/`.grid-modal-close` 等既有 icon button 的 hover 語言
- **`events-month-label` 顯示格式改為 yyyy/mm**：從「2026年9月」改成補零的「yyyy/mm」（例：`2026/09`），`renderEventsCalendar()` 用 `String(state.month.getMonth() + 1).padStart(2, '0')` 補零
- **`.events-card`（當日活動 drawer 卡片列表）補齊 hover 效果**：原本只設了 `.events-card:hover { border-color: var(--fill-blue); }`，但沒設 `border-style`/`border-width`，實際上沒有任何視覺變化；補上 `border: 1px solid transparent` + `transform: translateY(-2px)` + `box-shadow: inset 0 0 0 0.5px var(--fill-blue), 0 8px 24px rgba(0,102,255,0.16)`，比照 `.loc-card-grid:hover`
- **`.day-events-body` padding 調整**：左右 padding 從 16px 改成 20px；手機版（≤720px）額外把上方 padding 改成 8px（桌機維持原本的 4px）
- **`.day-events-panel` 手機版（≤720px）header 改比照 `.filter-sheet-header`**：標題從靠左置中改置中對齊、字重從 700 降到 500、關閉鈕從跟標題同排改成絕對定位在右側垂直置中（`position:absolute; right:20px; top:50%; transform:translateY(-50%)`），跟篩選/排序的手機 bottom sheet 用同一套 header 語言；同時拿掉原本 header 頂部的 `border-top: 1px solid var(--fill-blue)`（原本用來區隔 sheet 跟上方遮罩，改用置中標題的樣式後這條線顯得多餘）
- `.events-toolbar` 換行斷點（900px → 959px）跟 `.filter-scroll` 月曆模式間距（+4px）見上方「`.events-filter-row`」章節

### GA4 事件（活動行事曆專屬，追加於上方主表之後）
| 事件名稱 | 觸發時機 | 參數 |
|---|---|---|
| `events_page_view` | 頁面載入完成 | `device` |
| `events_view_switch` | 切換「總覽／月曆」 | `view`, `device` |
| `events_collage_layout_switch` | 總覽內切換「格狀／列表」 | `layout`, `device` |
| `events_month_nav`（新增） | 點月曆「上一月／下一月」導航按鈕 | `direction`(prev/next), `device` |
| `events_week_expand`（新增） | 點某週橫幅清單的「全部顯示／部分顯示」切換按鈕 | `week_key`, `action`(expand/collapse), `device` |
| `events_day_more_open` | 打開「當日活動」清單 drawer | `date_key`, `count`, `device` |
| `events_day_more_close` | 關閉 drawer | `method`(x_button/backdrop_click/other/view_switch), `device` |
| `events_detail_open` | 打開活動詳情 Modal | `event_id`(該組所有地點 id 用 `+` join), `location_count`, `source`, `device` |
| `events_detail_close` | 關閉活動詳情 Modal | `method`(backdrop_click/x_button), `device` |
| `events_city_tab_switch` | 詳情 Modal 內切換城市頁籤 | `machine_id`, `source`, `device` |
| `events_carousel_nav` | 詳情 Modal 輪播圖切換 | `direction`, `device` |
| `events_lightbox_open`（v33.1 新增） | 詳情 Modal 內點圖放大（`data-lightbox`） | `event_id`, `device` |
| `related_machines_nav_click`（v33.3 新增） | 詳情 Modal「相關機台」卡片列左右箭頭按鈕，捲動卡片列 | `direction`(prev/next), `event_id`, `source`, `device` |
| `character_tag_click`（v33.4 新增，沿用跟機台版同一事件名稱） | 活動詳情 Modal 內點「作品」標籤，篩出同作品所有活動 | `character`, `event_id`, `source`, `device` |
| `character_chips_toggle`（v34 新增） | 活動詳情 Modal 內「+N 個作品」展開／收合按鈕（跟點作品名稱本身的 `character_tag_click` 是不同事件） | `expanded`(true/false), `event_id`, `source`, `device` |
| `events_quick_filter_toggle`（v34 新增） | 「今日活動」／「有抽卡 / 相卡機」快速篩選 pill 點擊 toggle | `filter_type`(ongoing_only/has_related_machine), `filter_state`(on/off), `device` |
| `events_share_click` | 點擊分享按鈕 | `event_id`, `source`, `device` |
| `events_share_link_opened` | `?event=` 永久ID精準比對成功，自動開啟對應活動詳情（v33 上線，v33.2 改用永久ID） | `event_id`（A 欄流水號）, `device` |
| `events_share_link_legacy_fallback`（v33.2 新增） | 永久ID比對失敗，退回比對到 A 欄流水號有找到列（舊格式連結）；此時刻意不開啟任何內容 | `event_id`（連結裡的 A 欄值）, `device` |
| `events_share_link_target_missing` | 永久ID、A 欄流水號都找不到對應地點，顯示「已下架」toast（v33 上線） | `event_id`, `device` |
| `events_search` | 搜尋框輸入（debounce 800ms，關鍵字長度 ≥2 才記） | `search_term`, `device` |
| `events_search_url_restored`（v33.4 新增） | 讀到 `?q=`／篩選參數／`view=calendar` 任一參數並還原成搜尋/篩選狀態的那一刻（帶搜尋條件的網址被打開，`?event=` 分享連結的 else 分支） | `has_keyword`, `has_filter`, `view`(calendar/collage), `device` |
| `gmaps_click` | 詳情 Modal 內點「在 Google Maps 查看」 | `machine_id`, `source`, `device` |
| `search_box_focus` / `search_clear` | 搜尋框聚焦/清除（沿用首頁事件名稱） | `source`(events_desktop_toolbar/events_mobile_toolbar), `device` |
| `filter_click`／`filter_clear`／`filter_panel_open`／`filter_panel_close`（`gaPrefix: 'events_filter'`） | 篩選 pill/面板互動（`filter-widget.js` 內部送出，事件名稱前綴由呼叫方決定，這裡實際送出的名稱是 `events_filter_click` 等） | 同首頁對應事件 |
| `sort_panel_open`／`sort_panel_close`／`sort_change`／`geo_permission_result`（`gaPrefix: 'events_sort'`） | 排序面板互動（`sort-widget.js` 內部送出，實際事件名稱是 `events_sort_panel_open` 等） | 同首頁對應事件 |

**待辦**：`events_search_url_restored`（v33.4 新增）尚未到 GA4 後台「自訂定義」註冊 `has_keyword`／`has_filter`（`view`/`device` 都是既有維度），也還沒登記進「GA4 事件追蹤表」Notion 資料庫。 `character_tag_click`（v33.4 追加）也尚未到 GA4 後台「自訂定義」註冊，也還沒登記進「GA4 事件追蹤表」Notion 資料庫；`character`／`event_id`／`source`／`device` 四個參數裡只有 `character` 是全新參數，其餘三個都是既有維度（`event_id`／`source`／`device` 前面各事件已經在用），理論上只差把事件名稱本身跟 `character` 這個新參數登記進去。以上其餘全新事件（含 `events_month_nav`／`events_week_expand`／v33.1 新增的 `events_lightbox_open`）尚未到 GA4 後台「自訂定義」註冊自訂維度／參數說明文字；`events_lightbox_open` 沿用既有的 `event_id`／`device` 維度，不用額外註冊新參數。v33.3 新增的 `related_machines_nav_click` 同理：`direction`／`event_id`／`source`／`device` 四個參數都是既有維度（`direction` 已因 `events_carousel_nav`／`events_month_nav`／`carousel_nav` 等事件註冊過），理論上不用額外註冊新維度，但事件本身（`related_machines_nav_click` 這個事件名稱）還是要在 GA4 後台跟「GA4 事件追蹤表」Notion 資料庫各登記一次；另外**`event_title_click`／`related_machine_click`（v33 上線）這兩個事件本身也尚未登記進 Notion 資料庫**，是既有缺口不是這次新增的，一併提醒。`events_share_link_opened`／`events_share_link_legacy_fallback`／`events_share_link_target_missing` 三個事件已於 v33.2 補登記進「GA4 事件追蹤表」Notion 資料庫（`events_share_link_legacy_fallback` 是這次新增的事件，另兩個是 v33 就已上線但先前漏登記的既有事件，這次一併補登記並把內容更新成三段式判斷的最新行為；`page_id`／流程見下方「外部工具筆記」）；資料庫「新增版本」欄位 schema 選項已補上 v33／v33.2，三筆記錄的版本欄位也都設定完成（`events_share_link_opened`／`events_share_link_target_missing` 標 v33，`events_share_link_legacy_fallback` 標 v33.2）。 `character_chips_toggle`（v34 新增）尚未到 GA4 後台「自訂定義」註冊全新參數 `expanded`，也還沒登記進「GA4 事件追蹤表」Notion 資料庫；`event_id`／`source`／`device` 都是既有維度不用重新註冊。 `events_quick_filter_toggle`（v34 新增）同理尚未到 GA4 後台「自訂定義」註冊 `filter_type`／`filter_state` 這兩個全新參數，也還沒登記進「GA4 事件追蹤表」Notion 資料庫；`device` 是既有維度不用重新註冊。

### 活動分類色碼（EVENT_CATEGORIES，events.css）
`events-data.js` 的 `EVENT_CATEGORIES` 直接在程式碼裡寫死 hex 值，對應 Google Sheet 活動分頁 B 欄（類型）的字串值必須完全一致：POP-UP `#2BADB9`、展覽 `#0066FF`、其他 `#1B813D`、CAFÉ／餐廳 `#BE185D`、特典 `#7C3AED`。這組色碼同時被月曆橫幅左側色條（`.events-bar::before`）、分類 badge（`.events-bar-cat`／`.events-detail-type-badge`，靠 `--bar-color` 這個 CSS 變數帶進來）、拼貼卡片跟詳情 Modal 共用，改色只要動 `events-data.js` 一處。**v33.2 修正**：本節先前記錄的色碼（POP-UP `#EA580C`、其他 `#FFCF48`、CAFÉ／餐廳 `#16A34A`）跟實際程式碼對不上，這次核對 `js/events-data.js` 後更正為實際值（`spec.md` 同步修正）。

### FAB（`.events-link`）幾個容易忽略的 CSS 細節
- **`gap: 0` 不是 `6px`**：收合狀態下 `.events-label` 雖然靠 `max-width:0` 視覺上沒有寬度，但 flex `gap` 是「item 之間」的間距，不看 item 本身是不是 0 寬——圓形按鈕裡只要還有兩個 flex item（icon + label），就會多插入一段看不見的間距，`justify-content:center` 會把「icon + 這段空隙」一起置中，icon 本身被往左推大約半個 gap，肉眼看起來偏心。改成收合時 `gap:0`，只在 hover 展開成膠囊時才透過 `@media (hover:hover) and (min-width:901px)`（v33.4 前為 `min-width:769px`）的規則加回 `gap:6px`（多加這個 `min-width` 是為了避免觸控筆電這類 `hover:hover` 為真但螢幕窄的裝置，在手機排版下誤展開成長條膠囊）。
- **`body.map-view .events-link` 的顯示規則（v33.2 改成依斷點區分，原本是不分裝置一律 `display:none`）**：
  ```css
  @media (max-width: 900px) {
    body.map-view .events-link { display: none; }
  }
  @media (min-width: 901px) {
    body.map-view .events-link { z-index: 1100; }
  }
  ```
  ≤900px（手機／平板，跟全站篩選/地圖版面同一個斷點；v33.4 前為 768px）：地圖模式隱藏 FAB——這個斷點下桌機側邊欄變成貼底 fixed 全寬 bottom sheet，FAB 固定右下角常跟 Leaflet 內建控制項或展開的 bottom sheet 內容卡在一起；地圖模式本身也已經有明確的返回列表視圖入口（view-toggle），不缺這顆固定入口。≥901px（桌機；v33.4 前為 769px）：**v33.2 起改回保留顯示**——桌機側邊欄是常駐在畫面左側的 400px 面板，不會跟右下角的 FAB 互相遮擋；額外把 `z-index` 從平常的 500 拉高到 `1100`，蓋過同樣疊在右下角、Leaflet 預設 `z-index: 1000` 的 attribution 控制項（見上方「地圖 Marker 設計」章節提過的 Leaflet 預設 z-index）。`events.html` 沒有地圖／列表模式的差異，這條規則對它不生效。

### `.filter-bar` 選擇器範圍修正（events.css，v40 重構遺留的死規則）
`.events-filter-row .filter-bar { background:none; padding:0; }` 這條規則原本寫的是 `.events-calendar-col .filter-bar`，是 v40 重構（搜尋列／filter-row／星期列從 `.events-calendar-col` 搬進 `#eventsTopBar`／`.events-topbar-controls`）之前的舊選擇器。重構後 `#eventsFilterBar` 已經不在 `.events-calendar-col` 底下了，這條規則變成完全比對不到任何東西的死規則——安靜地失效、不報錯、肉眼也看不出差異，直到實測才發現：`filter-bar` 自己的左右 20px padding 疊加在外層 `.events-topbar-controls` 的 20px padding 上面，手機版第一個 pill 距離視窗左緣變成 40px（20+20），不是預期的 20px。改成 `.events-filter-row .filter-bar`，比對到現在實際包著 `#eventsFilterBar` 的容器，覆寫才真的生效。**教訓**：DOM 結構搬遷（v40 這類把區塊移進新 wrapper 的重構）之後，記得檢查原本綁在舊祖先選擇器上的規則有沒有變成死規則——CSS 對比對不到的選擇器不會有任何警告。

### 月曆直向格線的數學推導（events.css，v32／v38.3 修正）
月曆整個容器（`.events-day-grid`）背景用 `repeating-linear-gradient` 畫 7 等分直線，取代只在某一週或某個區塊補格線的做法——用 `background-image`（不是疊一層 element）的好處是繪製順序在子元素內容之下，日期格子、活動橫幅的底色會蓋住線，只有真正空白的地方才透出來，不會有「一條線硬生生切過一個橫跨多天的活動橫幅」的畫面。

**v38.3 修正週期算法**：原本週期直接用 `calc(100% / 7)`，沒扣掉 `.events-week-daynums` 那個真實 grid 用掉的 6 條 1px gap，算出來的週期比真正的「一欄 + 一條縫」寬了大約 5px，且越右邊的線累積誤差越多。月曆全版寬（~960px+）時 5px 幾乎看不出來，但「當日活動」drawer 往左推、月曆欄位變窄之後，同樣 5px 的絕對誤差佔每一欄的比例變大很多，才會看起來「格線歪掉、往左偏移」——不是推版面本身的 bug，是這條背景假格線本來就跟真實 grid 欄寬對不齊，只是變窄後才被看見。推導：真實欄寬 `c = (100% - 6px) / 7`（7 欄 6 條 1px gap），一欄+一條縫的週期 `P = c + 1px = (100% + 1px) / 7`，改成 `repeating-linear-gradient` 的 4 個 `calc()` 分子要一起改，不能只改其中一個。滑鼠 hover 整欄外框（`.events-week-hover-col`，見「月曆橫幅列排版與 hover 外框」段落）的 `left`／`width` 是 JS 用同一套算法算的 inline style，跟這裡的背景格線共用同一個推導，兩邊要一起改。

### 橫幅色條與分類 badge 的 CSS 技巧
- **`.events-bar::before` 用偽元素畫左側色條，不用 `border-left`**：原本用 `border-left: 4px solid` 畫色條，圓角會完全跟著 `.events-bar` 本身的 `border-radius` 走——CSS Backgrounds §5.5 規定同一邊兩個角半徑加總超過該邊長度時瀏覽器會等比縮小，色條只有 4px 寬，算出來的圓角被壓得極小、幾乎看不出來，跟淡色底框的圓角視覺上不像同一組設計。改成獨立偽元素後，色條自己的 `border-radius`（8px，跟外層 bar 同一個數字）不受外層 box 尺寸牽連，兩端會是完整看得出來的圓角。
- **`--bar-color` 沒餵到會整條宣告失效，不是掉回預設色**：`.events-bar-cat`／`.events-detail-type-badge` 的 `border`／`color` 都吃 `var(--bar-color)`，這個變數必須設在該元素自己身上或繼承自外層祖先——沒有這個變數，`var()` 解析直接失敗，整條宣告作廢，不是掉回某個預設色，視覺上會變成沒有框線、文字退回瀏覽器預設黑色。月曆橫幅（`barHtml()`）是設在外層 `.events-bar` 上讓子元素繼承；當日活動 drawer 卡片（`eventGroupCardHtml()`）沒有這層外層元素，直接設在 `.events-bar-cat` 自己身上（`style="--bar-color:${color}"`）。之後新增用到 `.events-bar-cat`／`.events-detail-type-badge` 的地方，一定要記得餵這個變數。

### 拼貼列表 grid 列高崩塌 bug（events.css，v34.1）
`.collage-list-grid` 資料筆數一多（events 目前實測 200+ 筆），`grid-auto-rows: auto` 算出來的列高會被壓成幾乎 0px，卡片整張被 `.loc-card-grid` 的 `overflow:hidden` 裁成一條細線。根因是這個容器過去自己是 `flex:1; min-height:0` 的 flex item，本身高度被撐成「容器剩餘空間」這種明確值（不是自然高度），列數又遠超過這個高度；瀏覽器算 `auto` 列高退回去看每個格子項目的「自動最小尺寸」，而 `.loc-card-grid` 剛好設了 `overflow:hidden`（給 16px 圓角用）——CSS 規格規定 `overflow` 非 `visible` 的元素這個自動最小尺寸算 0，三個條件疊在一起，列高就被壓到接近 0。修法：把 `flex:1`／`min-height:0`／`overflow-y:auto` 搬到外層新增的 `.collage-list-wrap`，`.collage-list-grid` 自己變回自然高度（跟首頁 `.grid` 在 `#gridView` 裡的情況一致，本來就不會踩到這個問題），`grid-auto-rows: min-content` 留著當保險不拆掉。

### 拼貼「當日活動」drawer 往左推的實作機制（補充「拼貼「當日活動」drawer 開合動畫對齊」）
drawer 開啟時只有星期列（`#eventsWeekdayRow`）跟月曆導航（`.events-nav-group`）要跟著月曆格線往左縮，header／搜尋列／篩選列要維持全寬——不能整個 `#eventsTopBar` 套 `margin-right`（那樣會連 header 都一起縮）。做法是只在這兩個子元素自己身上加 `margin-right: 360px`（`body.day-events-open` 且桌機寬度時）：`#eventsWeekdayRow` 是 `#eventsTopBar` 裡一個普通 block 元素（`width:auto`），加 `margin-right` 只會讓它自己變窄，不影響同一容器裡的其他兄弟元素；`.events-nav-group` 則是 `.events-toolbar`（`flex-shrink:0`，寬度貼齊內容含這個 margin）裡唯一的 flex item，效果是 `.events-toolbar` 整體寬度不變（右邊界仍在 `#eventsTopBar` 右緣），但 `.events-nav-group` 的可視內容（按鈕＋月份標籤）在框內往左移動 360px，視覺上跟月曆格線／星期列對齊，不用去動 `.events-toolbar`／`.events-filter-row` 本身（那樣會連 `.filter-bar`／篩選 pill 一起被牽動）。

### 其他 UI 細節設計理由
- **城市切換 tab（`.events-city-tabs`）不共用篩選 pill 的 class**：視覺上跟 `.filter-pill` 同一套「藥丸形、active 實心藍底白字」語言，但獨立一份 class（不共用 `.filter-pill`），因為篩選 pill 的行為（開合面板／清除）跟這裡單純的「切換顯示內容」不一樣，共用容易互相牽動。**v34**：`.events-city-tab.active` 補上 `font-weight: 500`，被選取的城市在視覺上更明顯跟未選取的區分開來（之前 active／未 active 只有底色跟文字顏色不同，字重一樣）。
- **當日活動 drawer 卡片改單欄（`.events-card-list`，v39.1）**：這份清單只用在 400px 寬的 drawer 裡，兩欄會讓每張卡片窄到 180px 左右，標題/地點容易換行擠壓，單欄比較好讀；drawer 卡片同時拿掉了縮圖（v39），只剩文字內容，一次要看好幾張、寬度有限，純文字掃視速度更快。
- **「已結束」用降低整張卡片透明度，不加灰階濾鏡**：`.collage-card.is-ended`／`.loc-card-grid.is-ended` 只降 `opacity` 到 0.6，圖片保留原色，比灰階濾鏡更柔和——卡片數量多時拼貼牆不會有一半整片變灰。兩種卡片語言共用同一顆 `.is-ended` class，數值也要一致，不然切換排列方式時「已結束」深淺會不一樣。


### `buildGroups()` 合併多地點活動時取最寬日期範圍（events.js）
理論上同一組（標題＋期間相同）的多個地點，`start`／`end` 應該完全一致，但仍寫成「取涵蓋範圍最大的一份」（`if (ev.start < group.start) group.start = ev.start`／`if (ev.end > group.end) group.end = ev.end`），防呆萬一表單裡兩個地點日期填得不完全一樣，篩選／月曆判斷仍以最寬的範圍為準，不會因為其中一列填錯幾天就整組消失或提早結束。

### `findGroupByKey()` 刻意查 `allEvents`（未篩選）而不是 `visibleGroups()`
詳情 Modal／分享連結還原用的查找都吃**未經篩選**的全量資料，理由跟 `ensureGroupKeyMap()` 一樣：如果改查目前篩選後的 `visibleGroups()`，使用者篩選條件剛好不含這組活動的分類時，點開一個已經開著的詳情 Modal 或分享連結進來會找不到對應的 group，變成無法開啟。

### 月曆橫幅排列演算法：`weekEventBars()`（events.js）
每一週橫幅的擺放分兩步：先算每個 group 在這一週實際涵蓋的欄位範圍（`colStart`／`colSpan`，只算這一週裡真的有顯示日期的欄，不延伸到留白格），再依「開始欄位小的排前面，同樣開始欄位時橫跨天數多的排前面」排序，最後用 `rowLastCol` 陣列（記錄每個 row 目前佔用到的最後一欄）做簡單的區間排程：找第一個「目前佔用範圍在這個 bar 開始欄位之前」的 row 放進去，找不到就開新 row。這個排序規則是為了讓橫跨多天的活動優先卡進較前面的 row，畫面看起來比較穩定，不會因為 bar 順序不同而每次重新整理都跳來跳去。

### 月曆渲染效能修正：`visibleGroups()` 避免重複計算（v34 修正）
開發「有抽卡 / 相卡機」快速篩選時，Gill 發現月曆檢視下點擊這顆篩選 pill 反應明顯變慢，一度懷疑是本機開發伺服器（live server）的問題、正式上線後會恢復正常——實際排查後確認**不是**，是純粹的前端 JS 計算量問題，部署到正式站也會一樣慢：`renderEventsCalendar()` 底下 `renderWeekRow()` 每週呼叫一次，週內每個日期格又各自呼叫 `eventsForDate(date)`（內部呼叫 `visibleGroups()` 重跑一次完整的 `visibleEvents()` 篩選鏈），`weekEventBars()` 也獨立再呼叫一次 `visibleGroups()`——一個月的月曆下來，`visibleGroups()`／`visibleEvents()` 被重複計算約 40～50 次；「有抽卡 / 相卡機」篩選啟用時，每次重算還要對每個活動各自呼叫 `findRelatedMachines()` 跟全部機台比對一次，成本又再被放大一輪。

修正方式：把 `visibleGroups()` 提升到 `renderEventsCalendar()` 裡只算一次，透過參數往下傳——`renderWeekRow(week, today, weekKey, groups)`、`weekEventBars(week, groups)` 都改吃這個已經算好的 `groups`，日期格改用 `groups.filter((g) => isWithin(date, g))` 從既有結果篩選，不再各自重新呼叫 `visibleGroups()`。`eventsForDate()` 本身沒有動，因為它在非熱路徑的 `openDayEventsPanel()` 還有用到，只是不再被 `renderWeekRow()` 熱路徑呼叫。

### `.events-week-hover-col` 疊在橫幅「上層」是靠 DOM 順序，不是 z-index
`renderWeekRow()` 刻意把 `.events-week-hover-col` 這個絕對定位圖層放在 `.events-week-bars` **之後**：兩者都是 `position` 非 `static`、`z-index` 都是 `auto` 的元素，同一個堆疊層級（stacking context）裡沒有設 `z-index` 時，堆疊順序完全照 DOM 順序決定，後出現的畫在上面。這樣 hover 外框才會蓋在橫幅色塊「上層」，滑鼠移過去能看到完整一圈框線，不會被橫幅擋住切成一段一段。之後如果要調整這幾個元素的疊放順序，記得這裡沒有用 `z-index` 控制，改 DOM 順序就會直接影響視覺結果。

### 觸控裝置刻意不綁 hover 監聽（`isDesktopPointer()`，events.js）
日期格子的 `mouseenter`／`mouseleave`（整欄外框效果）只在 `isDesktopPointer()`（`hover:hover` 且 `pointer:fine`）為真時才綁定，觸控裝置完全不綁，不是綁了但沒效果——因為部分瀏覽器會在 `tap` 時補一次「幽靈」`mouseenter` 事件，觸控裝置上硬綁這組事件會有不一致的行為（外框忽現忽不現），乾脆整組跳過。

### 拼貼列表卡片沿用首頁 `.loc-card-grid`，不是另一套卡片語言（`eventListCardHtml()`，events.js）
拼貼「列表」排列（跟「格狀」是完全不同的卡片語言）直接沿用首頁地點列表卡片的完整 class 組合（`.loc-card-grid`／`.card-top`／`.card-badge-row`／`.type-badge`／`.ending-badge`／`.card-name`／`.card-limited`／`.card-tags`／`.tag`／`.card-actions`／`.btn-expand`，全部定義在 `style.css`，兩個頁面都有載入），連互動邏輯都比照首頁 `grid.js` 的 `renderGrid()`：整張卡片都可以點擊展開詳情，「詳情」按鈕是冗餘的點擊目標（v34 之前是卡片本身不能點、只有「詳情」按鈕可以點，見上方 v34 說明）；卡片上不放縮圖（首頁列表卡片本身也沒有圖，圖只在「詳情」彈窗裡）、不放「在 Google Maps 查看」連結（只留在詳情 Modal 裡，那裡本來就有，多地點時還能切城市 tab 各自查看，卡片這層不需要重複一份）。首頁的 `.type-badge` 只有 `.gacha`／`.photocard` 兩種寫死的顏色，這裡活動類型有五種（`EVENT_CATEGORIES`），改用 inline style 帶入對應色碼，視覺上仍是同一顆「白底、色框、色字」的 badge，只是顏色來源不同。多地點活動的 tag 只列縣市（不重複的城市各一顆），不顯示場地；單一地點才顯示場地——因為多地點時「場地」這個欄位每個地點都不一樣，不適合放在合併後的單一卡片上。

### `syncEventsPanelOffset()`：drawer 頂部對齊錨點依檢視模式切換（events.js）
「當日活動」drawer 頂部要跟月曆頂部切齊，量的原本一直是 `.events-page-body`（真正在捲動的月曆格線容器）的 `getBoundingClientRect().top`。v32 把星期列（`#eventsWeekdayRow`）搬進 `#eventsTopBar` 之後，星期列已經不算在 `.events-page-body` 裡面，如果還是只量 `.events-page-body` 的頂部，drawer 頂部會比「星期列＋格線」這一整塊月曆卡片的視覺頂部低一截（矮了一個星期列的高度），跟月曆對不齊。修法是依目前是不是月曆檢視動態換錨點：月曆檢視時（星期列沒有 `hidden`）改成量星期列自己的頂部，讓 drawer 跟整張月曆卡片（星期列+格線）齊高；拼貼檢視星期列本來就是 `hidden`，這時沒有「月曆」可以對齊，維持原本量 `.events-page-body` 頂部的行為。跟首頁 `--top-bar-height` 是同一種坑（訪客 banner 非同步出現、高度晚一步變化），同樣改用 `ResizeObserver` 盯 `header`／`.visitor-banner`／`#eventsWeekdayRow` 本身的尺寸變化，不用為每個成因各自補監聽。

### 活動詳情 Modal 城市頁籤：哪些欄位共用、哪些因地點而異（`locationSectionHtml()`，events.js）
同一組有多個地點（例如台北／高雄同時開）時，標題／圖片／分類／期間只畫一份（合併後在最外層），只有場地、地址、營業時間、更多資訊連結、Google Maps 連結這幾項因地點而異，改放進城市 tab 切換的內容區塊（`#eventDetailLocationSlot`）裡，切 tab 只換這個 slot 的內容，不整份重繪 Modal——跟月曆橫幅、卡片是同一套「合併共通欄位，只有真的因地點而異的內容才分開」的設計原則。

**v34：地址欄位不重複顯示縣市**：`locationSectionHtml()` 組地址字串原本無條件寫成 `` `${loc.city}${loc.addr}` ``，但 Google Sheet 部分列的 `addr`（地址欄）本身就已經帶縣市開頭（例如「臺北市中正區正守里市民大道三段2號」），疊加 `loc.city`（「臺北市」）後 Modal 會顯示成「臺北市臺北市中正區...」。改成防禦性判斷：`loc.addr` 已經以 `loc.city` 開頭時就直接用 `loc.addr`，否則才補上 `loc.city`；不管資料源那一列的 `addr` 欄有沒有帶縣市開頭都能正確顯示，不用回頭清資料。


---

## 外部工具筆記

**Notion**
- fetch：用完整 URL（含 `?source=copy_link`）
- update：用裸 UUID `372feb89-ce7e-811c-9a4e-fac174a5691f` 作為 `page_id`（「台灣抽卡機地圖 — 設計迭代紀錄」主頁）
- 插入內容：用 `old_str`/`new_str` 鎖定標題文字作為錨點
- 「GA4 事件追蹤表」資料庫（v33.2 記錄）：`data-source url` 為 `collection://ae0f94e1-cee0-4a1c-a072-3045c60d105d`，database page 為 `3660da53-8fea-4922-9177-d1e065d5c2f7`；每個 GA4 事件是這個 data source 底下的一個 page，schema 欄位含「事件名稱」（title）／「新增版本」（select）／「觸發位置」（multi_select）／「分類」（select）／「參數」／「觸發時機」／「分析用途」／「已知限制」／「GA4 自訂維度已註冊」（checkbox）；新增/更新事件記錄時查這個 URL，不用每次重新 search

**Figma**
- `get_design_context` 用 `fileKey: 2ZsVk3lz1VafzFInqbj8Ug`
- `nodeId` 用 `-` 分隔（例如 `658-472`），不是 `%3A`
- 操作前先切換到正確 page，再 append nodes

---

## 文件位置

| 文件 | 說明 |
|------|------|
| `README.md` | 功能介紹、技術架構、欄位規格 |
| `spec.md` | 完整功能規格與設計規格 |
| Notion | 設計迭代紀錄（V1 起） |
