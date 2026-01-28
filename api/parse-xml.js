import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    let xml = "";

    await new Promise((resolve, reject) => {
      req.on("data", c => (xml += c.toString()));
      req.on("end", resolve);
      req.on("error", reject);
    });

    // 🔴 IMPORTANT: DO NOT transform structure
    // Just return original XML exactly as received

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end(xml);

  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml");
    res.end(`<ERROR>${e.message}</ERROR>`);
  }
}
