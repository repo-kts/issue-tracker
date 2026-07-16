import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { logoutAction } from "@/app/(auth)/actions";
import { listOwnerProjects } from "@/lib/projects";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { SidebarSubLink } from "./sidebar-link";
import { SearchBar } from "./search-bar";
import { initials, listTeamMembers } from "@/lib/team";

export async function Sidebar({
  userId,
  userEmail,
  userName,
  activeProjectId,
  activeIssueId,
}: {
  userId: string;
  userEmail: string;
  userName: string;
  activeProjectId?: string;
  activeIssueId?: string;
}) {
  const [projects, members] = await Promise.all([
    listOwnerProjects(userId),
    listTeamMembers(userId),
  ]);

  // Fetch issues for every project the owner has, so any project's chevron
  // can be expanded inline without needing to navigate to it first.
  const projectIds = projects.map((p) => p.id);
  const allIssueRows =
    projectIds.length > 0
      ? await db
          .select({
            id: issues.id,
            projectId: issues.projectId,
            title: issues.title,
            status: issues.status,
            iterationNumber: issues.iterationNumber,
          })
          .from(issues)
          .where(
            sql`${issues.projectId} IN (${sql.join(
              projectIds.map((p) => sql`${p}`),
              sql`,`,
            )})`,
          )
          .orderBy(asc(issues.iterationNumber))
      : [];
  const issuesByProject = new Map<string, typeof allIssueRows>();
  for (const i of allIssueRows) {
    const arr = issuesByProject.get(i.projectId) ?? [];
    arr.push(i);
    issuesByProject.set(i.projectId, arr);
  }

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border bg-[#08080a]">
      <div className="border-b border-border px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-mono text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          issue<span className="text-accent">Tracker</span>
        </Link>
      </div>

      <div className="border-b border-border pt-3">
        <SearchBar />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Projects
          </div>
          <Link
            href="/dashboard/new"
            className="text-muted hover:text-accent"
            title="New project"
          >
            +
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted">
            No projects yet.{" "}
            <Link href="/dashboard/new" className="text-accent hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <nav className="space-y-1">
            {projects.map((p) => {
              const isActive = p.id === activeProjectId;
              const overFree = p.totalIssues >= p.freeIterationLimit;
              const issuesForThisProject = issuesByProject.get(p.id) ?? [];
              return (
                <details key={p.id} className="group">
                  <summary className="flex list-none items-center gap-1 rounded-md px-1 py-1 hover:bg-panel">
                    <span className="w-4 shrink-0 text-center text-[10px] text-muted transition-transform group-open:rotate-90">
                      ›
                    </span>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-0.5 text-sm ${
                        isActive ? "text-accent" : "text-text"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                          overFree
                            ? "bg-accent/20 text-accent"
                            : "bg-[#17171b] text-muted"
                        }`}
                      >
                        {p.totalIssues}/{p.freeIterationLimit + p.paidIterations}
                      </span>
                    </Link>
                  </summary>

                  {issuesForThisProject.length > 0 ? (
                    <div className="mt-1 ml-5 space-y-0.5 border-l border-border pl-2">
                      {issuesForThisProject.map((issue) => (
                        <SidebarSubLink
                          key={issue.id}
                          href={`/dashboard/projects/${p.id}/issues/${issue.id}`}
                          active={issue.id === activeIssueId}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <StatusDot status={issue.status} />
                            <span className="font-mono text-[10px] text-muted">
                              #{issue.iterationNumber}
                            </span>
                            <span className="truncate">{issue.title}</span>
                          </span>
                        </SidebarSubLink>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 ml-5 border-l border-border pl-2 py-1 text-[11px] text-muted">
                      No issues yet.
                    </div>
                  )}
                </details>
              );
            })}
          </nav>
        )}

        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-1">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>
              Team
              {members.length > 0 && (
                <span className="normal-case text-muted">({members.length})</span>
              )}
            </span>
            <Link
              href="/dashboard/team"
              className="text-muted hover:text-accent"
              title="Manage team"
            >
              +
            </Link>
          </summary>

          <div className="mt-2">
            {members.length === 0 ? (
              <Link
                href="/dashboard/team"
                className="block rounded-md px-2 py-2 text-xs text-muted hover:bg-panel hover:text-text"
              >
                No team members yet. <span className="text-accent">Add someone →</span>
              </Link>
            ) : (
              <nav className="space-y-1">
                {members.map((m) => (
                  <Link
                    key={m.id}
                    href="/dashboard/team"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-panel"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-black"
                      style={{ background: m.color }}
                      title={m.name}
                    >
                      {initials(m.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    {m.role && (
                      <span className="hidden truncate text-[10px] text-muted md:inline">
                        {m.role}
                      </span>
                    )}
                  </Link>
                ))}
                <Link
                  href="/dashboard/team"
                  className="block rounded-md px-2 py-1.5 text-xs text-muted hover:bg-panel hover:text-text"
                >
                  Manage team →
                </Link>
              </nav>
            )}
          </div>
        </details>
      </div>

      <div className="border-t border-border px-3 py-3">
        <div className="px-2 pb-2">
          <div className="truncate text-sm font-medium">{userName}</div>
          <div className="truncate text-xs text-muted">{userEmail}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted hover:bg-panel hover:text-text"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    open: "bg-orange-400",
    in_progress: "bg-blue-400",
    resolved: "bg-success",
    rejected: "bg-danger",
  };
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${color[status] ?? "bg-muted"}`}
    />
  );
}
