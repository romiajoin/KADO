// =============================================
// 👣 訪客計數 + 📣 機台狀態回報 Worker（Cloudflare Workers + KV）
// 完全自己控制的訪客計數服務，不依賴任何第三方 API。
// 機台回報是同一支 worker 多加一條路徑，共用同一個 KV namespace（VISITOR_KV），
// key 加 "report:" 前綴跟訪客計數的 "count" 分開，不用另外申請 namespace。
// =============================================

// 分享連結網址的來源網域，跟 api/index.js／api/share.js 的 SITE_URL 是同一份，各自獨立宣告
// （這支是 Cloudflare Worker，跟 Vercel serverless function 沒有共用的地方可以 import）
const SITE_URL = 'https://kadotw.vercel.app';

// 機台狀態回報：收到後打一次 Discord webhook 通知（env.DISCORD_WEBHOOK_URL，
// 用 `wrangler secret put DISCORD_WEBHOOK_URL` 設定，不寫進這支檔案或 wrangler.toml）。
// 通知失敗（webhook 網址還沒設定、Discord 那邊出狀況等）不擋這次回報本身，
// KV 計數已經寫入就當作成功，只是少一則通知，之後開 KV 也查得到。
// 改用 embed 格式而不是純文字：可以附機台類型／場地等多個欄位、標題還能做成可點擊連結，
// 直接跳回這台機台在網站上的詳情頁（用跟「分享」按鈕同一套 permId 永久連結機制）。
async function notifyDiscord(env, payload) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const isGone = payload.type === 'gone';
  const title = payload.machineName || '(未命名機台)';
  const permaUrl = payload.permId ? `${SITE_URL}/api/share?id=${encodeURIComponent(payload.permId)}` : undefined;
  const fields = [
    { name: '狀態', value: isGone ? '❌ 不在了' : '✅ 還在', inline: true },
    { name: '類型', value: payload.machineType || '未知', inline: true },
    { name: '來源', value: payload.source || '未知', inline: true },
    { name: '累計', value: `還在 ${payload.still}／不在 ${payload.gone}`, inline: true },
  ];
  if (payload.character) fields.push({ name: '作品', value: payload.character, inline: true });
  if (payload.edition) fields.push({ name: '系列', value: payload.edition, inline: true });
  if (payload.venue) fields.push({ name: '場地', value: payload.venue, inline: true });
  const embed = {
    title,
    url: permaUrl, // 沒有 permId 時 title 就不是連結，純文字顯示
    color: isGone ? 0xDC2626 : 0x16A34A, // 跟 --fill-red／--fill-green 同一組色碼
    fields,
  };
  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (e) {
    // 靜默失敗，見上面註解
  }
}

async function handleReport(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const machineId = (body.machineId || '').toString().trim();
  const type = body.type === 'gone' ? 'gone' : (body.type === 'still' ? 'still' : null);
  if (!machineId || !type) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const machineName = (body.machineName || '').toString().slice(0, 200);
  const source = (body.source || '').toString().slice(0, 100);
  const permId = (body.permId || '').toString().trim();
  const venue = (body.venue || '').toString().slice(0, 200);
  const machineType = (body.machineType || '').toString().slice(0, 50);
  const character = (body.character || '').toString().slice(0, 200);
  const edition = (body.edition || '').toString().slice(0, 200);

  const key = `report:${machineId}`;
  const existing = JSON.parse((await env.VISITOR_KV.get(key)) || '{}');
  const record = {
    name: machineName || existing.name || '',
    still: (existing.still || 0) + (type === 'still' ? 1 : 0),
    gone: (existing.gone || 0) + (type === 'gone' ? 1 : 0),
    lastType: type,
    lastSource: source,
    lastAt: new Date().toISOString(),
  };
  await env.VISITOR_KV.put(key, JSON.stringify(record));

  await notifyDiscord(env, { machineId, machineName: record.name, type, source, still: record.still, gone: record.gone, permId, venue, machineType, character, edition });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    // 允許跨網域呼叫（你的網站前端會用瀏覽器直接打這支 API）
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 瀏覽器的預檢請求，直接回空回應
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /report → 機台「還在／不在了」一鍵回報，見上面 handleReport()
    if (url.pathname === "/report" && request.method === "POST") {
      return handleReport(request, env, corsHeaders);
    }

    // /reset?value=2000&secret=xxx  → 手動把數字設成特定值（僅限你自己使用）
    if (url.pathname === "/reset") {
      const providedSecret = url.searchParams.get("secret");
      if (providedSecret !== env.RESET_SECRET) {
        return new Response(
          JSON.stringify({ error: "unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const value = parseInt(url.searchParams.get("value") ?? "0", 10);
      await env.VISITOR_KV.put("count", String(value));
      return new Response(
        JSON.stringify({ count: value }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 明顯的機器人／測速工具（Lighthouse、PageSpeed、爬蟲等）只讀不寫，
    // 不讓它們吃掉 KV 免費額度的「寫入」次數（免費版每天只有約 1,000 次寫入）。
    // 一般訪客每次載入都 +1；也保留 /?peek=1 當作手動唯讀查詢用。
    const ua = request.headers.get("User-Agent") || "";
    const isBot = /bot|crawl|spider|slurp|lighthouse|pagespeed|gtmetrix|headless|prerender|monitor/i.test(ua);
    // 只有從正式站（SITE_URL）發出的請求才 +1：瀏覽器跨網域 fetch 一定會帶 Origin，
    // 直接打這支 Worker 網址的腳本／掃描器通常不帶，Vercel 預覽網址、區網 IP 測試的 Origin 也不同。
    // 2026-11-26 曾有兩波共約 1,200 次、幾乎全來自 HKG 節點的請求把 KV 每日寫入額度用完，
    // 加上這道檢查後這類請求只讀不寫（照樣回傳人數，不回錯誤）。
    // ⚠️ 之後若換自訂網域，要記得一起改 SITE_URL（或加進這裡的允許清單），否則正式訪客不會被計數。
    const isSiteOrigin = request.headers.get("Origin") === SITE_URL;
    if (url.searchParams.get("peek") === "1" || isBot || !isSiteOrigin) {
      const count = parseInt((await env.VISITOR_KV.get("count")) ?? "0", 10);
      return new Response(
        JSON.stringify({ count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } }
      );
    }

    // /  → 累加 +1 並回傳目前數字（正常訪客計數用這個）
    const current = parseInt((await env.VISITOR_KV.get("count")) ?? "0", 10);
    const next = current + 1;
    await env.VISITOR_KV.put("count", String(next));

    return new Response(
      JSON.stringify({ count: next }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  },
};
