import { formatPrice, buildProductTitle } from "../lib/epay.js";
import { convertToJpgBase64 } from "../lib/convert-image.js";



/* ============================================================
   HELPERS
============================================================ */

/**
 * Find existing product by epay_id metafield
 */
async function findProductByEpayId({ shop, token, version, epay_id }) {
  const query = `
  {
    products(first: 1, query: "metafield:epay.epay_id=${epay_id}") {
      edges {
        node {
          id
          handle
          variants(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  }`;

  const res = await fetch(
    `https://${shop}/admin/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await res.json();
  const product = data?.data?.products?.edges?.[0]?.node;

  if (!product) return null;

  return {
    product_id: product.id,
    variant_id: product.variants.edges[0].node.id,
    product_handle: product.handle,
  };
}

/* ============================================================
   API HANDLER
============================================================ */

export default async function handler(req, res) {
  // ================== CORS ==================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    /* ================== INPUT ================== */
    const {
      epay_id,
      provider,
      amount,
      shortDesc,
      longDesc,
      image,
    } = req.body;

    if (!epay_id) {
      return res.status(400).json({ error: "Missing epay_id" });
    }

    /* ================== ENV ================== */
    const {
      SHOPIFY_SHOP,
      SHOPIFY_ADMIN_TOKEN,
      SHOPIFY_API_VERSION,
    } = process.env;

    /* ============================================================
       1️⃣ CHECK EXISTING PRODUCT (NO DUPLICATES)
    ============================================================ */
    const existing = await findProductByEpayId({
      shop: SHOPIFY_SHOP,
      token: SHOPIFY_ADMIN_TOKEN,
      version: SHOPIFY_API_VERSION,
      epay_id,
    });

    if (existing) {
      return res.json({
        success: true,
        reused: true,
        ...existing,
      });
    }

    /* ============================================================
       2️⃣ CREATE PRODUCT
    ============================================================ */
    const createRes = await fetch(
      `https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/products.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          product: {
            title: buildProductTitle(epay_id, provider),
            status: "active",
            vendor: provider || "ePay",
            product_type: "Digital",
            body_html: longDesc || shortDesc || "",
            variants: [
              {
                price: formatPrice(amount),
                inventory_management: null,
                requires_shipping: false,
              },
            ],
            metafields: [
              {
                namespace: "epay",
                key: "epay_id",
                type: "single_line_text_field",
                value: epay_id,
              },
            ],
          },
        }),
      }
    );

    const created = await createRes.json();
    if (!createRes.ok) throw created;

    const productId = created.product.id;
    const variantId = created.product.variants[0].id;
    const handle = created.product.handle;
const base64Image = await convertToJpgBase64(image);
console.log("🟣 base64Image length:", base64Image?.length);

    /* ============================================================
       3️⃣ ADD IMAGE (SAFE)
    ============================================================ */
if (image && provider) {
  try{
  await fetch(
    `https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        image: {
          attachment: base64Image,
        },
      }),
    }
  );
  } catch (err) {
    console.error("❌ epay-select failed:", err);
    return res.status(422).json({
      success: false,
      error: "Could not download image",
    });
  }


}


    /* ============================================================
       4️⃣ PUBLISH TO ONLINE STORE
    ============================================================ */
    const pubsRes = await fetch(
      `https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/publications.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        },
      }
    );

    const pubs = await pubsRes.json();
    const onlineStore = pubs.publications.find(
      (p) => p.name === "Online Store"
    );

    await fetch(
      `https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/publications/${onlineStore.id}/publishable_resources.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          publishable_resource: {
            resource_id: productId,
            resource_type: "Product",
          },
        }),
      }
    );

    /* ============================================================
       5️⃣ FINAL RESPONSE
    ============================================================ */
    return res.json({
      success: true,
      created: true,
      product_id: productId,
      variant_id: variantId,
      product_handle: handle,
      processImg : base64Image,
    });

  } catch (err) {
    console.error("❌ epay-select failed:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
    });
  }
}
