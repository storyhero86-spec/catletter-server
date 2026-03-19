export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  try {
    const { image_base64 } = await request.json();
    if (!image_base64) return new Response(JSON.stringify({ error: "image_base64 required" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const contentType = image_base64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    const uploadRes = await fetch("https://fal.run/fal-ai/any/upload", {
      method: "POST",
      headers: { "Authorization": "Key " + FAL_KEY, "Content-Type": contentType },
      body: bytes,
    });
    if (uploadRes.ok) {
      const data = await uploadRes.json();
      const url = data.url || data.file_url || data.access_url;
      if (url) return new Response(JSON.stringify({ image_url: url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    return new Response(JSON.stringify({ image_url: image_base64 }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
};
