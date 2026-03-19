export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  try {
    const { image_url, prompt } = await request.json();
    if (!image_url) return new Response(JSON.stringify({ error: "image_url required" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    const endpoint = "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video";
    const motionPrompt = prompt || "A cat breathing softly, minimal gentle movement, calm and peaceful, warm indoor lighting";
    const submitRes = await fetch("https://queue.fal.run/" + endpoint, {
      method: "POST",
      headers: { "Authorization": "Key " + FAL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: image_url, prompt: motionPrompt }),
    });
    if (!submitRes.ok) {
      const err = await submitRes.text();
      return new Response(JSON.stringify({ error: "fal.ai error: " + err.slice(0, 200) }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
    const data = await submitRes.json();
    return new Response(JSON.stringify({ request_id: data.request_id, status: "QUEUED" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
};
