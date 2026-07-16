import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getIterationStatus,
  getProjectByIdForOwner,
  listIssuesForProject,
  listProjectPayments,
} from "@/lib/projects";
import { PUBLIC_BASE_URL, formatINR } from "@/lib/config";
import { CopyMagicLink } from "./copy-magic-link";
import { DeleteProject } from "./delete-project";
import { grantIterationsAction } from "./actions";
import { ActivityPoller } from "@/components/activity-poller";
import { initials, listTeamMembers } from "@/lib/team";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Declined" },
] as const;

const PRIORITY_FILTERS = [
  { key: "all", label: "All priorities" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
] as const;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; status?: string; priority?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { created, status: statusRaw, priority: priorityRaw } = await searchParams;

  const statusFilter = STATUS_FILTERS.some((f) => f.key === statusRaw)
    ? (statusRaw as string)
    : "all";
  const priorityFilter = PRIORITY_FILTERS.some((f) => f.key === priorityRaw)
    ? (priorityRaw as string)
    : "all";

  const project = await getProjectByIdForOwner(id, user.id);
  if (!project) notFound();

  const [issueList, status, payments, team] = await Promise.all([
    listIssuesForProject(project.id),
    getIterationStatus(project.id),
    listProjectPayments(project.id),
    listTeamMembers(user.id),
  ]);
  const teamMap = new Map(team.map((m) => [m.id, m]));

  const visibleIssues = issueList.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (priorityFilter !== "all" && (i.priority ?? "normal") !== priorityFilter)
      return false;
    return true;
  });

  const magicLink = `${PUBLIC_BASE_URL}/p/${project.slug}`;
  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <ActivityPoller scope={{ kind: "project", projectId: project.id }} />
      {created && (
        <div className="mb-6 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Project created. Send the magic link below to your client.
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-muted">Project</div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-1 text-sm text-muted">
            Client: <span className="text-text">{project.clientName}</span>
            {project.clientEmail && <> · {project.clientEmail}</>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                🔗 {new URL(project.projectUrl).hostname}
              </a>
            )}
            {project.dueDate && (
              <span>
                📅 Due {new Date(project.dueDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {project.brandColor && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border"
                  style={{ background: project.brandColor }}
                />
                {project.brandColor}
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted">{project.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted">Iterations</div>
          <div className="text-3xl font-semibold">
            {status.iterationsUsed}
            <span className="text-muted">/{status.totalAllowed}</span>
          </div>
          <div className="text-xs text-muted">
            {status.freeLimit} free + {status.paidIterations} paid
          </div>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Client magic link</div>
          {status.needsPayment ? (
            <span className="pill border-accent/60 text-accent">Paywall active</span>
          ) : status.isOverFreeLimit ? (
            <span className="pill border-orange-400/60 text-orange-300">Past free tier</span>
          ) : (
            <span className="pill border-success/60 text-success">Within free tier</span>
          )}
        </div>
        <CopyMagicLink link={magicLink} />
        <p className="mt-3 text-xs text-muted">
          Share this with your client. They can submit changes — text, voice notes, screenshots,
          and screen recordings — without signing up.
        </p>
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(100, (status.iterationsUsed / Math.max(status.totalAllowed, 1)) * 100)}%`,
            background: status.needsPayment
              ? "#ef4444"
              : status.isOverFreeLimit
                ? "#f97316"
                : "#10b981",
          }}
        />
      </div>

      <form action={grantIterationsAction} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1">
          <div className="text-sm font-medium">Grant additional iterations manually</div>
          <div className="text-xs text-muted">
            Use when the client paid you outside the system (UPI, invoice, goodwill).
          </div>
        </div>
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="count"
          type="number"
          min={1}
          max={50}
          defaultValue={1}
          className="input w-24"
        />
        <button type="submit" className="btn-secondary">
          + Grant
        </button>
      </form>

      {payments.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="mb-3 text-sm font-medium">Payments received</div>
          <div className="text-2xl font-semibold">{formatINR(paidTotal)}</div>
          <div className="mt-3 space-y-1 text-xs text-muted">
            {payments
              .filter((p) => p.status === "paid")
              .map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>
                    {p.iterationsPurchased}× iteration ·{" "}
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}
                  </span>
                  <span>{formatINR(p.amountPaise)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Change requests</h2>
        <span className="text-sm text-muted">
          {statusFilter === "all" && priorityFilter === "all"
            ? `${issueList.length} total`
            : `${visibleIssues.length} of ${issueList.length}`}
        </span>
      </div>

      {issueList.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-2 text-3xl">📨</div>
          <div className="text-sm font-medium">No change requests yet</div>
          <p className="mt-1 max-w-md text-sm text-muted">
            Once your client submits an issue via the magic link, it will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <InlineFilterGroup
              basePath={`/dashboard/projects/${project.id}`}
              label="Status"
              name="status"
              current={statusFilter}
              options={STATUS_FILTERS as unknown as { key: string; label: string }[]}
              siblings={{ priority: priorityFilter }}
            />
            <InlineFilterGroup
              basePath={`/dashboard/projects/${project.id}`}
              label="Priority"
              name="priority"
              current={priorityFilter}
              options={PRIORITY_FILTERS as unknown as { key: string; label: string }[]}
              siblings={{ status: statusFilter }}
            />
          </div>

          {visibleIssues.length === 0 ? (
            <div className="card px-6 py-12 text-center text-sm text-muted">
              No requests match these filters.
            </div>
          ) : (
            <div className="card divide-y divide-border">
              {visibleIssues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  projectId={project.id}
                  freeLimit={status.freeLimit}
                  assignee={
                    issue.assigneeId ? teamMap.get(issue.assigneeId) ?? null : null
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <DeleteProject projectId={project.id} projectName={project.name} />
    </div>
  );
}

function IssueRow({
  issue,
  projectId,
  freeLimit,
  assignee,
}: {
  issue: Awaited<ReturnType<typeof listIssuesForProject>>[number];
  projectId: string;
  freeLimit: number;
  assignee: { id: string; name: string; color: string } | null;
}) {
  const overFree = issue.iterationNumber > freeLimit;
  return (
    <Link
      href={`/dashboard/projects/${projectId}/issues/${issue.id}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-elevated"
    >
      <div className="mt-0.5 flex w-12 shrink-0 justify-center">
        <span
          className={`font-mono text-xs ${overFree ? "text-accent" : "text-muted"}`}
        >
          #{issue.iterationNumber}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={issue.status} />
          {issue.priority && issue.priority !== "normal" && <PriorityBadge priority={issue.priority} />}
          <span className="truncate text-sm font-medium">{issue.title}</span>
        </div>
        {issue.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted">{issue.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
          {issue.submitterName && <span>{issue.submitterName}</span>}
          {issue.attachments.length > 0 && (
            <span>📎 {issue.attachments.length}</span>
          )}
          {issue.etaAt && (
            <span className="text-orange-300">
              ETA {new Date(issue.etaAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {issue.clientApprovedAt && <span className="text-success">✓ approved</span>}
          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {assignee && (
        <span
          className="mx-2 flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full text-[10px] font-semibold text-black"
          style={{ background: assignee.color }}
          title={`Assigned to ${assignee.name}`}
        >
          {initials(assignee.name)}
        </span>
      )}
      <div className="shrink-0 self-center text-muted">›</div>
    </Link>
  );
}

function InlineFilterGroup({
  basePath,
  label,
  name,
  current,
  options,
  siblings,
}: {
  basePath: string;
  label: string;
  name: string;
  current: string;
  options: { key: string; label: string }[];
  siblings: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-panel p-1">
      <span className="px-1 text-[10px] uppercase tracking-wide text-muted">
        {label}
      </span>
      {options.map((o) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(siblings)) {
          if (v && v !== "all") params.set(k, v);
        }
        if (o.key !== "all") params.set(name, o.key);
        const qs = params.toString();
        const active = current === o.key;
        return (
          <Link
            key={o.key}
            href={`${basePath}${qs ? `?${qs}` : ""}`}
            scroll={false}
            className={`rounded px-2 py-1 text-[11px] transition-colors ${
              active ? "bg-accent text-black" : "text-muted hover:text-text"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls: Record<string, string> = {
    high: "border-orange-400/60 text-orange-300",
    urgent: "border-danger/60 text-danger",
    low: "border-muted text-muted",
  };
  const label: Record<string, string> = {
    high: "High",
    urgent: "Urgent",
    low: "Low",
  };
  return (
    <span className={`pill text-[10px] ${cls[priority] ?? ""}`}>{label[priority] ?? priority}</span>
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
