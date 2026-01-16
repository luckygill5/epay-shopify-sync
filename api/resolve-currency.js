import currencyCodes from "currency-codes";
import { CURRENCY_SYMBOLS } from "../lib/currency-symbol.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({ error: "Missing currency" });
    }

    // currency = numeric code from XML (e.g. "356")
    const entry = currencyCodes.number(currency);

    if (!entry) {
      return res.status(404).json({ error: "Currency not found" });
    }

    const iso = entry.code;
    const symbol = CURRENCY_SYMBOLS[iso] || iso;

    return res.json({
      success: true,
      numeric: currency,
      iso,
      symbol,
      name: entry.currency,
      countries: entry.countries,
      digits: entry.digits,
    });

  } catch (err) {
    console.error("resolve-currency error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}
