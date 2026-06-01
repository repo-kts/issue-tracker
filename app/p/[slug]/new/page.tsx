import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getIterationStatus, getProjectBySlug } from "@/lib/projects";
import { SubmitIssueForm } from "../submit-issue-form";

export default async function NewIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const status = await getIterationStatus(project.id);

  if (status.needsPayment) redirect(`/p/${slug}/pay`);

  const freeLeft = Math.max(0, project.freeIterationLimit - status.iterationsUsed);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/p/${slug}`} className="mb-4 inline-block text-xs text-muted hover:text-text">
        ← Back to dashboard
      </Link>

      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Submit a change request</h1>
      <p className="mb-6 text-sm text-muted">
        {status.isOverFreeLimit ? (
          <>
            This will use 1 of your <strong className="text-text">{status.paidIterations}</strong>{" "}
            paid iteration{status.paidIterations === 1 ? "" : "s"}.
          </>
        ) : (
          <>
            You have <strong className="text-text">{freeLeft}</strong> free iteration
            {freeLeft === 1 ? "" : "s"} left out of {status.freeLimit}.
          </>
        )}
      </p>

      {error === "title" && (
        <div className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Please add a short title so we know what you're asking for.
        </div>
      )}

      <div className="card p-6">
        <SubmitIssueForm slug={slug} />
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Tip: attach a screenshot or screen recording if it's a visual change — it saves a lot of back-and-forth.
      </p>
    </div>
  );
}
