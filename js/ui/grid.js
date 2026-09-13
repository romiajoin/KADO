// =============================================
// grid.js — 格狀列表渲染 + 排序邏輯（結束日期 / 距離）
// 拆分階段二：這塊算「次獨立」——會讀 sort.js 的 sortState／userCoords，
// 也會呼叫 main.js 的 openGridModal（driveUrlToImage 已搬到 utils.js），
// 但不會回頭呼叫地圖或篩選 UI 的任何東西，依賴方向大致單向。
//
// 註：applyFilters／syncCount／trackFilterResult／handleSearch 這幾個「重新計算＋觸發地圖同步」
// 的協調邏輯，因為牽動 map／sheet 狀態太深，這階段先留在 main.js，之後視情況再決定要不要獨立成
// core.js。
// =============================================

import { getDeviceType, driveUrlToImage, getEndDate, getStartDate, getEndingBadge, haversineKm, MACHINE_TYPE_BADGE_ICON, machineTypeClass, BTN_EXPAND_ICON_SVG, CAROUSEL_CHEVRON_ICON_SVG } from '../shared/utils.js';
import { openGridModal } from '../core/main.js';
import { sortState, userCoords } from '../pages/machines/sort.js';
// getEndingBadge 沿用自 utils.js（events.js 也要用，見 utils.js 開頭的說明），
// 這裡重新 export 一次，main.js 既有的 `import { getEndingBadge } from './grid.js'` 才不用跟著改。
export { getEndingBadge };


    // =============================================
    // 🃏 渲染格狀列表
    // =============================================
    export function renderGrid(data) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      document.getElementById('countBadge').textContent = data.length;

      if (data.length === 0) {
        grid.innerHTML = '<div class="empty-state">找不到符合的地點 இдஇ</div>';
        return;
      }

      data.forEach((loc, i) => {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.city + loc.addr)}`;
        const imgs = loc.image
          ? loc.image.split(',').map(s => driveUrlToImage(s.trim())).filter(Boolean)
          : [];

        const cid = 'grid-c-' + i;
        let imageHtml = '';
        if (imgs.length === 1) {
          imageHtml = `<div class="single-img-wrap"><img src="${imgs[0]}" data-lightbox="${imgs[0]}" loading="lazy" alt="${loc.name}"/></div>`;
        } else if (imgs.length > 1) {
          imageHtml = `
            <div class="carousel-grid" id="${cid}" data-index="0" data-imgs='${JSON.stringify(imgs)}'>
              <div class="carousel-grid-img-wrap">
                <img src="${imgs[0]}" class="carousel-grid-img" data-lightbox="${imgs[0]}" loading="lazy" alt="${loc.name}"/>
              </div>
              <div class="carousel-controls-grid">
                <button class="carousel-btn" data-grid-action="prev" data-grid-cid="${cid}" aria-label="上一張圖片">${CAROUSEL_CHEVRON_ICON_SVG}</button>
                <span class="carousel-counter" style="color:var(--grey)">1 / ${imgs.length}</span>
                <button class="carousel-btn carousel-btn-next" data-grid-action="next" data-grid-cid="${cid}" aria-label="下一張圖片">${CAROUSEL_CHEVRON_ICON_SVG}</button>
              </div>
            </div>`;
        }

        const hasDetail = loc.addr || loc.edition || loc.perDraw || loc.hours || loc.note || imgs.length > 0;
        let detailHtml = '';
        if (loc.addr) detailHtml += `<div class="detail-row"><span class="detail-text">${loc.city}${loc.addr}</span></div>`;
        if (loc.hours) detailHtml += `<div class="detail-row"><span class="detail-text">${loc.hours}</span></div>`;
        if (loc.edition || loc.perDraw) {
          const t = [loc.edition ? `彈數：${loc.edition}` : '', loc.perDraw ? `一抽：${loc.perDraw}張` : ''].filter(Boolean).join('　');
          detailHtml += `<div class="detail-row"><span class="detail-text">${t}</span></div>`;
        }
        if (loc.note) detailHtml += `<div class="detail-row"><span class="detail-text">備註：${loc.note}</span></div>`;
        if (imageHtml) detailHtml += imageHtml;

        const card = document.createElement('div');
        card.className = 'loc-card-grid';
        card.dataset.machineId = loc.id;
        const endingBadge = getEndingBadge(loc.limited);
        card.innerHTML = `
          <div class="card-top">
            <div class="card-badge-row">
            <div class="type-badge ${machineTypeClass(loc.type)}">${MACHINE_TYPE_BADGE_ICON[loc.type] || ''} ${loc.type}</div>
            ${endingBadge ? `<div class="ending-badge">${endingBadge}</div>` : ''}
            </div>
            <div class="card-name">${loc.name}</div>
            ${loc.limited ? `<div class="card-limited">期間限定：${loc.limited}</div>` : ''}
            <div class="card-tags">
              ${loc.character ? `<span class="tag">${loc.character}</span>` : ''}
              ${loc.city ? `<span class="tag">${loc.city}</span>` : ''}
              ${loc.venue ? `<span class="tag">${loc.venue}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <a href="${googleMapsUrl}" target="_blank" class="btn-gmaps" data-gmaps-track data-machine-id="${loc.id}" data-source="grid"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-191q119-107 179.5-197T720-549q0-105-68.5-174T480-792q-103 0-171.5 69T240-549q0 71 60.5 161T480-191Zm-24.5 67.5Q444-128 433-137q-40-35-86.5-82T260-320q-40-54-66-112.5T168-549q0-134 89-224.5T480-864q133 0 222.5 90.5T792-549q0 58-26.5 117t-66 113q-39.5 54-86 100.5T527-137q-11 9-22.5 13.5T480-119q-13 0-24.5-4.5ZM480-552Zm0 164q62-56 88-81t41-44q14-17 20.5-35.5T636-587q0-35-25.5-60.5T550-673q-21 0-40 9t-30 23q-12-14-30.5-23t-39.5-9q-35 0-60.5 25.5T324-587q0 19 6.5 36t20.5 36q16 21 44 48.5t85 78.5Z"/></svg> 在 Google Maps 查看 →</a>
            ${hasDetail ? `<button class="btn-expand" type="button">詳情 ${BTN_EXPAND_ICON_SVG}</button>` : ''}
          </div>
        `;

        if (hasDetail) {
          const openDetail = function() {
            // GA: card_click
            gtag('event', 'card_click', {
              machine_id: loc.id,
              machine_name: loc.name,
              machine_type: loc.type,
              source: 'grid',
              device: getDeviceType(),
            });
            openGridModal(loc, imgs, googleMapsUrl, 'grid_modal');
          };
          // 整張卡片都可以點擊展開詳情，「在 Google Maps 查看」連結是獨立操作，
          // 點擊時要排除掉（不能讓卡片的 click handler 也跟著把詳情彈窗打開）。
          card.classList.add('is-clickable');
          card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-gmaps')) return;
            openDetail();
          });
          const btn = card.querySelector('.btn-expand');
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openDetail();
          });
        }

        grid.appendChild(card);
      });
    }

    // =============================================
    // 🔍 排序邏輯（結束日期 / 距離）
    // getEndDate／getEndingBadge 搬到 utils.js 了（events.js 也需要，理由見 utils.js），
    // 這裡繼續用同一份，行為不變。
    // =============================================

    // haversineKm 搬到 utils.js 了（events.js 拼貼模式的距離排序也需要，理由見該檔案），
    // 這裡繼續 import 那一份，行為不變。
    export function sortLocations(arr) {
      const list = arr.slice();

      if (sortState === 'distance_asc' || sortState === 'distance_desc') {
        if (!userCoords) return list; // 理論上選取距離排序前一定已經拿到座標，這裡是防呆
        list.sort((a, b) => {
          const da = haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
          const db = haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
          return sortState === 'distance_asc' ? da - db : db - da;
        });
        return list;
      }

      // end_date_asc（v35.1 起拿掉 end_date_desc，理由見 CLAUDE.md「排序系統」v35.1 條目）：
      // 分三組，組間優先權固定、不能互相穿插：
      //   1. 進行中（有 limited 且結束日 >= 今天）→ 結束日越快到排越前面
      //   2. 常態機（無 limited）
      //   3. 已過期未下架（有 limited 但結束日 < 今天）→ 排最後，優先權比常態機還低，
      //      這種資料本身該更新卻還沒更新，不該讓它排到常態機前面誤導使用者
      // 組 1、組 3 內部統一用「離今天的天數差絕對值，由小到大」排序——組 1 全部是未來/今天，
      // abs(end-today) 效果等同「結束日越快到排越前面」；組 3 全部是過去，
      // abs(end-today) 效果等同「結束日越接近今天排越前面」，同一條算式套用在兩組都是對的，
      // 不用分別寫兩套邏輯
      if (sortState === 'end_date_asc') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 只比日期，不看時分
        const endDateGroup = (loc) => {
          const end = getEndDate(loc.limited);
          if (!end) return 2; // 常態機
          return end >= today ? 1 : 3; // 進行中 vs 已過期
        };
        list.sort((a, b) => {
          const ga = endDateGroup(a);
          const gb = endDateGroup(b);
          if (ga !== gb) return ga - gb;
          if (ga === 2) return (a.character || '').localeCompare(b.character || '', 'zh-Hant');
          const ea = getEndDate(a.limited);
          const eb = getEndDate(b.limited);
          return Math.abs(ea - today) - Math.abs(eb - today);
        });
        return list;
      }

      // start_date_asc（v35.1 新增）：分三組，組間優先權固定：
      //   1. 已開始（有 limited 且開始日 <= 今天）→ 開始日越新（離今天越近）排越前面
      //   2. 尚未開始（有 limited 但開始日 > 今天）→ 排在組 1 後面，組內依開始日由近到遠排
      //      （越快開始的排越前面，等於「即將登場」），不能混進組 1，不然會被誤判成「最新上架」
      //   3. 常態機（無 limited）→ 排最後
      // 跟結束日排序不同，組 1／組 2 的內部排序方向剛好相反（組 1 是「離今天越近的過去日期」，
      // 組 2 是「離今天越近的未來日期」），不能套用同一條 abs() 算式，分開寫兩支比較不會搞混
      if (sortState === 'start_date_asc') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDateGroup = (loc) => {
          const start = getStartDate(loc.limited);
          if (!start) return 3; // 常態機
          return start <= today ? 1 : 2; // 已開始 vs 尚未開始
        };
        list.sort((a, b) => {
          const ga = startDateGroup(a);
          const gb = startDateGroup(b);
          if (ga !== gb) return ga - gb;
          if (ga === 3) return (a.character || '').localeCompare(b.character || '', 'zh-Hant');
          const sa = getStartDate(a.limited);
          const sb = getStartDate(b.limited);
          return ga === 1 ? sb - sa : sa - sb; // 已開始：新到舊／尚未開始：近到遠
        });
        return list;
      }

      return list;
    }
