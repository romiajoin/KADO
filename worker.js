// =============================================
// 👣 訪客計數 Worker（Cloudflare Workers + KV）
// 完全自己控制的訪客計數服務，不依賴任何第三方 API。
// =============================================

export default {
  async fetch(request, env) {
    // 允許跨網域呼叫（你的網站前端會用瀏覽器直接打這支 API）
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 瀏覽器的預檢請求，直接回空回應
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

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
