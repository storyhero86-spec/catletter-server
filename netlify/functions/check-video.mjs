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
  const endpoint = "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video";
  try {
    const statusUrl = "https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status";
    const statusRes = await fetch(statusUrl, {
      headers: { "Authorization": "Key " + FAL_KEY },
    });
    const statusText = await statusRes.text();
    let st;
    try { st = JSON.parse(statusText); } catch(e) {
      return new Response(JSON.stringify({ status: "PARSE_ERROR", httpStatus: statusRes.status, body: statusText.slice(0, 300) }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    if (st.status === "COMPLETED") {
      const resultRes = await fetch("https://queue.fal.run/" + endpoint + "/requests/" + requestId, {
        headers: { "Authorization": "Key " + FAL_KEY },
      });
      const result = await resultRes.json();
      return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video?.url }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    return new Response(JSON.stringify({ status: st.status || "UNKNOWN", httpStatus: statusRes.status, raw: st }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "check error: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
