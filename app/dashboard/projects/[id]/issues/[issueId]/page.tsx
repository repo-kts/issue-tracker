import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getIssueWithAttachments,
  getProjectByIdForOwner,
  getTimelineForIssue,
  listMessagesForIssue,
} from "@/lib/projects";
import { ChatThread } from "@/components/chat-thread";
import { AttachmentPreview } from "@/components/attachment-preview";
import { Timeline } from "@/components/timeline";
import { ActivityPoller } from "@/components/activity-poller";
import { PrioritySelect } from "./priority-select";
import { AssigneeSelect } from "./assignee-select";
import { initials, listTeamMembers } from "@/lib/team";
import {
  assignIssueAction,
  postOwnerMessageAction,
  setIssueEtaAction,
  setIssuePriorityAction,
  setIssueStatusAction,
} from "./actions";

export default async function OwnerIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id, issueId } = await params;

  const project = await getProjectByIdForOwner(id, user.id);
  if (!project) notFound();
  const issue = await getIssueWithAttachments(issueId);
  if (!issue || issue.projectId !== project.id) notFound();

  const [messages, timeline, teamMembersList] = await Promise.all([
    listMessagesForIssue(issueId),
    getTimelineForIssue(issueId),
    listTeamMembers(user.id),
  ]);
  const assignee = issue.assigneeId
    ? teamMembersList.find((m) => m.id === issue.assigneeId) ?? null
    : null;
  const overFree = issue.iterationNumber > project.freeIterationLimit;
  const lastUpdateAt =
    messages.length > 0 ? messages[messages.length - 1].createdAt : issue.createdAt;
  const etaPast =
    issue.etaAt && issue.etaAt < new Date() && issue.status !== "resolved";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <ActivityPoller scope={{ kind: "issue", issueId: issue.id }} />

      <Link
        href={`/dashboard/projects/${project.id}`}
        className="text-xs text-muted hover:text-text"
      >
        ← {project.name}
      </Link>

      {/* Title + actions */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">#{issue.iterationNumber}</span>
            {overFree && <span className="text-accent">· paid iteration</span>}
            <span>·</span>
            <span>opened {formatDate(issue.createdAt)}</span>
            {issue.submitterName && (
              <>
                <span>·</span>
                <span>by {issue.submitterName}</span>
              </>
            )}
            <span>·</span>
            <span>last update {relativeTime(lastUpdateAt)}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">{issue.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill status={issue.status} />
            {issue.priority !== "normal" && <PriorityPill priority={issue.priority} />}
            {issue.clientApprovedAt && (
              <span className="pill border-success/60 text-success">
                ✓ Approved by client
              </span>
            )}
          </div>
        </div>
        <a
          href={`/api/issues/${issue.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary shrink-0 text-xs"
          title="Download as PDF"
        >
          ⇩ PDF
        </a>
      </div>

      {/* Single consolidated control row */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-border bg-panel p-4">
        <form action={setIssueStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="issueId" value={issue.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-[11px] uppercase tracking-wide text-muted">Status</label>
          <select
            name="status"
            defaultValue={issue.status}
            className="input w-auto py-1.5 text-xs"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="submit" className="btn-secondary text-xs">
            Set
          </button>
        </form>

        <span className="h-5 w-px bg-border" aria-hidden />

        <form action={assignIssueAction} className="flex items-center gap-2">
          <input type="hidden" name="issueId" value={issue.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-[11px] uppercase tracking-wide text-muted">Assign</label>
          <AssigneeSelect value={issue.assigneeId} members={teamMembersList} />
          {assignee && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-black"
              style={{ background: assignee.color }}
              title={assignee.name}
            >
              {initials(assignee.name)}
            </span>
          )}
        </form>

        <span className="h-5 w-px bg-border" aria-hidden />

        <form action={setIssuePriorityAction} className="flex items-center gap-2">
          <input type="hidden" name="issueId" value={issue.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-[11px] uppercase tracking-wide text-muted">Priority</label>
          <PrioritySelect value={issue.priority ?? "normal"} />
        </form>

        <span className="h-5 w-px bg-border" aria-hidden />

        <form action={setIssueEtaAction} className="flex items-center gap-2">
          <input type="hidden" name="issueId" value={issue.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-[11px] uppercase tracking-wide text-muted">ETA</label>
          <input
            type="date"
            name="etaAt"
            defaultValue={
              issue.etaAt ? new Date(issue.etaAt).toISOString().slice(0, 10) : ""
            }
            className={`input w-auto py-1.5 text-xs ${etaPast ? "text-danger" : ""}`}
          />
          <button type="submit" className="btn-secondary text-xs">
            Set
          </button>
          {etaPast && (
            <span className="text-[10px] text-danger" title="Past due">
              !
            </span>
          )}
        </form>
      </div>

      {/* Main content + sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          {issue.description && (
            <section className="card p-6">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                Original request
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                {issue.description}
              </p>
            </section>
          )}

          {issue.attachments.length > 0 && (
            <section className="card p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
                  Attachments
                </h2>
                <span className="text-[10px] text-muted">
                  {issue.attachments.length} item
                  {issue.attachments.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {issue.attachments.map((a) => (
                  <AttachmentPreview key={a.id} attachment={a} compact />
                ))}
              </div>
            </section>
          )}

          <ChatThread
            messages={messages}
            postAction={async (fd) => {
              "use server";
              fd.set("issueId", issue.id);
              fd.set("projectId", project.id);
              await postOwnerMessageAction(fd);
            }}
            viewerType="owner"
          />
        </div>

        <Timeline entries={timeline} viewerType="owner" />
      </div>
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

function PriorityPill({ priority }: { priority: string }) {
  const cls: Record<string, string> = {
    low: "text-muted",
    high: "border-orange-400/60 text-orange-300",
    urgent: "border-danger/60 text-danger",
  };
  const label: Record<string, string> = {
    low: "Low priority",
    high: "High priority",
    urgent: "Urgent",
  };
  return <span className={`pill ${cls[priority] ?? ""}`}>{label[priority] ?? priority}</span>;
}

function formatDate(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
