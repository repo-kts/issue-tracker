import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  issues,
  projects,
  payments,
  attachments,
  messages,
  events,
  teamMembers,
} from "./db/schema";
import { nanoid } from "nanoid";
import { FREE_ITERATIONS_PER_PROJECT } from "./config";

export type ProjectWithCounts = {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string | null;
  description: string | null;
  brandColor: string | null;
  slug: string;
  freeIterationLimit: number;
  paidIterations: number;
  status: "active" | "paused" | "archived";
  createdAt: Date;
  totalIssues: number;
  openIssues: number;
};

export async function listOwnerProjects(ownerId: string): Promise<ProjectWithCounts[]> {
  // LEFT JOIN + GROUP BY is more reliable than correlated subqueries for
  // surfacing issue counts. Drizzle's sql template parameterises column refs
  // inside subqueries, which silently produced zero counts.
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: projects.clientName,
      clientEmail: projects.clientEmail,
      description: projects.description,
      brandColor: projects.brandColor,
      slug: projects.slug,
      freeIterationLimit: projects.freeIterationLimit,
      paidIterations: projects.paidIterations,
      status: projects.status,
      createdAt: projects.createdAt,
      totalIssues: sql<number>`COUNT(${issues.id})`,
      openIssues: sql<number>`SUM(CASE WHEN ${issues.status} IN ('open','in_progress') THEN 1 ELSE 0 END)`,
    })
    .from(projects)
    .leftJoin(issues, eq(issues.projectId, projects.id))
    .where(eq(projects.ownerId, ownerId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));
  return rows.map((r) => ({
    ...r,
    totalIssues: Number(r.totalIssues ?? 0),
    openIssues: Number(r.openIssues ?? 0),
  })) as ProjectWithCounts[];
}

export async function getProjectByIdForOwner(projectId: string, ownerId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProjectBySlug(slug: string) {
  const rows = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function listIssuesForProject(projectId: string) {
  const issueRows = await db
    .select()
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.iterationNumber));

  if (issueRows.length === 0) return [];

  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(
      sql`${attachments.issueId} IN (${sql.join(
        issueRows.map((i) => sql`${i.id}`),
        sql`,`,
      )})`,
    );

  const grouped = new Map<string, typeof attachmentRows>();
  for (const a of attachmentRows) {
    const list = grouped.get(a.issueId) ?? [];
    list.push(a);
    grouped.set(a.issueId, list);
  }

  return issueRows.map((i) => ({ ...i, attachments: grouped.get(i.id) ?? [] }));
}

export type IterationStatus = {
  iterationsUsed: number;
  freeLimit: number;
  paidIterations: number;
  totalAllowed: number;
  remaining: number;
  isOverFreeLimit: boolean;
  needsPayment: boolean;
};

export async function getIterationStatus(projectId: string): Promise<IterationStatus> {
  const proj = await db
    .select({
      freeIterationLimit: projects.freeIterationLimit,
      paidIterations: projects.paidIterations,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const p = proj[0];
  const freeLimit = p?.freeIterationLimit ?? FREE_ITERATIONS_PER_PROJECT;
  const paidIterations = p?.paidIterations ?? 0;

  const countRow = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(issues)
    .where(eq(issues.projectId, projectId));
  const iterationsUsed = countRow[0]?.c ?? 0;
  const totalAllowed = freeLimit + paidIterations;
  const remaining = Math.max(0, totalAllowed - iterationsUsed);
  return {
    iterationsUsed,
    freeLimit,
    paidIterations,
    totalAllowed,
    remaining,
    isOverFreeLimit: iterationsUsed >= freeLimit,
    needsPayment: iterationsUsed >= totalAllowed,
  };
}

export async function getIssueById(issueId: string) {
  const rows = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  return rows[0] ?? null;
}

export async function getIssueWithAttachments(issueId: string) {
  const issue = await getIssueById(issueId);
  if (!issue) return null;
  const atts = await db
    .select()
    .from(attachments)
    .where(
      sql`${attachments.issueId} = ${issueId} AND ${attachments.messageId} IS NULL`,
    )
    .orderBy(asc(attachments.createdAt));
  return { ...issue, attachments: atts };
}

export async function listMessagesForIssue(issueId: string) {
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.issueId, issueId))
    .orderBy(asc(messages.createdAt));

  const empty: Array<(typeof msgs)[number] & {
    attachments: Awaited<ReturnType<typeof loadMessageAttachments>>;
  }> = [];
  if (msgs.length === 0) return empty;

  const ids = msgs.map((m) => m.id);
  const atts = await loadMessageAttachments(ids);

  const grouped = new Map<string, typeof atts>();
  for (const a of atts) {
    if (!a.messageId) continue;
    const arr = grouped.get(a.messageId) ?? [];
    arr.push(a);
    grouped.set(a.messageId, arr);
  }
  return msgs.map((m) => ({ ...m, attachments: grouped.get(m.id) ?? [] }));
}

