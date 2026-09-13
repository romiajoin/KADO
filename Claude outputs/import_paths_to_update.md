# Import 路徑更新清單

根據檔案移動後，需要更新的 import 語句對照表。

---

## 🔴 需要更新的檔案列表

### 1️⃣ `js/ui/grid.js`

**目前的 import：**
```javascript
import { getDeviceType, driveUrlToImage, ... } from './utils.js';
import { openGridModal } from './main.js';
import { sortState, userCoords } from './sort.js';
```

**應該改為：**
```javascript
import { getDeviceType, driveUrlToImage, ... } from '../shared/utils.js';
import { openGridModal } from '../core/main.js';
import { sortState, userCoords } from '../pages/machines/sort.js';
```

**變更數：** 3 個 import

---

### 2️⃣ `js/ui/map.js`

**目前的 import：**
```javascript
import { getDeviceType, MACHINE_TYPE_BADGE_ICON, ... } from './utils.js';
import { getEndingBadge } from './grid.js';
import { driveUrlToImage } from './utils.js';
import { allLocations, currentFiltered } from './main.js';
import { machineTitleHtml } from './event-match.js';
```

**應該改為：**
```javascript
import { getDeviceType, MACHINE_TYPE_BADGE_ICON, ... } from '../shared/utils.js';
import { getEndingBadge } from './grid.js';  // ✅ 同層，不改
import { driveUrlToImage } from '../shared/utils.js';
import { allLocations, currentFiltered } from '../core/main.js';
import { machineTitleHtml } from '../core/event-match.js';
```

**變更數：** 4 個 import

---

### 3️⃣ `js/core/main.js`

**目前的 import：**
```javascript
import { getDeviceType, driveUrlToImage, buildLastUpdatedText, ... } from './utils.js';
import { loadEvents } from './events-data.js';
import { matchMachineToEventRow, machineTitleHtml, stripNoEventLinkTag } from './event-match.js';
import { renderGrid, sortLocations, getEndingBadge } from './grid.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from './sort.js';
import { buildFilterOptions, renderFilterBar, FILTER_CONFIG, filterState } from './filters.js';
import { map, renderMapLocations, initMap, initBottomSheet, applySheetLevel, sheetLevel, isMobileMapLayout, openMobileSheetSummary, openDesktopSidebar } from './map.js';
import { initTopBarScroll, resetTopBarScrollState } from './scroll.js';
```

**應該改為：**
```javascript
import { getDeviceType, driveUrlToImage, buildLastUpdatedText, ... } from '../shared/utils.js';
import { loadEvents } from './events-data.js';  // ✅ 同層，不改
import { matchMachineToEventRow, machineTitleHtml, stripNoEventLinkTag } from './event-match.js';  // ✅ 同層，不改
import { renderGrid, sortLocations, getEndingBadge } from '../ui/grid.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from '../pages/machines/sort.js';
import { buildFilterOptions, renderFilterBar, FILTER_CONFIG, filterState } from '../pages/machines/filters.js';
import { map, renderMapLocations, initMap, initBottomSheet, applySheetLevel, sheetLevel, isMobileMapLayout, openMobileSheetSummary, openDesktopSidebar } from '../ui/map.js';
import { initTopBarScroll, resetTopBarScrollState } from '../pages/machines/scroll.js';
```

**變更數：** 5 個 import

---

### 4️⃣ `js/core/event-match.js`

**目前的 import：**
```javascript
import { haversineKm } from './utils.js';
```

**應該改為：**
```javascript
import { haversineKm } from '../shared/utils.js';
```

**變更數：** 1 個 import

---

### 5️⃣ `js/shared/changelog.js`

**目前的 import：**
```javascript
import { getDeviceType } from './utils.js';
```

**應該改為：**
```javascript
import { getDeviceType } from './utils.js';  // ✅ 同層，不改
```

**變更數：** 0 個（不用改）

---

### 6️⃣ `js/pages/machines/sort.js`

**目前的 import：**
```javascript
import { renderGrid, sortLocations } from './grid.js';
import { isMobileFilterLayout, closeMobileFilterSheet, closeDesktopPanels } from './filters.js';
import { currentFiltered, setCurrentFiltered } from './main.js';
import { map, renderMapLocations } from './map.js';
import { createSortWidget } from './sort-widget.js';
```

**應該改為：**
```javascript
import { renderGrid, sortLocations } from '../../ui/grid.js';
import { isMobileFilterLayout, closeMobileFilterSheet, closeDesktopPanels } from './filters.js';  // ✅ 同層，不改
import { currentFiltered, setCurrentFiltered } from '../../core/main.js';
import { map, renderMapLocations } from '../../ui/map.js';
import { createSortWidget } from '../../ui/sort-widget.js';
```

**變更數：** 4 個 import

---

### 7️⃣ `js/pages/machines/filters.js`

**目前的 import：**
```javascript
import { applyFilters } from './main.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from './sort.js';
import { createFilterWidget } from './filter-widget.js';
import { TW_CITY_ORDER } from './utils.js';
```

