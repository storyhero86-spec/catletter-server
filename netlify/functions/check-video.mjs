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
    const resultRes = await fetch("https://queue.fal.run/" + endpoint + "/requests/" + requestId, {
      method: "GET",
      headers: { "Authorization": "Key " + FAL_KEY },
    });
    if (resultRes.status === 200) {
      const result = await resultRes.json();
      if (result.video && result.video.url) {
        return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video.url }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }
    if (resultRes.status === 202) {
      return new Response(JSON.stringify({ status: "IN_PROGRESS" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const bodyText = await resultRes.text();
    return new Response(JSON.stringify({ status: "WAITING", httpStatus: resultRes.status, body: bodyText.slice(0, 300) }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "check error: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
