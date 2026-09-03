# KADO!抽卡機在哪

社群共建的台灣 IP 抽卡機 / 快閃活動查詢網站，資料由管理者維護於 Google Sheet，網站自動讀取並顯示。

**🔗 [查看網站](https://kadotw.vercel.app/)**  
**最後更新：** 2026/09/03（v31）

---

## 功能

- 🔍 搜尋 IP 角色、地點名稱、縣市
- 🔽 依機台類型、縣市、IP 篩選（多選，桌面版 dropdown 面板 / 手機版 bottom sheet）
- ⏰ 即將結束的期間限定活動顯示倒數天數 badge（3 天內）
- 📍 點地標查看詳細資訊（場地、IP、彈數、一抽張數、期間限定、圖片）
- 🖼️ 支援多張圖片輪播，點擊放大
- 🗺️ 互動地圖，顯示全台抽卡機與 IP 快閃活動地點，自訂彩色圖示 + 同地點多機自動聚合
- 📱 手機版響應式設計（地圖全螢幕 + 底部可拖拉、依內容自動調整高度的詳情面板）
- 🗺️ 一鍵導航至 Google Maps
- 📅 依期間限定結束日期排序（近到遠／遠到近），或授權定位後依「離我最近／最遠」排序
- 🔗 分享單一地點連結，社群平台（LINE / Threads / Discord）預覽卡片有專屬標題與縮圖
- 👣 顯示累計訪客人數
- 🔄 回到前景自動刷新資料（節流 30 分鐘），列表模式支援下拉手動刷新
- 🔗 分享單一地點連結，社群平台（LINE / Threads / Discord）預覽卡片有專屬標題與縮圖；地圖模式分享的連結，收到方點開後會直接回到地圖模式並展開該機台詳情
- 🔍🔗 搜尋或篩選機台時，網址列會即時同步當下的條件，複製網址列就能分享這個搜尋結果，對方點開會直接看到同樣的結果，不用另外點分享按鈕（v30.8 新增）
- 📋 回報表單，讓社群協助新增地點或回報錯誤
- 🗒️ 更新日誌，桌機 header／手機列表模式皆有連結可查看歷次版本更新內容

---

## 技術架構

| 項目 | 工具 |
|------|------|
| 前端 | 純 HTML / CSS / JavaScript（ES Modules，見下方檔案結構） |
| 地圖套件 | Leaflet.js 1.9.4（OpenStreetMap 底圖，免費） |
| 資料來源 | Google Sheet（發布為公開 CSV） |
| 圖片託管 | Cloudinary |
| 網站託管 | Vercel（免費） |
| Serverless Function | `api/share.js`／`api/index.js`（分享連結與首頁 OG meta 用，Vercel 免費方案內；`api/index.js` v30.7 新增） |
| PWA | 已於 v31 移除；`sw.js` 保留自我卸載用途（清乾淨舊安裝使用者的離線快取），詳見 `CLAUDE.md` |
| 字體 | Chiron GoRound TC（400/500/700）、Space Mono（統計數字）|
| 訪客計數 | 自架 Cloudflare Worker + KV |
| 數據分析 | Google Analytics 4（GA4） |

**不需要資料庫、不需要 API 金鑰。** 有兩支極輕量的 serverless function（`api/share.js`／`api/index.js`）純粹是為了讓分享連結、以及直接分享 `/?id=` 網址時，在 LINE/Threads 等平台都能顯示正確的預覽卡片，不涉及任何使用者資料或資料庫。

### 檔案結構

```
app.html            # 進入點（SPA 殼層，刻意不叫 index.html——見下方 rewrite 說明）
style.css            # 全部樣式
js/
  main.js            # 資料載入／view 切換／篩選＋排序協調／回到前景自動刷新／下拉刷新（v31 起，原本在 pwa.js）
  map.js             # 地圖／marker／側邊欄／mobile bottom sheet
  filters.js         # 篩選 UI
  sort.js            # 排序 UI + 定位權限
  grid.js            # 列表卡片渲染 + 排序邏輯
  scroll.js          # mobile 列表模式：頂部工具列滑動隱藏/顯示（v26 新增）
  changelog.js       # 更新日誌讀取／渲染／modal-sheet 開關（v27 新增）
  utils.js           # 裝置/顯示模式判斷
  visitor.js         # 訪客計數
api/share.js         # 分享連結 OG meta 用的 serverless function
api/index.js          # 首頁 / 動態 OG meta 用的 serverless function（v30.7 新增，透過 vercel.json rewrite 攔截 /；讀取 app.html 塞入 og 標籤後回傳）
changelog.json       # 更新日誌內容（v27 新增，跟 manifest.json 同層）
worker.js            # 訪客計數 Cloudflare Worker 原始碼（v30 新增，獨立部署到 Cloudflare，不隨 Vercel 走）
wrangler.toml        # 上述 Worker 的部署設定（KV binding、Worker 名稱）
permanent-id.gs      # 分享連結永久ID機制的 Apps Script（v30.4 新增，貼到 Google Sheet 端手動設定，
                      # 不在這個 repo 的 push.sh 流程裡，見「分享連結永久ID機制」）
```

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
| P | 分享圖 | 社群平台分享預覽用的專屬縮圖，Cloudinary 網址（v28 新增） | ❌ |
| Q | 永久ID | 分享連結真正比對的依據，新增資料時由 Apps Script（`permanent-id.gs`）自動產生，一旦產生絕對不能手動修改或重複使用（v30.4 新增） | 系統自動填入 |
| R | 最後更新時間 | 只有第一列（標題列下方那一列）會填，網站抓這一格顯示「最後更新：」文字 | 僅第一列 |

> 緯度經度可以用 Google Maps 點地點後取得。
> 欄位為空時，對應資訊不顯示，不影響版面。

---

## 資料更新流程

1. 在 Google Sheet 新增或編輯資料
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