**應該改為：**
```javascript
import { applyFilters } from '../../core/main.js';
import { renderSortControl, closeDesktopSortPanel, closeMobileSortSheet } from './sort.js';  // ✅ 同層，不改
import { createFilterWidget } from '../../ui/filter-widget.js';
import { TW_CITY_ORDER } from '../../shared/utils.js';
```

**變更數：** 3 個 import

---

### 8️⃣ `js/pages/machines/scroll.js`

**目前的 import：**
```
（無 import，都是 export）
```

**變更數：** 0 個（不用改）

---

### 9️⃣ `js/pages/events/events.js`

**目前的 import：**
```javascript
import { getDeviceType, MACHINE_TYPE_BADGE_ICON, machineTypeClass, BTN_EXPAND_ICON_SVG, SHARE_BTN_ICON_SVG, CAROUSEL_CHEVRON_ICON_SVG, createLightbox } from './utils.js';
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
```

**應該改為：**
```javascript
import { getDeviceType, MACHINE_TYPE_BADGE_ICON, machineTypeClass, BTN_EXPAND_ICON_SVG, SHARE_BTN_ICON_SVG, CAROUSEL_CHEVRON_ICON_SVG, createLightbox } from '../../shared/utils.js';
import { getEndingBadge } from '../../shared/utils.js';
import { TW_CITY_ORDER } from '../../shared/utils.js';
import { haversineKm } from '../../shared/utils.js';
import { driveUrlToImage } from '../../shared/utils.js';
import { EVENT_CATEGORIES, loadEvents, allEvents } from '../../core/events-data.js';
import { loadMachines, allMachines } from '../../core/machines-data.js';
import { findRelatedMachines, relatedMachineTypesForGroup } from '../../core/event-match.js';
import { createFilterWidget } from '../../ui/filter-widget.js';
import { createSortWidget } from '../../ui/sort-widget.js';
import { initEventsTopBarScroll, resetEventsTopBarScrollState } from './events-scroll.js';  // ✅ 同層，不改
```

**變更數：** 10 個 import

---

### 🔟 `js/pages/events/events-header.js`

**目前的 import：**
```javascript
import { buildLastUpdatedText } from './utils.js';
```

**應該改為：**
```javascript
import { buildLastUpdatedText } from '../../shared/utils.js';
```

**變更數：** 1 個 import

---

### 1️⃣1️⃣ `js/pages/events/events-scroll.js`

**目前的 import：**
```
（無 import，都是 export）
```

**變更數：** 0 個（不用改）

---

## 📊 總結統計

| 檔案 | 需改的 import 數 | 狀態 |
|------|-----------------|------|
| `js/ui/grid.js` | 3 | ⚠️ |
| `js/ui/map.js` | 4 | ⚠️ |
| `js/core/main.js` | 5 | ⚠️ |
| `js/core/event-match.js` | 1 | ⚠️ |
| `js/shared/changelog.js` | 0 | ✅ |
| `js/pages/machines/sort.js` | 4 | ⚠️ |
| `js/pages/machines/filters.js` | 3 | ⚠️ |
| `js/pages/machines/scroll.js` | 0 | ✅ |
| `js/pages/events/events.js` | 10 | ⚠️ |
| `js/pages/events/events-header.js` | 1 | ⚠️ |
| `js/pages/events/events-scroll.js` | 0 | ✅ |

**總共需要更新：31 個 import 語句**

---

## ✅ HTML 進入點檢查

### `app.html`

**需要檢查：**
```html
<script type="module" src="js/main.js"></script>
```

**改為：**
```html
<script type="module" src="js/core/main.js"></script>
```

### `events-app.html`

**需要檢查：**
```html
<script type="module" src="js/events.js"></script>
```

**改為：**
```html
<script type="module" src="js/pages/events/events.js"></script>
```

---

## 🎯 建議做法

### **方案 1: 手動逐項更新（最安全）**
1. 逐個打開上述檔案
2. 按照清單一一修改 import 路徑
3. 保存後在終端測試是否有語法錯誤

### **方案 2: 用 sed 自動替換（有風險）**
```bash
# 範例：替換 js/ui/grid.js 中的 utils.js import
sed -i "s|from './utils.js'|from '../shared/utils.js'|g" js/ui/grid.js

# 測試語法：
node --check js/ui/grid.js
```

### **方案 3: 我幫你生成已修改的檔案**
提供修改好的完整檔案供你驗證後使用

---

## 🔍 驗證方式

改完後，執行這個檢查 import 是否還有問題：

```bash
# 檢查是否還有舊路徑的 import
grep -r "from '\./[^./']\|from '\./\.\./" js/ --include="*.js" 2>/dev/null

# 如果沒有輸出 = ✅ 全部改好了
```

---

**建議你先用方案 1 手動改，我可以逐個幫你檢查。或者要我直接提供改好的檔案嗎？**
