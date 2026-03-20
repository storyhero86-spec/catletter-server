export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const url = new URL(request.url);
  const requestId = url.searchParams.get("request_id");
  const statusUrl = url.searchParams.get("status_url");
  const responseUrl = url.searchParams.get("response_url");
  if (!requestId && !statusUrl) return new Response(JSON.stringify({ error: "request_id or status_url required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const headers = { "Authorization": "Key " + FAL_KEY };
  const endpoint = "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video";
  const results = [];
  const tryUrls = [];
  if (statusUrl) tryUrls.push({ url: statusUrl, method: "GET" });
  tryUrls.push({ url: "https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status", method: "POST" });
  tryUrls.push({ url: "https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status", method: "GET" });
  tryUrls.push({ url: "https://queue.fal.run/" + endpoint + "/requests/" + requestId, method: "GET" });
  for (const t of tryUrls) {
    try {
      const res = await fetch(t.url, { method: t.method, headers });
      const text = await res.text();
      results.push({ url: t.url, method: t.method, status: res.status, body: text.slice(0, 300) });
      if (res.status === 200) {
        let data;
        try { data = JSON.parse(text); } catch(e) { continue; }
        if (data.video && data.video.url) {
          return new Response(JSON.stringify({ status: "COMPLETED", video_url: data.video.url }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        if (data.status === "COMPLETED" && responseUrl) {
          const rr = await fetch(responseUrl, { headers });
          const rd = await rr.json();
          if (rd.video && rd.video.url) {
            return new Response(JSON.stringify({ status: "COMPLETED", video_url: rd.video.url }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
        }
        if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS" || data.status === "QUEUED") {
          return new Response(JSON.stringify({ status: "IN_PROGRESS" }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }
      if (res.status === 202) {
        return new Response(JSON.stringify({ status: "IN_PROGRESS" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    } catch(e) {
      results.push({ url: t.url, method: t.method, error: e.message });
    }
  }
  return new Response(JSON.stringify({ status: "DEBUG", tried: results }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
