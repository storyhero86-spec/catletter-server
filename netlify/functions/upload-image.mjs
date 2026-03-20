export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }
  const FAL_KEY = Netlify.env.get("FAL_API_KEY");
  if (!FAL_KEY) return new Response(JSON.stringify({ error: "FAL_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  try {
    const { image_base64 } = await request.json();
    if (!image_base64) return new Response(JSON.stringify({ error: "image_base64 required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const contentType = image_base64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    const ext = contentType === "image/png" ? "png" : "jpg";
    const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
      method: "POST",
      headers: { "Authorization": "Key " + FAL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: "cat." + ext }),
    });
    if (initRes.ok) {
      const initData = await initRes.json();
      await fetch(initData.upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: bytes });
      return new Response(JSON.stringify({ image_url: initData.file_url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    const directRes = await fetch("https://fal.ai/api/storage/upload", {
      method: "POST",
      headers: { "Authorization": "Key " + FAL_KEY, "Content-Type": contentType },
      body: bytes,
    });
    if (directRes.ok) {
      const directData = await directRes.json();
      const url = directData.url || directData.file_url || directData.access_url;
      if (url) return new Response(JSON.stringify({ image_url: url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    return new Response(JSON.stringify({ error: "upload failed: " + initRes.status }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "upload error: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
