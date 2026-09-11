# KADO!抽卡機在哪

社群共建的台灣 IP 抽卡機 / 快閃活動查詢網站，資料由管理者維護於 Google Sheet，網站自動讀取並顯示。

**🔗 [查看網站](https://kadotw.vercel.app/)**  
**最後更新：** 2026/09/11（v35，機台/活動分享圖改支援依檢視/入口分開填多張圖、events.html 改名 events-app.html 新增 api/events.js 讓活動搜尋結果分享連結也有預覽圖、總覽拼貼列表版面與月曆 day-events-panel 補上網址同步；v33.4，events.html 初始載入效能修正、活動情報頁支援分享搜尋結果；追加全站手機/桌機切換斷點從 768px 改為 900px、點「作品」標籤快速篩選同作品機台/活動；v34 追加活動支援同一活動填多個作品／IP 聯名（搜尋/篩選/詳情彈窗/卡片皆支援）、活動情報頁新增「今日活動」／「有抽卡 / 相卡機」快速篩選 pill＋月曆渲染效能修正；另追加 View Toggle 圖示 outline/fill 切換擴大套用＋改為內容撐開不再固定寬高、FAB icon 換成月曆圖示並改用漸層背景＋hover 改內容撐開、機台/活動卡片徽章樣式細部調整；拼貼卡片圓角邏輯再修正、月曆上/下月按鈕補上 hover、月份標籤格式改為 yyyy/mm、當日活動卡片 hover 效果補齊、day-events panel 手機版 header 改比照篩選 sheet 樣式、首頁機台列表／活動情報頁拼貼列表卡片改成整張卡片可點擊展開詳情（原本只有「詳情」按鈕可以點）等多項排版細修；相關機台卡片徽章改用圖示樣式＋hover 外框修正、城市頁籤選取字重加粗、修正地址欄位重複顯示縣市的 bug；**再追加**：修正列表 view-btn 一次顯示兩顆 icon 的 bug（漏補 CSS 切換規則）、`.loc-card-grid`／`.loc-card` hover 效果調整為 inset 邊框＋外陰影＋上移動畫、`.filter-panel` 補上 `overflow-x: hidden` 防止橫向捲動、`.collage-list-wrap` 補上 `padding-top` 避免第一排卡片 hover 陰影被裁掉、`.events-bar-title` 字重調整、`.events-multi-pill`／`.events-bar-multi-badge` 補上／統一 `map_pin_heart` icon；**追加**：月曆星期列與日期格之間多餘的 8px 間距修正、活動詳情「相關機台」卡片列左右箭頭按鈕改為毛玻璃圓形樣式＋換用專案既有 chevron icon；**再追加**：修正手機點擊卡片/按鈕時藍色 tap-highlight 閃爍的問題、活動情報頁拼貼列表底部間距獨立調整、窄螢幕 header 標題改成兩行顯示（不再隱藏副標題）；見下方說明）

---

## 功能

- 🔍 搜尋 IP 角色、地點名稱、縣市
- 🔽 依機台類型、縣市、作品 篩選（多選，桌面版 dropdown 面板 / 手機版 bottom sheet；篩選類別原稱「IP」，v33.2 起改稱「作品」，內部 key／GA 參數值不變）
- ⏰ 即將結束的期間限定活動顯示倒數天數 badge（3 天內）
- 📍 點地標查看詳細資訊（場地、IP、彈數、一抽張數、期間限定、圖片），作品（IP）標籤可點擊快速篩選出同作品所有機台（v33.4 新增）；地圖/列表切換 icon 依選取狀態切換 outline／實心兩種樣式（v34 新增，追加修正過一次 outline/fill 同時顯示的 bug）；列表模式整張卡片都可點擊開啟詳情（v34 新增，原本只有「詳情」按鈕可以點）；卡片 hover 效果統一為 inset 邊框＋外陰影＋上移動畫（v34 追加調整）
- 🖼️ 支援多張圖片輪播，點擊放大
- 🗺️ 互動地圖，顯示全台抽卡機與 IP 快閃活動地點，自訂彩色圖示 + 同地點多機自動聚合
- 📱 手機版響應式設計（地圖全螢幕 + 底部可拖拉、依內容自動調整高度的詳情面板）；點擊卡片/按鈕不再出現瞬間藍色高亮閃爍；窄螢幕標題改成「KADO！」＋副標題兩行顯示（原本副標題會被隱藏）
- 🗺️ 一鍵導航至 Google Maps
- 📅 依期間限定結束日期排序（近到遠／遠到近），或授權定位後依「離我最近／最遠」排序
- 🔗 分享單一地點連結，社群平台（LINE / Threads / Discord）預覽卡片有專屬標題與縮圖
- 👣 顯示累計訪客人數
- 🔄 回到前景自動刷新資料（節流 30 分鐘），列表模式支援下拉手動刷新
- 🔗 分享單一地點連結，社群平台（LINE / Threads / Discord）預覽卡片有專屬標題與縮圖；地圖模式分享的連結，收到方點開後會直接回到地圖模式並展開該機台詳情；分享圖可依「列表」／「地圖」檢視各自指定不同縮圖（v35 新增）
- 🔍🔗 搜尋或篩選機台時，網址列會即時同步當下的條件，複製網址列就能分享這個搜尋結果，對方點開會直接看到同樣的結果，不用另外點分享按鈕（v30.8 新增）；手動切換列表／地圖檢視本身也會即時同步網址（v35 新增）
- 📋 回報表單，讓社群協助新增地點或回報錯誤
- 🗒️ 更新日誌，桌機 header／手機列表模式皆有連結可查看歷次版本更新內容
- 🗓️ **全新「活動行事曆」頁面**（`events.html`，v32 新增）：整理全台動漫快閃店／聯名展覽／簽名會／CAFÉ 聯名／特典活動等實體活動
  - 月曆檢視（依日期瀏覽，同一天多場活動可展開清單）／總覽檢視（拼貼卡片，格狀或列表排列可切換）雙模式
  - 依「類型／IP／縣市」篩選、關鍵字搜尋、依「結束日／距離」排序（跟首頁篩選/排序 UI 共用同一套元件，見 `CLAUDE.md`）
  - 活動詳情彈窗：同一檔活動在多城市開時可切換城市頁籤、支援多圖輪播、點擊放大（v33.1 新增）、一鍵分享（v33.1 起分享連結有動態專屬預覽縮圖，見下方「活動分享連結」）；「相關機台」橫向卡片列（v33 新增，反查同地點有哪些機台）v33.3 起補上左右箭頭按鈕，方便沒有 trackpad 的滑鼠使用者捲動；作品欄位同樣可點擊快速篩選出同作品所有活動，留在點擊當下的月曆或總覽檢視（v33.4 新增）
  - 🔍🔗 搜尋或篩選活動時，網址列會即時同步當下的條件，複製網址列就能分享搜尋結果（v33.4 新增，比照首頁機台頁的搜尋分享連結）；總覽切成列表版面、月曆點日期展開當天活動清單，這兩種畫面狀態也補上網址同步與還原（v35 新增）
  - 🔗 分享連結不再只有一張固定縮圖：依分享按鈕是從總覽拼貼格／總覽列表／月曆／當日活動清單哪裡點開，各自可指定不同的分享圖（v35 新增）
  - 🖼️ 搜尋結果分享連結終於也有預覽圖了：`events.html` 改名為 `events-app.html`，新增 `api/events.js` 動態產生 OG 標籤，跟首頁 `app.html`／`api/index.js` 是同一套做法（v35 修正）
  - ⚡ 初始載入效能修正（v33.4）：頁面不再等機台資料抓完才顯示活動內容，機台徽章／相關機台清單改成背景載入完再補畫
  - 首頁與行事曆頁互通：畫面右下角常駐一顆 FAB（floating action button）可一鍵互相切換；FAB icon 改用 `calendar_today` 圖示、背景改為藍色漸層＋毛玻璃效果，hover 展開改成依文字內容自動撐開寬度（v34 新增）
  - 五種活動類型各有固定識別色（POP-UP 橘／展覽 藍／其他 黃／CAFÉ・餐廳 綠／特典 紫），月曆橫幅、分類標籤、卡片、詳情彈窗皆共用同一組色碼
  - 🩹 月曆版面修正（v32.1）：篩選出 0 筆活動時，月曆最後一週會恢復跟其他週一樣的預設高度，不會再出現卡片異常延伸留白的問題
  - 🔽 「今日活動」／「有抽卡 / 相卡機」快速篩選 pill（v34 新增）：跟類型／作品／縣市篩選同排、同樣式，總覽檢視顯示，月曆檢視只保留「有抽卡 / 相卡機」
  - ⚡ 月曆渲染效能修正（v34）：月曆檢視下切換篩選變快，整個月只計算一次篩選結果，不再每週、每天各自重算
  - 🩹 細部樣式修正（v34 追加）：`.filter-panel` 補上 `overflow-x: hidden` 避免篩選面板可左右滑動；`.collage-list-wrap`（拼貼列表捲動容器）補上 `padding-top`，避免第一排卡片 hover 陰影被自己的捲動邊界裁掉；`.events-bar-title` 字重調整為 500；月曆橫幅／拼貼卡片「N 地點」提示（`.events-multi-pill`／`.events-bar-multi-badge`）圖示換成／補上 `map_pin_heart` icon 並統一尺寸；拼貼列表模式的 `.events-filter-row` 底部間距獨立出來調整為 16px，不再跟月曆檢視共用同一組數值

---

## 技術架構

| 項目 | 工具 |
|------|------|
| 前端 | 純 HTML / CSS / JavaScript（ES Modules，見下方檔案結構） |
| 地圖套件 | Leaflet.js 1.9.4（OpenStreetMap 底圖，免費） |
| 資料來源 | Google Sheet（發布為公開 CSV） |
| 圖片託管 | Cloudinary |
| 網站託管 | Vercel（免費） |
| Serverless Function | `api/share.js`／`api/index.js`（機台分享連結與首頁 OG meta，`api/index.js` v30.7 新增）、`api/event-share.js`／`api/events.js`（活動分享連結與行事曆頁 OG meta，`api/event-share.js` v33.1 新增，`api/events.js` v35 新增，皆 Vercel 免費方案內） |
| PWA | 已於 v31 移除；`sw.js` 保留自我卸載用途（清乾淨舊安裝使用者的離線快取），詳見 `CLAUDE.md` |
| 字體 | Chiron GoRound TC（400/500/700）、Space Mono（統計數字）|
| 訪客計數 | 自架 Cloudflare Worker + KV |
| 數據分析 | Google Analytics 4（GA4） |

**不需要資料庫、不需要 API 金鑰。** 有四支極輕量的 serverless function（`api/share.js`／`api/index.js`／`api/event-share.js`／`api/events.js`）純粹是為了讓機台與活動的分享連結、以及直接分享 `/?id=`／`/events.html?...` 網址時，在 LINE/Threads 等平台都能顯示正確的預覽卡片，不涉及任何使用者資料或資料庫。

### 檔案結構

```
app.html             # 首頁進入點（SPA 殼層，刻意不叫 index.html——見下方 rewrite 說明）
events-app.html      # 活動行事曆頁進入點（v32 新增，獨立頁面，不共用 app.html 的 JS 模組鏈；v35 起改名自 events.html，理由跟 app.html 一樣——見下方 rewrite 說明）
style.css            # 首頁／行事曆頁共用的全站樣式（header、卡片、彈窗等共用元件）
events.css           # 活動行事曆頁專屬樣式（月曆格線、拼貼卡片、FAB 等）
js/
  main.js            # 資料載入／view 切換／篩選＋排序協調／回到前景自動刷新／下拉刷新（v31 起，原本在 pwa.js）
  map.js             # 地圖／marker／側邊欄／mobile bottom sheet
  filters.js         # 首頁篩選狀態與資料（渲染/開合邏輯已抽到 filter-widget.js）
  sort.js            # 首頁排序狀態串接（渲染/開合邏輯已抽到 sort-widget.js）
  filter-widget.js   # 通用篩選 UI 元件（pill／桌機下拉／手機 bottom sheet），首頁與行事曆頁共用
  sort-widget.js     # 通用排序 UI 元件（按鈕／dropdown／bottom sheet + 定位權限），首頁與行事曆頁共用
  grid.js            # 列表卡片渲染 + 排序邏輯
  scroll.js          # mobile 列表模式：頂部工具列滑動隱藏/顯示（v26 新增）
  changelog.js       # 更新日誌讀取／渲染／modal-sheet 開關（v27 新增）
  utils.js           # 零依賴共用工具：裝置判斷、縣市清單、倒數 badge、圖片網址轉換、距離計算（首頁與行事曆頁都會用到的邏輯集中在這）
  visitor.js         # 訪客計數
  events.js          # 活動行事曆頁面邏輯：月曆／總覽（拼貼格狀・列表）渲染、篩選/排序/搜尋串接、詳情彈窗、分享
  events-data.js     # 活動資料層：讀取 Google Sheet「活動」分頁 CSV，解析成 events.js 用的資料結構
  events-header.js   # 行事曆頁專用：只負責抓「最後更新」時間戳並寫進 DOM，不載入 main.js
  events-scroll.js   # 行事曆頁專用：手機版頂部工具列滑動隱藏/顯示（比照 scroll.js，但要同時盯 3 種子模式的捲動容器）
api/share.js         # 機台分享連結 OG meta 用的 serverless function
api/index.js          # 首頁 / 動態 OG meta 用的 serverless function（v30.7 新增，透過 vercel.json rewrite 攔截 /；讀取 app.html 塞入 og 標籤後回傳）
api/event-share.js    # 活動分享連結 OG meta 用的 serverless function（v33.1 新增；v35 起依分享入口分四種分享圖）
api/events.js         # events.html 動態 OG meta 用的 serverless function（v35 新增，透過 vercel.json rewrite 攔截 /events.html；讀取 events-app.html 塞入 og 標籤後回傳）
changelog.json       # 更新日誌內容（v27 新增，跟 manifest.json 同層）
worker.js            # 訪客計數 Cloudflare Worker 原始碼（v30 新增，獨立部署到 Cloudflare，不隨 Vercel 走）
wrangler.toml        # 上述 Worker 的部署設定（KV binding、Worker 名稱）
permanent-id.gs      # 分享連結永久ID機制的 Apps Script（v30.4 新增，貼到 Google Sheet 端手動設定，
                      # 不在這個 repo 的 push.sh 流程裡，見「分享連結永久ID機制」）
```

> `filters.js`／`sort.js` 目前是「串接首頁 DOM 用的薄層」，實際的 UI 渲染／開合／量寬／GA 事件都在 `filter-widget.js`／`sort-widget.js` 這兩個通用元件裡，`events.js` 建立自己的另一份實例共用同一套邏輯。細節與抽出來的理由見 `CLAUDE.md`。

---

## Google Sheet 欄位規格

> **v30.4 起欄位順序大幅調整**（期間限定從 K 移到 D），且新增 P/Q/R 三欄；程式碼相關細節（`parseCSVRow` 欄位對照、永久ID機制原理）見 `CLAUDE.md`。

| 欄 | 欄位 | 說明 | 必填 |
|----|------|------|------|
| A | id | 流水號，僅供 Sheet 內部排序/管理，不再是分享連結的依據（手動填入，勿用公式） | ✅ |
| B | 類型 | 機台類型（抽卡機 / 相卡機） | ✅ |
| C | 店名 | 活動或地點名稱 | ✅ |
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
| N | 備註 | 補充說明 | ❌ |
| O | 營業時間 | 如：週一至週日 11:00–22:00 | ❌ |
| P | 分享圖 | 社群平台分享預覽用的專屬縮圖，Cloudinary 網址（v28 新增）。**v35 起可用「,」或「、」分兩張圖**：第一張給列表檢視分享用、第二張給地圖檢視分享用，只填一張或空白則各自退回固定預設圖 | ❌ |
| Q | 永久ID | 分享連結真正比對的依據，新增資料時由 Apps Script（`permanent-id.gs`）自動產生，一旦產生絕對不能手動修改或重複使用（v30.4 新增） | 系統自動填入 |
| R | 最後更新時間 | 只有第一列（標題列下方那一列）會填。**v32.1 起**：網站會同時抓活動分頁 P 欄的時間戳一起比較，兩者取較新的一個顯示（見下方「活動行事曆分頁」） | 僅第一列 |

> 緯度經度可以用 Google Maps 點地點後取得。
> 欄位為空時，對應資訊不顯示，不影響版面。

### 活動行事曆分頁（`events-app.html` 用，另一個分頁）

活動行事曆頁讀的是同一份 Google Sheet 裡**另一個分頁**（不是上面機台那張），欄位順序：`id, 類型, 活動標題, 期間限定, 場地, 縣市, 地址, 緯度, 經度, 作品(IP), 圖片, 更多資訊連結, 營業時間`（**v34 新增**：J 欄「作品(IP)」若同一活動有多個 IP 聯名，用頓號「、」分隔，例：`美少女戰士、光之美少女`；網站會拆成陣列供 Modal 顯示、搜尋、篩選使用，見 `js/events-data.js` 的 `characters`）（A～M 共 13 欄；**O 欄「永久ID」v33.2 新增啟用**，比照機台 Q 欄，分享連結真正比對的依據，由 Apps Script（`permanent-id.gs`）自動產生，一旦產生絕對不能手動修改或重複使用，見下方「活動分享連結」；**N 欄「分享圖」v33.1 新增啟用**，社群平台分享預覽用的專屬縮圖，Cloudinary 網址，選填，沒填則分享連結顯示對應情境的預設圖（見下方「活動分享連結」）；**v35 起可用「,」或「、」分四張圖**，依分享按鈕是從總覽拼貼格／總覽列表／月曆／當日活動清單哪裡點開分別對應，沒湊滿四張一律退回預設圖；**P 欄「最後更新時間」v32.1 起啟用**，網站會跟機台分頁 R 欄比較，取較新的一個顯示，寫入方式與 R 欄相同——只有第一列會填）。類型欄（B 欄）的值必須完全對應 `js/events-data.js` 的 `EVENT_CATEGORIES`（目前是 POP-UP／展覽／其他／CAFÉ・餐廳／特典活動），改了其中一邊要兩邊同步改，否則舊資料會退回灰色分類、篩選也篩不出來。同一檔活動在多個縣市開時，每個地點各自填一列，網站會依「標題＋期間」自動合併成同一組顯示。詳細欄位對照與分組機制見 `CLAUDE.md`／`spec.md`。

#### 活動分享連結（`api/event-share.js`，v33.1 新增；v33.2 改用永久ID；v35 依分享入口分四種分享圖）

活動詳情 Modal 的分享按鈕（`shareEvent()`）產生的網址走 `/api/event-share?id=<地點永久ID>&from=<grid|list|bar|card>`（**v33.2 起改用 O 欄永久ID**，取代原本的 A 欄流水號，理由跟機台的 `permId` 機制完全一樣：A 欄可以被管理者自由重新編號，編號被別的活動地點頂替後舊連結會連到錯的內容；**v35 起新增 `from`**，依分享按鈕是總覽拼貼格／總覽列表／月曆 events-bar／當日活動清單哪一種入口點開的），讓社群平台爬蟲能讀到對應的 `og:image`：N 欄「分享圖」湊滿四張就依 `from` 各自對應一張，沒湊滿、找不到、或抓表失敗都 fallback 回對應情境的預設圖（總覽拼貼格用 `event-og.png`，另外三種情境各有自己的預設圖）。`api/event-share.js` 只認永久ID，**不像機台 `api/share.js` 那樣保留 A 欄 fallback**（比照機台目前版本已拿掉 A 欄 fallback 的做法）。真人點擊會被立刻導回 `events-app.html?event=<永久ID>`（依 `from` 額外帶上 `&layout=list` 或 `&view=calendar`，讓背景版面跟分享者當初看到的一致），使用體驗不變。

`events-app.html` 載入時解析 `?event=` 也比照機台 `?id=` 的三段式判斷：永久ID精準比對成功才自動開啟活動詳情；比對失敗、退回比對到 A 欄流水號（舊格式連結）則安靜不顯示任何內容（因為無法確認 A 欄是不是還指向原本那個地點）；兩者都找不到才顯示「已下架」toast。三種結果對應三個 GA4 事件：`events_share_link_opened`／`events_share_link_legacy_fallback`／`events_share_link_target_missing`，詳見 `CLAUDE.md`／`spec.md`。

**v35 新增：搜尋結果分享連結也有預覽圖了**——`events.html` 過去是靜態檔案，`/events.html?q=...` 這類搜尋結果分享連結完全沒有 `og:image`；改法比照首頁 `app.html`／`api/index.js`：SPA 殼層改名 `events-app.html`，`vercel.json` 新增 `/events.html → /api/events` 的 rewrite，新增 `api/events.js` 動態產生 OG 標籤但回傳的仍是完整的 `events-app.html` 內容，不是導轉頁。

---

## 資料更新流程

1. 在 Google Sheet 新增或編輯資料（機台資料、活動資料分別在各自的分頁）
2. 網站重新整理後自動讀取，不需修改程式碼

### 新增圖片
1. 上傳圖片到 Cloudinary
2. 複製圖片網址
3. 貼到 Google Sheet M 欄（多張用逗號分隔）

### 程式碼更新
```bash
./push.sh "說明改了什麼"
```

push 至 GitHub 後 Vercel 自動重新部署，約 1 分鐘生效。

---

## 回報表單

社群回報新地點或資訊有誤：https://forms.gle/1yDKadx89DoesrSj7

---

## 設計文件

[查看完整設計迭代紀錄 →](https://www.notion.so/372feb89ce7e811c9a4efac174a5691f?source=copy_link)
