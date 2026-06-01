"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";

export async function updateIssueStatus(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "open"
    | "in_progress"
    | "resolved"
    | "rejected";
  const projectId = String(formData.get("projectId") ?? "");

  if (!issueId || !status || !projectId) return;

  // Verify the issue belongs to a project owned by the user.
  const owns = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (owns.length === 0) return;

  await db
    .update(issues)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
    })
    .where(eq(issues.id, issueId));

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateOwnerNotes(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const notes = String(formData.get("ownerNotes") ?? "");
  const projectId = String(formData.get("projectId") ?? "");

  const owns = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (owns.length === 0) return;

  await db.update(issues).set({ ownerNotes: notes }).where(eq(issues.id, issueId));
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function grantIterationsAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const count = Math.max(1, Math.min(50, Number(formData.get("count") ?? 1)));

  const owns = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (owns.length === 0) return;

  await db
    .update(projects)
    .set({ paidIterations: sql`${projects.paidIterations} + ${count}` })
    .where(eq(projects.id, projectId));

  revalidatePath(`/dashboard/projects/${projectId}`);
}
