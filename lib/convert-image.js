import sharp from "sharp";

export async function convertToJpgBase64(imageUrl) {
  console.log("🔵 convertToJpgBase64 START");
  console.log("🔵 imageUrl:", imageUrl);

  const res = await fetch(imageUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/*,*/*",
    },
  });

  console.log("🟡 fetch status:", res.status);
  console.log("🟡 fetch content-type:", res.headers.get("content-type"));

  if (!res.ok) {
    throw new Error(`Image download failed: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  console.log("🟢 arrayBuffer byteLength:", arrayBuffer.byteLength);

  const buffer = Buffer.from(arrayBuffer);
  console.log("🟢 buffer length:", buffer.length);

  const jpgBuffer = await sharp(buffer)
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log("🟢 jpgBuffer length:", jpgBuffer.length);

  const base64 = jpgBuffer.toString("base64");
  console.log("🟢 base64 length:", base64.length);

  return base64;
}
