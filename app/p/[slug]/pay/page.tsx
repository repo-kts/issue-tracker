import Link from "next/link";
import { notFound } from "next/navigation";
import { getIterationStatus, getProjectBySlug } from "@/lib/projects";
import { formatINR, PRICE_PER_EXTRA_ITERATION_PAISE } from "@/lib/config";
import { razorpayConfigured } from "@/lib/razorpay";
import { PayButton } from "./pay-button";

export default async function PayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const status = await getIterationStatus(project.id);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href={`/p/${slug}`} className="mb-6 inline-block text-sm text-muted hover:text-text">
        ← Back to project
      </Link>

      <div className="card border-accent/40 p-8">
        <div className="mb-1 text-xs uppercase tracking-wide text-accent">Unlock more iterations</div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          You've used all {status.totalAllowed} iterations for {project.name}.
        </h1>
        <p className="mb-6 text-sm text-muted">
          Each extra iteration is {formatINR(PRICE_PER_EXTRA_ITERATION_PAISE)}. Pay below and
          you can submit one more change request immediately.
        </p>

        <div className="mb-6 rounded-md border border-border bg-[#17171b] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted">1 additional iteration</span>
            <span className="font-medium">{formatINR(PRICE_PER_EXTRA_ITERATION_PAISE)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
            <span>Total</span>
            <span className="font-semibold">{formatINR(PRICE_PER_EXTRA_ITERATION_PAISE)}</span>
          </div>
        </div>

        {razorpayConfigured ? (
          <PayButton slug={slug} amountPaise={PRICE_PER_EXTRA_ITERATION_PAISE} />
        ) : (
          <div className="rounded-md border border-orange-400/40 bg-orange-400/10 p-4 text-sm">
            <div className="mb-1 font-medium text-orange-300">Payment not yet configured</div>
            <p className="text-muted">
              Razorpay keys aren't set up yet. The agency owner needs to add{" "}
              <code className="font-mono text-orange-300">RAZORPAY_KEY_ID</code> and{" "}
              <code className="font-mono text-orange-300">RAZORPAY_KEY_SECRET</code> to{" "}
              <code className="font-mono text-orange-300">.env.local</code>. In the meantime
              the owner can grant additional iterations manually.
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-muted">
          Powered by Razorpay · Test mode payments use card 4111 1111 1111 1111.
        </p>
      </div>
    </div>
  );
}
