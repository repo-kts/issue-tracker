"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction, verifyPaymentAction } from "./actions";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PayButton({ slug, amountPaise }: { slug: string; amountPaise: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePay = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadRazorpayScript();
      const order = await createOrderAction(slug, amountPaise);

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        order_id: order.orderId,
        name: order.projectName,
        description: "1 additional iteration",
        prefill: { name: order.clientName },
        theme: { color: "#f97316" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPaymentAction({
              slug,
              paymentId: order.paymentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(`/p/${slug}?submitted=0&paid=1`);
            router.refresh();
          } catch (e) {
            setError("Payment captured but verification failed. Contact support.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message ?? "Could not start payment");
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={handlePay} disabled={busy} className="btn-primary w-full">
        {busy ? "Processing…" : "Pay with Razorpay →"}
      </button>
      {error && (
        <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}
