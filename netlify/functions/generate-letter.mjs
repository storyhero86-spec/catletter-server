export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  if (request.method === "GET") {
    const hasKey = !!Netlify.env.get("ANTHROPIC_API_KEY");
    return new Response(JSON.stringify({ status: "ok", hasApiKey: hasKey }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  let body;
  try { body = await request.json(); } catch(e) {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
  const { prompt } = body;
  if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: "Claude error: " + (data.error?.message || res.status) }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    const text = (data.content || []).map((b) => b.text || "").join("");
    return new Response(JSON.stringify({ letter: text }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "fetch error: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
```

4. **Commit changes** 클릭

---

## 배포 후 확인

1~2분 대기 후 브라우저에서:
```
https://sage-pie-4d1233.netlify.app/.netlify/functions/generate-letter
