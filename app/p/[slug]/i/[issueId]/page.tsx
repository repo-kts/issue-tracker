import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIssueWithAttachments,
  getProjectBySlug,
  getTimelineForIssue,
  listMessagesForIssue,
} from "@/lib/projects";
import { ChatThread } from "@/components/chat-thread";
import { AttachmentPreview } from "@/components/attachment-preview";
import { Timeline } from "@/components/timeline";
import { postClientMessageAction } from "./actions";
import { ApproveBanner } from "./approve-banner";
import { ActivityPoller } from "@/components/activity-poller";
import { EditIssueForm } from "./edit-issue-form";

export default async function ClientIssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; issueId: string }>;
}) {
  const { slug, issueId } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const issue = await getIssueWithAttachments(issueId);
  if (!issue || issue.projectId !== project.id) notFound();
  const [messages, timeline] = await Promise.all([
    listMessagesForIssue(issueId),
    getTimelineForIssue(issueId),
  ]);

  const overFree = issue.iterationNumber > project.freeIterationLimit;
  const lastMessage = messages[messages.length - 1] ?? null;
  const lastActivity = lastMessage ? lastMessage.createdAt : issue.createdAt;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ActivityPoller scope={{ kind: "issue", issueId: issue.id }} />

      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href={`/p/${slug}`} className="hover:text-text">
          ← {project.name}
        </Link>
      </nav>

      {/* Title + meta */}
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-mono">#{issue.iterationNumber}</span>
          {overFree && <span className="text-accent">· paid iteration</span>}
          <span>·</span>
          <span>
            of {project.freeIterationLimit} free included
          </span>
          <span>·</span>
          <span>opened {formatDate(issue.createdAt)}</span>
          {issue.submitterName && (
            <>
              <span>·</span>
              <span>by {issue.submitterName}</span>
            </>
          )}
          <span>·</span>
          <span>last update {relativeTime(lastActivity)}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <ClientStatusPill status={issue.status} />
          {issue.priority && issue.priority !== "normal" && (
            <PriorityPill priority={issue.priority} />
          )}
          {issue.clientApprovedAt && (
            <span className="pill border-success/60 text-success">✓ Approved</span>
          )}
          {issue.etaAt && (
            <span className="pill border-orange-400/60 text-orange-300">
              ETA{" "}
              {new Date(issue.etaAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Approval banner */}
      {issue.status === "resolved" && !issue.clientApprovedAt && (
        <div className="mt-6">
          <ApproveBanner
            slug={slug}
            issueId={issue.id}
            defaultName={issue.submitterName ?? project.clientName}
          />
        </div>
      )}

      {issue.clientApprovedAt && (
        <div className="card mt-6 border-success/40 bg-success/5 p-4 text-sm">
          <div className="font-medium text-success">
            ✓ Approved by {issue.clientApprovedBy ?? "client"}
          </div>
          <div className="text-xs text-muted">
            {new Date(issue.clientApprovedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            . This iteration is officially closed.
          </div>
        </div>
      )}

      {/* Main + sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          {issue.description && (
            <section className="card p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
                  What you asked for
                </h2>
                <EditIssueForm
                  slug={slug}
                  issueId={issue.id}
                  initialTitle={issue.title}
                  initialDescription={issue.description ?? ""}
                  defaultEditorName={issue.submitterName ?? project.clientName}
                />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
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
              fd.set("slug", slug);
              fd.set("issueId", issue.id);
              await postClientMessageAction(fd);
            }}
            viewerType="client"
          />

          <p className="text-center text-xs text-muted">
            Replies and clarifications here are free — they don't count as new iterations.
          </p>
        </div>

        <Timeline entries={timeline} viewerType="client" />
      </div>
    </div>
  );
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

function ClientStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Received", cls: "border-orange-400/60 text-orange-300" },
    in_progress: { label: "In progress", cls: "border-blue-400/60 text-blue-300" },
    resolved: { label: "Done", cls: "border-success/60 text-success" },
    rejected: { label: "Declined", cls: "border-danger/60 text-danger" },
  };
  const m = map[status] ?? { label: status, cls: "" };
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
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
