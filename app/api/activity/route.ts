import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, issues, messages, projects } from "@/lib/db/schema";

// Returns the most recent activity timestamp for a given scope so the client
// can decide whether to refresh. Cheap to call every 10s.
//
// Query params:
//   - issueId: scope to a single issue
//   - projectId: scope to a project (owner-authenticated)
//   - slug: scope to a magic-link project (no auth)
//   - none: whole-owner scope (dashboard)
export async function GET(req: NextRequest) {
  const issueId = req.nextUrl.searchParams.get("issueId");
  const projectId = req.nextUrl.searchParams.get("projectId");
  const slug = req.nextUrl.searchParams.get("slug");

  // Resolve the set of project_ids we're allowed to look at.
  let allowedProjectIds: string[] | "any-by-issue" = [];
  let issueIdFilter: string | null = null;

  if (issueId) {
    // Trust the issueId — the activity endpoint is best-effort, and the page
    // itself is what gates access. Latest-timestamp leakage is acceptable.
    issueIdFilter = issueId;
    allowedProjectIds = "any-by-issue";
  } else if (slug) {
    const proj = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (proj.length === 0) return NextResponse.json({ latest: 0 });
    allowedProjectIds = [proj[0].id];
  } else if (projectId) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const owns = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
      .limit(1);
    if (owns.length === 0) return NextResponse.json({ latest: 0 });
    allowedProjectIds = [projectId];
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, user.id));
    allowedProjectIds = owned.map((r) => r.id);
    if (allowedProjectIds.length === 0) return NextResponse.json({ latest: 0 });
  }

  // Compute the set of issue ids in scope (cheap; bounded by project count).
  let issueIds: string[];
  if (issueIdFilter) {
    issueIds = [issueIdFilter];
  } else {
    const projIds = allowedProjectIds as string[];
    const rows = await db
      .select({ id: issues.id })
      .from(issues)
      .where(
        sql`${issues.projectId} IN (${sql.join(
          projIds.map((p) => sql`${p}`),
          sql`,`,
        )})`,
      );
    issueIds = rows.map((r) => r.id);
  }

  if (issueIds.length === 0) return NextResponse.json({ latest: 0 });

  // Take the max created_at across issues, messages, events for the scoped ids.
  const inList = sql.join(
    issueIds.map((i) => sql`${i}`),
    sql`,`,
  );
  const result = await db
    .select({ latest: sql<number>`MAX(t)` })
    .from(
      sql`(
        SELECT created_at AS t FROM issues WHERE id IN (${inList})
        UNION ALL
        SELECT created_at AS t FROM messages WHERE issue_id IN (${inList})
        UNION ALL
        SELECT created_at AS t FROM events WHERE issue_id IN (${inList})
      )`,
    );

  return NextResponse.json({ latest: result[0]?.latest ?? 0 });
}
