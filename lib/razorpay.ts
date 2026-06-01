import "server-only";
import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export const razorpayConfigured = Boolean(KEY_ID && KEY_SECRET);

type CreateOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  if (!razorpayConfigured) throw new Error("Razorpay not configured");
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Razorpay order creation failed: ${res.status} ${t}`);
  }
  return (await res.json()) as CreateOrderResponse;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
