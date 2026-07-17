import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { searchOwnerIssues } from "@/lib/projects";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchOwnerIssues(user.id, query) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <Link href="/dashboard" className="mb-4 inline-block text-xs text-muted hover:text-text">
        ← Back to projects
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      {query ? (
        <p className="mt-1 text-sm text-muted">
          {results.length} result{results.length === 1 ? "" : "s"} for{" "}
          <span className="font-mono text-text">"{query}"</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Type a query in the sidebar search bar.</p>
      )}

      {query && results.length === 0 && (
        <div className="card mt-6 px-6 py-12 text-center text-sm text-muted">
          No issues, project names, or messages matched your search.
        </div>
      )}

      {results.length > 0 && (
        <div className="card mt-6 divide-y divide-border">
          {results.map((r) => (
            <Link
              key={r.issueId}
              href={`/dashboard/projects/${r.projectId}/issues/${r.issueId}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-elevated"
            >
              <div className="mt-0.5 w-12 shrink-0 text-center">
                <span className="font-mono text-xs text-muted">#{r.iterationNumber}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={r.status} />
                  {r.priority && r.priority !== "normal" && (
                    <PriorityBadge priority={r.priority} />
                  )}
                  <span className="truncate text-sm font-medium">{r.title}</span>
                </div>
                {r.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{r.description}</p>
                )}
                <div className="mt-1 text-xs text-muted">
                  {r.projectName} · {r.clientName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    open: "border-orange-400/60 text-orange-300",
    in_progress: "border-blue-400/60 text-blue-300",
    resolved: "border-success/60 text-success",
    rejected: "border-danger/60 text-danger",
  };
  const label: Record<string, string> = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
    rejected: "Rejected",
  };
  return <span className={`pill ${cls[status] ?? ""}`}>{label[status] ?? status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls: Record<string, string> = {
    high: "border-orange-400/60 text-orange-300",
    urgent: "border-danger/60 text-danger",
    low: "border-muted text-muted",
  };
  const label: Record<string, string> = { high: "High", urgent: "Urgent", low: "Low" };
  return (
    <span className={`pill text-[10px] ${cls[priority] ?? ""}`}>{label[priority] ?? priority}</span>
  );
}
