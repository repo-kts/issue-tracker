"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import { deleteProjectUploads } from "@/lib/storage";

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

export type DeleteProjectState = { error?: string };

/**
 * Permanently delete a project after re-confirming the owner's account
 * password. Foreign keys are ON, so removing the project row cascades to its
 * issues, attachments, messages, events and payments; we then drop the
 * project's uploaded files from disk. On success this redirects to the
 * dashboard; on a bad password it returns an error and deletes nothing.
 */
export async function deleteProjectAction(
  _prevState: DeleteProjectState,
  formData: FormData,
): Promise<DeleteProjectState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!projectId) return { error: "Missing project." };
  if (!password) return { error: "Enter your password to confirm." };

  const owns = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (owns.length === 0) return { error: "Project not found." };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password — the project was not deleted." };

  await db.delete(projects).where(eq(projects.id, projectId));
  // Best-effort file cleanup; never block deletion on a filesystem hiccup.
  try {
    await deleteProjectUploads(projectId);
  } catch {}

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
