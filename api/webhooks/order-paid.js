import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";

  function getTimeStamp() {

  var date = new Date().getDate(); 
  console.log(date);
  date = (date < 10 ? '0' : '') + date;
  var month = new Date().getMonth() + 1; 
  month = (month < 10 ? '0' : '') + month;
  var year = new Date().getFullYear();   
  var hours = new Date().getHours(); 
  hours = (hours < 10 ? '0' : '') + hours;
  var min = new Date().getMinutes(); 
  min = (min < 10 ? '0' : '') + min;
  var sec = new Date().getSeconds(); 
  sec = (sec < 10 ? '0' : '') + sec;

  console.log(sec);
  var timeStamp = year + month + date
    + hours + min + sec;


  return timeStamp;

}


function getDateTimeFormat (){
  let date =  new Date().toISOString().slice(0, 10);
  let time  = new Date().toLocaleTimeString().replace(' AM', '').replace(' PM', '');
  console.log('timedata',  date+" "+time)
  return date+" "+time
}


function formatEpayAmount(amount) {
  const value = Number(amount);

  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Invalid epay amount: ${amount}`);
  }

  // If Shopify gives 100.00 → convert to 10000
  return Math.round(value * 100).toString();
}

/* -------------------------------------------------
   1️⃣ Read RAW body (Shopify webhook requirement)
-------------------------------------------------- */
function getRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/* -------------------------------------------------
   2️⃣ Verify Shopify HMAC
-------------------------------------------------- */
function verifyWebhook(rawBody, hmacHeader) {
  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("base64");

  return digest === hmacHeader;
}

/* -------------------------------------------------
   3️⃣ Call ePay SALE API
-------------------------------------------------- */
async function callEpaySale(orderId, amount, ean) {

  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<REQUEST TYPE="SALE" STORERECEIPT="0">
<AMOUNT>${formatEpayAmount(amount)}</AMOUNT>
<CARD>
<EAN>${ean}</EAN>
</CARD>
<COMMENT>CASHIERID=manager</COMMENT>
<EXTRADATA>
<DATA name="CONTRACT">Sale_93889311_${getTimeStamp()}</DATA>
</EXTRADATA>
<LOCALDATETIME>${getDateTimeFormat()}</LOCALDATETIME>
<PASSWORD>028eb6be0b280853</PASSWORD>
<RECEIPT>
<CHARSPERLINE>38</CHARSPERLINE>
<LANGUAGE>eng</LANGUAGE>
<LINES>40</LINES>
</RECEIPT>
<TERMINALID>93889311</TERMINALID>
<TXID>Sale_93889311_${getTimeStamp()}</TXID>
<USERNAME>UPTest_93889311</USERNAME>
</REQUEST>`;

console.log("xmlPayload--", xmlPayload)

const response = await fetch(
  "https://precision.epayworldwide.com/up-interface/",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Accept": "application/xml",
      "Connection": "close"
    },
    body: xmlPayload.trim()
  }
);

const text = await response.text();
console.log("🟢 ePay Raw XML:", text);


  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const json = parser.parse(text);

  console.log("🟢 ePay Parsed JSON:", json);

  return json;
}
/* -------------------------------------------------
   3️⃣ Save ePay result to ORDER metafield
-------------------------------------------------- */
async function saveEpayToOrder(orderId, epayData) {
  const mutation = `
    mutation SetEpayMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: `gid://shopify/Order/${orderId}`,
        namespace: "epay",
        key: "result",
        type: "json",
        value: JSON.stringify(epayData),
      },
    ],
  };

  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2026-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    }
  );

  const json = await response.json();

    console.log("✅ ePay metafield saved on order", json);

  if (json.data?.metafieldsSet?.userErrors?.length) {
    console.error("❌ Metafield errors:", json.data.metafieldsSet.userErrors);
    throw new Error("Failed to save metafield");
  }


}

/* -------------------------------------------------
   4️⃣ Webhook handler
-------------------------------------------------- */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = await getRawBody(req);
  const hmac = req.headers["x-shopify-hmac-sha256"];

  if (!verifyWebhook(rawBody, hmac)) {
    return res.status(401).send("Invalid webhook");
  }

  const order = JSON.parse(rawBody.toString());
  const orderId = order.id;

  const amount = order?.line_items[0]?.price;
  const ean = order?.line_items[0]?.sku;

  console.log("🟢 ORDER DATA:", order);
  console.log("🟢 ORDER PAID:", orderId);
  console.log("🟢 amount Data:", amount, ean);


  /* -------------------------------------------------
     5️⃣ REAL ePay response (example)
  -------------------------------------------------- */

//   const epayResponse =  {
//   "success": true,
//   "provider": "epay",
//   "type": "SALE",
//   "terminalId": "93889617",
//   "transaction": {
//     "txId": "Sale_93889617_20260129030413",
//     "hostTxId": "Sale_93889617_20260129030413",
//     "localDateTime": "2026-01-29 15:04:13",
//     "serverDateTime": "2026-01-29 09:34:22",
//     "amount": 6500,
//     "currency": "OMR",
//     "limit": 993500,
//     "resultCode": 0,
//     "resultText": "transaction successful"
//   },
//   "product": {
//     "name": "Xbox Live Gift Card - 15 USD",
//     "brand": "Microsoft Xbox (Oman)"
//   },
//   "pinCredentials": {
//     "pin": "56Q08-CWXY5-71A34-68B44-3WE18",
//     "serial": "70260129103422192166",
//     "validTo": "3000-01-01 00:00:00"
//   },
//   "receiptLines": [
//     "Microsoft Xbox (Oman)",
//     "Xbox Live Gift Card - 15 USD",
//     "TerminalID: 93889617",
//     "OMR 6.500",
//     "Time: 2026-01-29 13:34:22",
//     "Serial number: 70260129103422192166",
//     "Code: 56Q08-CWXY5-71A34-68B44-3WE18"
//   ]
// }

//   console.log("saveepayData--", orderId, epayResponse)

  try {
    // 1️⃣ Call ePay
    const epayResponse = await callEpaySale(orderId, amount, ean);
    console.log("epayResponse--", epayResponse)

    // 2️⃣ Save to Shopify
    await saveEpayToOrder(orderId, epayResponse);

  } catch (error) {
    console.error("❌ ePay error:", error);
  }
  // await saveEpayToOrder(orderId, epayResponse);

  res.status(200).send("OK");
}
