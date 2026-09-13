// =============================================
// permanent-id.gs — 給 Google Sheet 用的 Apps Script
//
// 用途：新增一列資料時，自動在「永久ID」欄補上一個不會重複、
// 永遠不會被人手動改動的識別碼（格式：yyyyMMdd-HHmmss-列號）。
//
// 支援多個分頁，各分頁可以有不同的「檢查欄」「永久ID欄」「標題列位置」。
// 要再加新分頁時，只要在下面 SHEET_CONFIGS 陣列多加一組設定即可，
// 不用重新裝 trigger。
//
// ⚠️ 這支腳本本身不在這個 repo 的 push.sh 流程裡——是純手動貼到
// Google Sheet「擴充功能 → Apps Script」編輯器裡設定的，這裡留一份
// 只是方便日後對照／改動時有版本可查，不會隨網站部署一起生效。
// 貼上/改完後記得手動執行一次 setupTrigger()（重建 onEdit trigger），
// 新增分頁或現有資料缺永久ID時再手動執行一次 backfillExistingRows()。
// =============================================

// ==== 設定區：每個分頁一組設定 ====
const SHEET_CONFIGS = [
  {
    name: '抽卡 / 相卡',   // 分頁名稱
    checkCol: 3,           // 用來判斷「這一列是不是有效資料列」的欄位（C = 店名）
    permIdCol: 17,          // 「永久ID」欄的欄位編號（Q）
    headerRow: 1,           // 標題列所在列數
  },
  {
    name: '活動',
    checkCol: 3,             // C 欄（活動標題）
    permIdCol: 15,           // O 欄
    headerRow: 2,
  },
];

// =============================================
// 產生永久ID：時間戳記 + 列號，兩層保證不會撞號
// =============================================
function generatePermanentId(row) {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const ts = Utilities.formatDate(now, tz, 'yyyyMMdd-HHmmss');
  return `${ts}-${row}`;
}

// =============================================
// 每次編輯觸發：先找出這次編輯的分頁對應哪一組設定，
// 找不到（不是我們要處理的分頁）就直接結束
// =============================================
function onSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const config = SHEET_CONFIGS.find(c => c.name === sheet.getName());
  if (!config) return; // 這次編輯的分頁不在監控清單裡

  processEditedRange(sheet, config, e.range.getRow(), e.range.getNumRows());
}

// =============================================
// 共用邏輯：檢查指定列範圍，該補永久ID的就補上
// =============================================
function processEditedRange(sheet, config, startRow, numRows) {
  const { checkCol, permIdCol, headerRow } = config;

  for (let r = startRow; r < startRow + numRows; r++) {
    if (r <= headerRow) continue; // 跳過標題列

    const checkCell = sheet.getRange(r, checkCol);
    const permIdCell = sheet.getRange(r, permIdCol);

    const hasContent = checkCell.getValue().toString().trim() !== '';
    const hasPermId = permIdCell.getValue().toString().trim() !== '';

    // 只在「有資料但還沒有永久ID」時才補，已存在的永久ID絕對不覆寫
    if (hasContent && !hasPermId) {
      permIdCell.setValue(generatePermanentId(r));
    }
  }
}

// =============================================
// 一次性設定：建立 installable trigger（跟之前一樣，只要一個）
// =============================================
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSheetEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log('Trigger 建立完成，之後在監控清單內的分頁新增資料會自動補永久ID。');
}

// =============================================
// 一次性：幫所有設定裡的分頁，補上現有資料缺少的永久ID
// =============================================
function backfillExistingRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  SHEET_CONFIGS.forEach(config => {
    const sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      Logger.log(`找不到分頁「${config.name}」，略過`);
      return;
    }
    const lastRow = sheet.getLastRow();
    let count = 0;
    for (let r = config.headerRow + 1; r <= lastRow; r++) {
      const checkCell = sheet.getRange(r, config.checkCol);
      const permIdCell = sheet.getRange(r, config.permIdCol);

      const hasContent = checkCell.getValue().toString().trim() !== '';
      const hasPermId = permIdCell.getValue().toString().trim() !== '';

      if (hasContent && !hasPermId) {
        permIdCell.setValue(generatePermanentId(r));
        count++;
      }
    }
    Logger.log(`「${config.name}」補上永久ID完成，共處理 ${count} 列。`);
  });
}