async function loadMessageAttachments(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  return db
    .select()
    .from(attachments)
    .where(
      sql`${attachments.messageId} IN (${sql.join(
        messageIds.map((i) => sql`${i}`),
        sql`,`,
      )})`,
    )
    .orderBy(asc(attachments.createdAt));
}

export type IssueListItem = Awaited<ReturnType<typeof listIssuesForProject>>[number] & {
  messageCount: number;
  lastActivityAt: Date;
  lastMessage: {
    body: string;
    authorType: "owner" | "client";
    authorName: string;
    createdAt: Date;
  } | null;
};

export async function listIssuesWithActivity(projectId: string): Promise<IssueListItem[]> {
  const baseIssues = await listIssuesForProject(projectId);
  if (baseIssues.length === 0) return [];

  const allMessages = await db
    .select()
    .from(messages)
    .where(
      sql`${messages.issueId} IN (${sql.join(
        baseIssues.map((i) => sql`${i.id}`),
        sql`,`,
      )})`,
    )
    .orderBy(asc(messages.createdAt));

  const byIssue = new Map<string, typeof allMessages>();
  for (const m of allMessages) {
    const arr = byIssue.get(m.issueId) ?? [];
    arr.push(m);
    byIssue.set(m.issueId, arr);
  }

  return baseIssues.map((issue) => {
    const msgs = byIssue.get(issue.id) ?? [];
    const last = msgs[msgs.length - 1] ?? null;
    const lastActivityAt =
      last && last.createdAt > issue.createdAt ? last.createdAt : issue.createdAt;
    return {
      ...issue,
      messageCount: msgs.length,
      lastActivityAt,
      lastMessage: last
        ? {
            body: last.body,
            authorType: last.authorType,
            authorName: last.authorName,
            createdAt: last.createdAt,
          }
        : null,
    };
  });
}

export type TimelineEntry = {
  id: string;
  at: Date;
  kind:
    | "created"
    | "attachment_added"
    | "status_changed"
    | "message"
    | "resolved"
    | "reopened"
    | "assigned";
  actorType: "owner" | "client" | "system";
  actorName: string;
  text: string;
  detail?: string;
  meta?: Record<string, any>;
};

