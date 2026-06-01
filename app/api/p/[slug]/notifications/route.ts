import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, issues, messages, projects } from "@/lib/db/schema";

type Notif = {
  id: string;
  kind: "owner_reply" | "status_changed";
  createdAt: number;
  issueId: string;
  issueTitle: string;
  iterationNumber: number;
  authorName: string;
  body?: string;
  newStatus?: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const proj = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  if (proj.length === 0) return NextResponse.json({ notifications: [] });

  const projectId = proj[0].id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Owner replies in this project.
  const ownerMessages = await db
    .select({
      id: messages.id,
      issueId: messages.issueId,
      issueTitle: issues.title,
      iterationNumber: issues.iterationNumber,
      authorName: messages.authorName,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(issues, eq(issues.id, messages.issueId))
    .where(
      sql`${issues.projectId} = ${projectId} AND ${messages.authorType} = 'owner' AND ${messages.createdAt} >= ${since.getTime()}`,
    )
    .orderBy(desc(messages.createdAt));

  // Status changes performed by the owner (skip events where metadata.approval=true).
  const statusEvents = await db
    .select({
      id: events.id,
      issueId: events.issueId,
      issueTitle: issues.title,
      iterationNumber: issues.iterationNumber,
      actorName: events.actorName,
      metadata: events.metadata,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(issues, eq(issues.id, events.issueId))
    .where(
      sql`${issues.projectId} = ${projectId} AND ${events.kind} = 'status_changed' AND ${events.actorType} = 'owner' AND ${events.createdAt} >= ${since.getTime()}`,
    )
    .orderBy(desc(events.createdAt));

  const notifications: Notif[] = [];
  for (const m of ownerMessages) {
    notifications.push({
      id: `msg-${m.id}`,
      kind: "owner_reply",
      createdAt: m.createdAt.getTime(),
      issueId: m.issueId,
      issueTitle: m.issueTitle,
      iterationNumber: m.iterationNumber,
      authorName: m.authorName,
      body: m.body,
    });
  }
  for (const e of statusEvents) {
    let meta: any = {};
    try {
      meta = e.metadata ? JSON.parse(e.metadata) : {};
    } catch {}
    if (meta.approval) continue; // skip — that's the client approving, not the owner changing status
    notifications.push({
      id: `evt-${e.id}`,
      kind: "status_changed",
      createdAt: e.createdAt.getTime(),
      issueId: e.issueId,
      issueTitle: e.issueTitle,
      iterationNumber: e.iterationNumber,
      authorName: e.actorName,
      newStatus: meta.to,
    });
  }

  notifications.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ notifications: notifications.slice(0, 30) });
}
