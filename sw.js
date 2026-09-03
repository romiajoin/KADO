// Card Radar TW - Service Worker（PWA 功能已停用）
//
// 這個檔案不能直接刪掉：已經安裝過 PWA 的舊使用者裝置上還留著舊版 sw.js
// 在背景運作，瀏覽器下次連上網路檢查更新時，會抓到「這個新版」sw.js。
// 新版做的事：清空所有舊快取（包含離線資料／圖片快取）、把自己卸載掉，
// 讓已安裝的使用者之後都直接走一般網路請求，不會再套用舊的離線快取邏輯，
// 也不會卡在過期內容看不到更新。
//
// 之後如果想重新啟用 PWA，把這次移除前的版本從 git 歷史復原回來即可
// （連同 app.html／events.html 裡的 manifest 連結、apple-mobile-web-app
// meta tag、以及 js/main.js 裡搬出去的 Service Worker 註冊那段一起復原）。

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();

      // 讓目前開著的分頁（如果剛好是已安裝的 PWA 視窗）重新整理一次，
      // 之後就是普通網頁請求，不會再有這個 service worker 攔截。
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
