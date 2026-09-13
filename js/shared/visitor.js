// =============================================
// 👣 訪客計數
// 完全獨立的小功能：只讀寫自己的兩個 DOM 元素，不跟其他模組共享任何狀態。
// 使用自己架設的 Cloudflare Worker + KV，不依賴任何第三方訪客計數服務。
// =============================================
async function loadVisitorCount() {
  try {
    // TODO: 部署 Worker 後，把下面網址換成你自己的 Worker 網址
    // 例如 https://visitor-counter.你的子網域.workers.dev/
    const res = await fetch('https://visitor-counter.gillsponge-601.workers.dev/');
    const data = await res.json();
    document.getElementById('visitorCount').textContent = data.count.toLocaleString('zh-TW');
    // 一開始就用 visibility:hidden 保留版面高度（見 style.css 的 .visitor-banner），
    // 抓到人數後只切換成可見，不再讓 banner 從無到有改變 #topBar 高度
    document.getElementById('visitorBanner').style.visibility = 'visible';
  } catch (e) {
    // API 失敗時整個收起（display:none），不佔用版面空間
    document.getElementById('visitorBanner').style.display = 'none';
  }
}
loadVisitorCount();
