import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, issues, messages, projects, users } from "@/lib/db/schema";

type Notif = {
  id: string;
  kind: "new_issue" | "client_reply" | "client_approved";
  createdAt: number;
  issueId: string;
  issueTitle: string;
  iterationNumber: number;
  projectId: string;
  projectName: string;
  clientName: string;
  actorName: string;
  body?: string;
  unread: boolean;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const lastRead = user.lastNotificationsReadAt
    ? user.lastNotificationsReadAt.getTime()
    : 0;

  // Pull recent (last 30 days) client-driven activity across all owner's projects.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const ownerProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: projects.clientName,
    })
    .from(projects)
    .where(eq(projects.ownerId, user.id));
  if (ownerProjects.length === 0)
    return NextResponse.json({ notifications: [], unreadCount: 0 });

  const projectMap = new Map(ownerProjects.map((p) => [p.id, p]));
  const projIds = ownerProjects.map((p) => p.id);
  const projIdList = sql.join(
    projIds.map((p) => sql`${p}`),
    sql`,`,
  );

  // New issues.
  const newIssues = await db
    .select({
      id: issues.id,
      title: issues.title,
      iterationNumber: issues.iterationNumber,
      projectId: issues.projectId,
      submitterName: issues.submitterName,
      createdAt: issues.createdAt,
    })
    .from(issues)
    .where(
      sql`${issues.projectId} IN (${projIdList}) AND ${issues.createdAt} >= ${since.getTime()}`,
    )
    .orderBy(desc(issues.createdAt));

  // Client replies.
  const clientMessages = await db
    .select({
      id: messages.id,
      issueId: messages.issueId,
      authorName: messages.authorName,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(issues, eq(issues.id, messages.issueId))
    .where(
      sql`${issues.projectId} IN (${projIdList}) AND ${messages.authorType} = 'client' AND ${messages.createdAt} >= ${since.getTime()}`,
    )
    .orderBy(desc(messages.createdAt));

  // Client approvals (events with metadata.approval=true).
  const approvalEvents = await db
    .select({
      id: events.id,
      issueId: events.issueId,
      actorName: events.actorName,
      metadata: events.metadata,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(issues, eq(issues.id, events.issueId))
    .where(
      sql`${issues.projectId} IN (${projIdList}) AND ${events.actorType} = 'client' AND ${events.createdAt} >= ${since.getTime()}`,
    )
    .orderBy(desc(events.createdAt));

  // Need issue metadata (title, iterationNumber, projectId) for messages + events.
  const referencedIssueIds = new Set<string>();
  for (const m of clientMessages) referencedIssueIds.add(m.issueId);
  for (const e of approvalEvents) referencedIssueIds.add(e.issueId);
  let issueMap = new Map<
    string,
    { id: string; title: string; iterationNumber: number; projectId: string }
  >();
  if (referencedIssueIds.size > 0) {
    const refIds = Array.from(referencedIssueIds);
    const rows = await db
      .select({
        id: issues.id,
        title: issues.title,
        iterationNumber: issues.iterationNumber,
        projectId: issues.projectId,
      })
      .from(issues)
      .where(
        sql`${issues.id} IN (${sql.join(
          refIds.map((i) => sql`${i}`),
          sql`,`,
        )})`,
      );
    issueMap = new Map(rows.map((r) => [r.id, r]));
  }

  const notifications: Notif[] = [];
  for (const i of newIssues) {
    const proj = projectMap.get(i.projectId);
    if (!proj) continue;
    notifications.push({
      id: `issue-${i.id}`,
      kind: "new_issue",
      createdAt: i.createdAt.getTime(),
      issueId: i.id,
      issueTitle: i.title,
      iterationNumber: i.iterationNumber,
      projectId: proj.id,
      projectName: proj.name,
      clientName: proj.clientName,
      actorName: i.submitterName ?? proj.clientName,
      unread: i.createdAt.getTime() > lastRead,
    });
  }
  for (const m of clientMessages) {
    const meta = issueMap.get(m.issueId);
    if (!meta) continue;
    const proj = projectMap.get(meta.projectId);
    if (!proj) continue;
    notifications.push({
      id: `msg-${m.id}`,
      kind: "client_reply",
      createdAt: m.createdAt.getTime(),
      issueId: meta.id,
      issueTitle: meta.title,
      iterationNumber: meta.iterationNumber,
      projectId: proj.id,
      projectName: proj.name,
      clientName: proj.clientName,
      actorName: m.authorName,
      body: m.body,
      unread: m.createdAt.getTime() > lastRead,
    });
  }
  for (const e of approvalEvents) {
    let isApproval = false;
    try {
      isApproval = e.metadata
        ? Boolean(JSON.parse(e.metadata).approval)
        : false;
    } catch {}
    if (!isApproval) continue;
    const meta = issueMap.get(e.issueId);
    if (!meta) continue;
    const proj = projectMap.get(meta.projectId);
    if (!proj) continue;
    notifications.push({
      id: `evt-${e.id}`,
      kind: "client_approved",
      createdAt: e.createdAt.getTime(),
      issueId: meta.id,
      issueTitle: meta.title,
      iterationNumber: meta.iterationNumber,
      projectId: proj.id,
      projectName: proj.name,
      clientName: proj.clientName,
      actorName: e.actorName,
      unread: e.createdAt.getTime() > lastRead,
    });
  }

  notifications.sort((a, b) => b.createdAt - a.createdAt);
  const unreadCount = notifications.filter((n) => n.unread).length;

  return NextResponse.json({
    notifications: notifications.slice(0, 30),
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "mark_all_read") {
    await db
      .update(users)
      .set({ lastNotificationsReadAt: new Date() })
      .where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
