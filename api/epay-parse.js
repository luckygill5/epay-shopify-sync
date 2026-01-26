import XMLParser from "react-xml-parser";

export default async function handler(req, res) {
  try {
    const xml = req.body?.xml;
    if (!xml) {
      return res.status(400).json({ error: "Missing XML" });
    }

    // ✅ React XML parser (lenient)
    const parsed = new XMLParser().parseFromString(xml);

    // const articles = parsed.getElementsByTagName("ARTICLE");
    // const products = [];

    // for (const article of articles) {
    //   const get = (tag) =>
    //     article.getElementsByTagName(tag)?.[0]?.value || "";

    //   const infosJsonNode =
    //     article.getElementsByTagName("INFOSJSON")?.[0]?.value;

    //   let info = null;

    //   if (infosJsonNode) {
    //     try {
    //       const parsedInfo = JSON.parse(infosJsonNode);
    //       info = parsedInfo.en || null;
    //     } catch {}
    //   }

    //   if (!info?.BRAND?.[0] || !info?.DISPLAY_NAME?.[0]) continue;

    //   const tech = info.TECHNICAL_INFORMATION?.[0] || "";
    //   const category =
    //     tech.match(/PRODUCTCATEGORY=([^,]+)/)?.[1] || "Others";

    //   products.push({
    //     name: info.DISPLAY_NAME[0],
    //     provider: info.BRAND[0],
    //     category,
    //     amount: get("AMOUNT"),
    //     currency: article.getElementsByTagName("AMOUNT")?.[0]?.attributes?.CURRENCY || "",
    //     image:
    //       get("PROVIDER_LOGO") ||
    //       get("ARTICLE_IMAGE") ||
    //       get("LOGO"),
    //     shortDesc: info.DESCRIPTION_SHORT?.[0] || "",
    //     longDesc: info.DESCRIPTION_LONG?.[0] || "",
    //   });
    // }

    return res.status(200).json({
      success: true,
      // count: products.length,
      // products,
      parsed
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to parse XML",
      message: err.message,
    });
  }
}
