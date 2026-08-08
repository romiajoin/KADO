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
    document.getElementById('visitorBanner').style.display = 'flex';
  } catch (e) {
    // API 失敗時靜默隱藏 banner
  }
}
loadVisitorCount();
