"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attachments, issues, messages, projects, teamMembers } from "@/lib/db/schema";
import { recordEvent } from "@/lib/projects";
import { classifyKind, saveUpload } from "@/lib/storage";

async function assertOwnerOwnsIssue(
  issueId: string,
  projectId: string,
  userId: string,
) {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(issues, eq(issues.projectId, projects.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerId, userId),
        eq(issues.id, issueId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function postOwnerMessageAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!issueId || !projectId) return;

  const files = (formData.getAll("attachments") as File[]).filter(
    (f) => f && typeof f === "object" && f.size > 0,
  );
  const linkUrls = formData.getAll("linkUrls").map(String);
  const linkLabels = formData.getAll("linkLabels").map(String);

  if (!body && files.length === 0 && linkUrls.length === 0) return;

  if (!(await assertOwnerOwnsIssue(issueId, projectId, user.id))) return;

  const messageId = nanoid(21);
  await db.insert(messages).values({
    id: messageId,
    issueId,
    authorType: "owner",
    authorName: user.name,
    body,
  });

  for (const f of files) {
    const stored = await saveUpload(f, `project-${projectId}/issue-${issueId}/replies`);
    await db.insert(attachments).values({
      id: nanoid(21),
      issueId,
      messageId,
      kind: classifyKind(stored.mimeType),
      filename: stored.filename,
      storedPath: stored.storedPath,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    });
  }
  for (let i = 0; i < linkUrls.length; i++) {
    const url = linkUrls[i].trim();
    if (!url) continue;
    try { new URL(url); } catch { continue; }
    await db.insert(attachments).values({
      id: nanoid(21),
      issueId,
      messageId,
      kind: "link",
      filename: (linkLabels[i] ?? "").trim() || url,
      storedPath: url,
      mimeType: "text/uri-list",
      sizeBytes: 0,
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}/issues/${issueId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function setIssuePriorityAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const priority = String(formData.get("priority") ?? "") as
    | "low"
    | "normal"
    | "high"
    | "urgent";
  if (!["low", "normal", "high", "urgent"].includes(priority)) return;
  if (!(await assertOwnerOwnsIssue(issueId, projectId, user.id))) return;

  await db.update(issues).set({ priority }).where(eq(issues.id, issueId));

  revalidatePath(`/dashboard/projects/${projectId}/issues/${issueId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function setIssueEtaAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const etaStr = String(formData.get("etaAt") ?? "").trim();
  if (!(await assertOwnerOwnsIssue(issueId, projectId, user.id))) return;

  const etaAt = etaStr ? new Date(etaStr) : null;
  await db
    .update(issues)
    .set({ etaAt: etaAt && !isNaN(etaAt.getTime()) ? etaAt : null })
    .where(eq(issues.id, issueId));

  revalidatePath(`/dashboard/projects/${projectId}/issues/${issueId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function assignIssueAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const assigneeIdRaw = String(formData.get("assigneeId") ?? "");
  const assigneeId = assigneeIdRaw === "" ? null : assigneeIdRaw;
  if (!(await assertOwnerOwnsIssue(issueId, projectId, user.id))) return;

  // Validate assignee belongs to this owner.
  let assigneeName = "Unassigned";
  if (assigneeId) {
    const rows = await db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(and(eq(teamMembers.id, assigneeId), eq(teamMembers.ownerId, user.id)))
      .limit(1);
    if (rows.length === 0) return;
    assigneeName = rows[0].name;
  }

  await db.update(issues).set({ assigneeId }).where(eq(issues.id, issueId));
  await recordEvent(issueId, "assigned" as any, { type: "owner", name: user.name }, {
    assigneeId,
    assigneeName,
  });

  revalidatePath(`/dashboard/projects/${projectId}/issues/${issueId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function setIssueStatusAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "open"
    | "in_progress"
    | "resolved"
    | "rejected";
  if (!issueId || !projectId || !status) return;

  if (!(await assertOwnerOwnsIssue(issueId, projectId, user.id))) return;

  // Read previous status so we can record the transition.
  const prev = await db
    .select({ status: issues.status })
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);
  const fromStatus = prev[0]?.status;

  await db
    .update(issues)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
    })
    .where(eq(issues.id, issueId));

  if (fromStatus !== status) {
    await recordEvent(issueId, "status_changed", { type: "owner", name: user.name }, {
      from: fromStatus,
      to: status,
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}/issues/${issueId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}
