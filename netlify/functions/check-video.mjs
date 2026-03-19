export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  const url = new URL(request.url);
  const requestId = url.searchParams.get("request_id");
  if (!requestId) return new Response(JSON.stringify({ error: "request_id required" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  const endpoint = "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video";
  try {
    const statusRes = await fetch("https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status", {
      headers: { "Authorization": "Key " + FAL_KEY },
    });
    if (!statusRes.ok) return new Response(JSON.stringify({ status: "CHECKING" }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    const st = await statusRes.json();
    if (st.status === "COMPLETED") {
      const resultRes = await fetch("https://queue.fal.run/" + endpoint + "/requests/" + requestId, {
        headers: { "Authorization": "Key " + FAL_KEY },
      });
      const result = await resultRes.json();
      return new Response(JSON.stringify({ status: "COMPLETED", video_url: result.video?.url }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (st.status === "FAILED") {
      return new Response(JSON.stringify({ status: "FAILED" }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    return new Response(JSON.stringify({ status: st.status || "IN_PROGRESS" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
};
```
→ Commit changes

---

## 완성 후 체크

GitHub 루트에서 이렇게 보여야 합니다:
```
README.md
netlify.toml
public/
netlify/
