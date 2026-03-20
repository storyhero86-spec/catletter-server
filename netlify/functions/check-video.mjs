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
  if (!requestId) return new Response(JSON.stringify({ error: "request_id required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const headers = { "Authorization": "Key " + FAL_KEY, "Accept": "application/json" };
  const endpoint = "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video";
  const urls = [
    "https://queue.fal.run/requests/" + requestId + "/status",
    "https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status",
    "https://rest.alpha.fal.ai/queue/requests/" + requestId + "/status",
  ];
  const results = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers });
      const text = await res.text();
      results.push({ url: u, status: res.status, body: text.slice(0, 200) });
      if (res.status === 200) {
        let data;
        try { data = JSON.parse(text); } catch(e) { continue; }
        if (data.status === "COMPLETED") {
          const resUrl = u.replace("/status", "");
          const resultRes = await fetch(resUrl, { headers });
          if (resultRes.status === 200) {
            const result = await resultRes.json();
            if (result.video && result.video.url) {
              return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video.url }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              });
            }
          }
        }
        if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
          return new Response(JSON.stringify({ status: "IN_PROGRESS" }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        if (data.status === "COMPLETED" && data.response_url) {
          const resultRes = await fetch(data.response_url, { headers });
          const result = await resultRes.json();
          return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video?.url }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }
    } catch(e) {
      results.push({ url: u, error: e.message });
    }
  }
  return new Response(JSON.stringify({ status: "DEBUG", tried: results }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