export async function getTimelineForIssue(issueId: string): Promise<TimelineEntry[]> {
  const issue = await getIssueWithAttachments(issueId);
  if (!issue) return [];
  const evs = await db.select().from(events).where(eq(events.issueId, issueId));

  const entries: TimelineEntry[] = [];

  entries.push({
    id: `created-${issue.id}`,
    at: issue.createdAt,
    kind: "created",
    actorType: "client",
    actorName: issue.submitterName ?? "Client",
    text: "submitted this change request",
  });

  if (issue.attachments.length > 0) {
    entries.push({
      id: `attach-${issue.id}`,
      at: issue.createdAt,
      kind: "attachment_added",
      actorType: "client",
      actorName: issue.submitterName ?? "Client",
      text: `attached ${issue.attachments.length} file${issue.attachments.length === 1 ? "" : "s"}`,
      meta: { count: issue.attachments.length },
    });
  }

  for (const e of evs) {
    if (e.kind !== "attachment_added") continue;
    let meta: any = {};
    try {
      meta = e.metadata ? JSON.parse(e.metadata) : {};
    } catch {}
    if (!meta.edit) continue; // skip non-edit attachment events (we synthesize created-time attach above)
    const changes = (meta.changes as string[] | undefined) ?? [];
    entries.push({
      id: `evt-${e.id}`,
      at: e.createdAt,
      kind: "attachment_added",
      actorType: e.actorType,
      actorName: e.actorName,
      text:
        changes.length > 0
          ? `updated the request (${changes.join(", ")})`
          : "updated the request",
      meta,
    });
  }

  // Chat replies are intentionally NOT included in the timeline — the
  // conversation panel below already shows them.

  for (const e of evs) {
    if (e.kind === "status_changed") {
      let meta: any = {};
      try {
        meta = e.metadata ? JSON.parse(e.metadata) : {};
      } catch {}
      const isApproval = meta?.approval === true;
      entries.push({
        id: `evt-${e.id}`,
        at: e.createdAt,
        kind: "status_changed",
        actorType: e.actorType,
        actorName: e.actorName,
        text: isApproval
          ? "approved this resolution"
          : `changed status to ${statusLabel(meta.to)}`,
        meta,
      });
    } else if (e.kind === "reopened") {
      entries.push({
        id: `evt-${e.id}`,
        at: e.createdAt,
        kind: "reopened",
        actorType: e.actorType,
        actorName: e.actorName,
        text: "reopened the request",
      });
    }
    // "assigned" events are deliberately omitted from the visible timeline —
    // the current assignee is already shown on the page header.
  }

  // Synthesize a resolved entry from resolved_at if no event recorded it.
  if (issue.resolvedAt) {
    const alreadyHas = entries.some(
      (e) =>
        e.kind === "status_changed" &&
        e.at.getTime() === issue.resolvedAt!.getTime() &&
        (e.meta as any)?.to === "resolved",
    );
    if (!alreadyHas) {
      entries.push({
        id: `resolved-${issue.id}`,
        at: issue.resolvedAt,
        kind: "resolved",
        actorType: "owner",
        actorName: "Team",
        text: "marked this resolved",
      });
    }
  }

  entries.sort((a, b) => a.at.getTime() - b.at.getTime());
  return entries;
}

function statusLabel(s: string | undefined): string {
  return (
    { open: "Open", in_progress: "In progress", resolved: "Resolved", rejected: "Declined" }[
      s ?? ""
    ] ?? s ?? ""
  );
}

export async function recordEvent(
  issueId: string,
  kind: "status_changed" | "reopened" | "attachment_added",
  actor: { type: "owner" | "client" | "system"; name: string },
  metadata?: Record<string, any>,
) {
  await db.insert(events).values({
    id: nanoid(21),
    issueId,
    kind,
    actorType: actor.type,
    actorName: actor.name,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

export type OwnerIssueRow = {
  issueId: string;
  iterationNumber: number;
  title: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  priority: "low" | "normal" | "high" | "urgent";
  etaAt: Date | null;
  createdAt: Date;
  clientApprovedAt: Date | null;
  projectId: string;
  projectName: string;
  projectBrandColor: string | null;
  clientName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
};

export async function listAllIssuesForOwner(ownerId: string): Promise<OwnerIssueRow[]> {
  const rows = await db
    .select({
      issueId: issues.id,
      iterationNumber: issues.iterationNumber,
      title: issues.title,
      status: issues.status,
      priority: issues.priority,
      etaAt: issues.etaAt,
      createdAt: issues.createdAt,
      clientApprovedAt: issues.clientApprovedAt,
      projectId: projects.id,
      projectName: projects.name,
      projectBrandColor: projects.brandColor,
      clientName: projects.clientName,
      assigneeId: issues.assigneeId,
      assigneeName: teamMembers.name,
      assigneeColor: teamMembers.color,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(teamMembers, eq(teamMembers.id, issues.assigneeId))
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(issues.createdAt));
  return rows as OwnerIssueRow[];
}

export async function searchOwnerIssues(ownerId: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q.toLowerCase()}%`;

  const rows = await db
    .select({
      issueId: issues.id,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      iterationNumber: issues.iterationNumber,
      createdAt: issues.createdAt,
      projectId: projects.id,
      projectName: projects.name,
      clientName: projects.clientName,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(
      sql`${projects.ownerId} = ${ownerId} AND (
        lower(${issues.title}) LIKE ${like}
        OR lower(${issues.description}) LIKE ${like}
        OR lower(${projects.name}) LIKE ${like}
        OR lower(${projects.clientName}) LIKE ${like}
        OR ${issues.id} IN (
          SELECT issue_id FROM messages WHERE lower(body) LIKE ${like}
        )
      )`,
    )
    .orderBy(desc(issues.createdAt))
    .limit(50);

  return rows;
}

export async function listProjectPayments(projectId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.projectId, projectId))
    .orderBy(desc(payments.createdAt));
}
