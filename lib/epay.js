/**
 * Normalize epay price
 * Input: amount in paise (number or string)
 * Output: string price in rupees (e.g. "95.00")
 */
export function formatPrice(amount) {
  const value = Number(amount);

  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Invalid epay amount: ${amount}`);
  }

  return (value / 100).toFixed(2);
}

/**
 * Build a stable, duplicate-safe product title
 */
export function buildProductTitle(epay_id, provider) {
  if (!epay_id) {
    throw new Error("Missing epay_id for product title");
  }

  const safeProvider = (provider || "ePay")
    .toString()
    .trim()
    .toUpperCase();

  const safeEpayId = epay_id.toString().trim();

  return `${safeProvider} - ${safeEpayId}`;
}
