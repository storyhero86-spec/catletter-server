export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  let statusUrl, responseUrl;
  if (request.method === "POST") {
    const body = await request.json();
    statusUrl = body.status_url;
    responseUrl = body.response_url;
  } else {
    const url = new URL(request.url);
    statusUrl = url.searchParams.get("status_url");
    responseUrl = url.searchParams.get("response_url");
  }
  if (!statusUrl) return new Response(JSON.stringify({ error: "status_url required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const headers = { "Authorization": "Key " + FAL_KEY };
  try {
    const statusRes = await fetch(statusUrl, { headers });
    const statusData = await statusRes.json();
    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl || statusUrl.replace("/status", ""), { headers });
      const result = await resultRes.json();
      return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video?.url }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (statusData.status === "IN_QUEUE" || statusData.status === "IN_PROGRESS") {
      return new Response(JSON.stringify({ status: "IN_PROGRESS", queue_position: statusData.queue_position }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (statusData.status === "FAILED") {
      return new Response(JSON.stringify({ status: "FAILED", error: statusData.error }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    return new Response(JSON.stringify({ status: statusData.status || "UNKNOWN", raw: statusData }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "check error: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
