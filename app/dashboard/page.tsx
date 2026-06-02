import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAllIssuesForOwner, listOwnerProjects } from "@/lib/projects";
import { FREE_ITERATIONS_PER_PROJECT } from "@/lib/config";
import { IssueMatrix } from "./_components/issue-matrix";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; project?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [projects, allIssues] = await Promise.all([
    listOwnerProjects(user.id),
    listAllIssuesForOwner(user.id),
  ]);
  const { status = "all", priority = "all", project = "all" } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Projects and every change request in one view.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn-primary">
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-3 text-3xl">📋</div>
          <div className="mb-2 text-lg font-medium">No projects yet</div>
          <p className="mb-6 max-w-md text-sm text-muted">
            Create your first project. You'll get a unique link to share with the client.
            They can start submitting change requests immediately — no signup for them.
          </p>
          <Link href="/dashboard/new" className="btn-primary">
            Create your first project
          </Link>
        </div>
      ) : (
        <IssueMatrix
          rows={allIssues}
          statusFilter={status}
          priorityFilter={priority}
          projectFilter={project}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            brandColor: p.brandColor ?? null,
          }))}
        />
      )}

      <div className="mt-12 text-xs text-muted">
        Free tier: {FREE_ITERATIONS_PER_PROJECT} iterations per project. After that, clients
        must pay to submit additional changes.
      </div>
    </div>
  );
}
