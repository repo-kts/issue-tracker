import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getIterationStatus,
  getProjectBySlug,
  listIssuesWithActivity,
  type IssueListItem,
} from "@/lib/projects";
import { formatINR, PRICE_PER_EXTRA_ITERATION_PAISE } from "@/lib/config";
import { ActivityPoller } from "@/components/activity-poller";

export default async function ClientDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string; paid?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const { submitted, paid, tab: tabRaw } = await searchParams;
  const tab = (
    ["all", "open", "in_progress", "resolved", "rejected"].includes(tabRaw ?? "")
      ? tabRaw
      : "all"
  ) as "all" | "open" | "in_progress" | "resolved" | "rejected";
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const [status, issueList] = await Promise.all([
    getIterationStatus(project.id),
    listIssuesWithActivity(project.id),
  ]);

  const grouped = {
    open: issueList.filter((i) => i.status === "open"),
    in_progress: issueList.filter((i) => i.status === "in_progress"),
    resolved: issueList.filter((i) => i.status === "resolved"),
    rejected: issueList.filter((i) => i.status === "rejected"),
  };
  const activeCount = grouped.open.length + grouped.in_progress.length;

  const visibleIssues =
    tab === "all"
      ? issueList
      : tab === "open"
        ? grouped.open
        : tab === "in_progress"
          ? grouped.in_progress
          : tab === "resolved"
            ? grouped.resolved
            : grouped.rejected;

  const lastTouched = [...issueList].sort(
    (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
  );
  const recentReplies = lastTouched
    .filter((i) => i.lastMessage)
    .slice(0, 3);

  const pct = Math.min(100, (status.iterationsUsed / Math.max(status.totalAllowed, 1)) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <ActivityPoller scope={{ kind: "slug", slug }} />
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">Project portal</div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{project.name}</h1>
          <p className="mt-1 text-xs text-muted">Welcome, {project.clientName}.</p>
        </div>

        <div className="flex flex-wrap items-stretch gap-4 text-right">
          <Stat label="Total" value={issueList.length} />
          <Divider />
          <Stat
            label="Open"
            value={grouped.open.length}
            color={grouped.open.length > 0 ? "text-orange-300" : undefined}
          />
          <Divider />
          <Stat
            label="In progress"
            value={grouped.in_progress.length}
            color={grouped.in_progress.length > 0 ? "text-blue-300" : undefined}
          />
          <Divider />
          <Stat
            label="Done"
            value={grouped.resolved.length}
            color={grouped.resolved.length > 0 ? "text-success" : undefined}
          />
          <Divider />
          <Stat
            label="Iterations left"
            value={`${status.remaining}/${status.totalAllowed}`}
            color={status.remaining === 0 ? "text-accent" : undefined}
          />
        </div>
      </div>

      {submitted === "1" && (
        <div className="mt-4 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          ✓ Your change request was submitted. We'll get on it.
        </div>
      )}
      {paid === "1" && (
        <div className="mt-4 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          ✓ Payment received. One more iteration unlocked — go ahead and submit it.
        </div>
      )}

      <div className="card mt-4 p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Iteration budget</div>
            <div className="text-xs text-muted">
              {status.iterationsUsed} of {status.totalAllowed} used ·{" "}
              {status.freeLimit} free included
              {status.paidIterations > 0 && (
                <> · {status.paidIterations} paid</>
              )}
            </div>
          </div>
          {status.needsPayment ? (
            <Link href={`/p/${slug}/pay`} className="btn-primary text-sm">
              Pay {formatINR(PRICE_PER_EXTRA_ITERATION_PAISE)} for next iteration →
            </Link>
          ) : (
            <Link href={`/p/${slug}/new`} className="btn-primary text-sm">
              + Submit a change request
            </Link>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#17171b]">
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              background: status.needsPayment
                ? "#ef4444"
                : status.isOverFreeLimit
                  ? "#f97316"
                  : "#10b981",
            }}
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-medium">All change requests</h2>
            <span className="text-xs text-muted">
              {activeCount} active · {grouped.resolved.length} done
            </span>
          </div>

          {issueList.length === 0 ? (
            <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-2 text-3xl">📨</div>
              <div className="mb-2 text-sm font-medium">No change requests yet</div>
              <p className="mb-6 max-w-md text-sm text-muted">
                When you submit your first one it will appear here, and we'll get notified.
              </p>
              <Link href={`/p/${slug}/new`} className="btn-primary">
                + Submit your first request
              </Link>
            </div>
          ) : (
            <>
              <Tabs
                slug={slug}
                current={tab}
                counts={{
                  all: issueList.length,
                  open: grouped.open.length,
                  in_progress: grouped.in_progress.length,
                  resolved: grouped.resolved.length,
                  rejected: grouped.rejected.length,
                }}
              />

              {visibleIssues.length === 0 ? (
                <div className="card mt-4 px-6 py-12 text-center text-sm text-muted">
                  No requests in this view.
                </div>
              ) : (
                <div className="card mt-4 divide-y divide-border">
                  {visibleIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      slug={slug}
                      freeLimit={project.freeIterationLimit}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Recent activity
          </h2>
          {recentReplies.length === 0 ? (
            <div className="card px-4 py-6 text-center text-xs text-muted">
              No replies yet.
            </div>
          ) : (
            <div className="card divide-y divide-border">
              {recentReplies.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/p/${slug}/i/${issue.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#0e0e10]"
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                      issue.lastMessage?.authorType === "owner"
                        ? "bg-accent/20 text-accent"
                        : "bg-blue-400/20 text-blue-300"
                    }`}
                  >
                    {issue.lastMessage?.authorName.charAt(0).toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 text-[11px]">
                      <span className="font-medium text-text">
                        {issue.lastMessage?.authorName}
                      </span>
                      {issue.lastMessage?.authorType === "owner" && (
                        <span className="text-[9px] uppercase tracking-wide text-accent">
                          agency
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-muted">
                        {relativeTime(issue.lastActivityAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      replied to{" "}
                      <span className="font-mono text-text">
                        #{issue.iterationNumber}
                      </span>{" "}
                      <span className="text-text">{issue.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs italic text-muted">
                      {issue.lastMessage?.body}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-xl font-semibold leading-tight ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function Divider() {
  return <span className="hidden w-px self-stretch bg-border md:block" aria-hidden />;
}

function Tabs({
  slug,
  current,
  counts,
}: {
  slug: string;
  current: string;
  counts: {
    all: number;
    open: number;
    in_progress: number;
    resolved: number;
    rejected: number;
  };
}) {
  const items: Array<{
    key: "all" | "open" | "in_progress" | "resolved" | "rejected";
    label: string;
    activeCls: string;
  }> = [
    { key: "all", label: "All", activeCls: "text-text border-text" },
    { key: "open", label: "Open", activeCls: "text-orange-300 border-orange-400" },
    {
      key: "in_progress",
      label: "In progress",
      activeCls: "text-blue-300 border-blue-400",
    },
    { key: "resolved", label: "Done", activeCls: "text-success border-success" },
    { key: "rejected", label: "Declined", activeCls: "text-danger border-danger" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border"
      aria-label="Filter change requests by status"
    >
      {items.map((it) => {
        const count = counts[it.key];
        if (it.key === "rejected" && count === 0 && current !== "rejected") return null;
        const isActive = current === it.key;
        const href = it.key === "all" ? `/p/${slug}` : `/p/${slug}?tab=${it.key}`;
        return (
          <Link
            key={it.key}
            href={href}
            scroll={false}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? it.activeCls
                : "border-transparent text-muted hover:text-text"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{it.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                isActive ? "bg-[#17171b] text-text" : "text-muted"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function IssueRow({
  issue,
  slug,
  freeLimit,
}: {
  issue: IssueListItem;
  slug: string;
  freeLimit: number;
}) {
  const overFree = issue.iterationNumber > freeLimit;
  return (
    <Link
      href={`/p/${slug}/i/${issue.id}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-[#0e0e10]"
    >
      <div className="mt-1 w-10 shrink-0 text-center">
        <span
          className={`font-mono text-xs ${overFree ? "text-accent" : "text-muted"}`}
        >
          #{issue.iterationNumber}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{issue.title}</span>
          {issue.priority && issue.priority !== "normal" && (
            <ClientPriorityBadge priority={issue.priority} />
          )}
        </div>
        {issue.lastMessage ? (
          <p className="mt-0.5 truncate text-xs text-muted">
            <span
              className={
                issue.lastMessage.authorType === "owner"
                  ? "text-accent"
                  : "text-blue-300"
              }
            >
              {issue.lastMessage.authorName}:
            </span>{" "}
            {issue.lastMessage.body}
          </p>
        ) : issue.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{issue.description}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          {issue.attachments.length > 0 && (
            <span>📎 {issue.attachments.length}</span>
          )}
          {issue.messageCount > 0 && <span>💬 {issue.messageCount}</span>}
          {issue.etaAt && (
            <span className="text-orange-300">
              ETA {new Date(issue.etaAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {issue.clientApprovedAt && <span className="text-success">✓ approved</span>}
          <span>{relativeTime(issue.lastActivityAt)}</span>
        </div>
      </div>
      <div className="shrink-0 self-center text-muted">›</div>
    </Link>
  );
}

function ClientPriorityBadge({ priority }: { priority: string }) {
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

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
