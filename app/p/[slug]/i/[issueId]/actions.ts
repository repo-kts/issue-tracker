"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { attachments, events, issues, messages } from "@/lib/db/schema";
import { getProjectBySlug } from "@/lib/projects";
import { classifyKind, saveUpload } from "@/lib/storage";

export async function postClientMessageAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const authorName = String(formData.get("authorName") ?? "").trim() || "Client";
  const body = String(formData.get("body") ?? "").trim();
  if (!slug || !issueId) return;

  const files = (formData.getAll("attachments") as File[]).filter(
    (f) => f && typeof f === "object" && f.size > 0,
  );
  const linkUrls = formData.getAll("linkUrls").map(String);
  const linkLabels = formData.getAll("linkLabels").map(String);

  if (!body && files.length === 0 && linkUrls.length === 0) return;

  const project = await getProjectBySlug(slug);
  if (!project || project.status !== "active") return;

  // Confirm this issue belongs to that project.
  const issueRow = await db
    .select({ id: issues.id, projectId: issues.projectId })
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);
  if (issueRow.length === 0 || issueRow[0].projectId !== project.id) return;

  const messageId = nanoid(21);
  await db.insert(messages).values({
    id: messageId,
    issueId,
    authorType: "client",
    authorName,
    body,
  });

  for (const f of files) {
    const stored = await saveUpload(f, `project-${project.id}/issue-${issueId}/replies`);
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

  revalidatePath(`/p/${slug}/i/${issueId}`);
  revalidatePath(`/dashboard/projects/${project.id}/issues/${issueId}`);
}

export async function updateIssueDetailsAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const editorName = String(formData.get("editorName") ?? "").trim();

  if (!slug || !issueId || !title) return;

  const project = await getProjectBySlug(slug);
  if (!project || project.status !== "active") return;

  const issueRow = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      description: issues.description,
      submitterName: issues.submitterName,
    })
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);
  if (issueRow.length === 0 || issueRow[0].projectId !== project.id) return;
  const original = issueRow[0];

  const titleChanged = title !== original.title;
  const descriptionChanged = description !== (original.description ?? "");

  const files = (formData.getAll("attachments") as File[]).filter(
    (f) => f && typeof f === "object" && f.size > 0,
  );
  const linkUrls = formData.getAll("linkUrls").map(String);
  const linkLabels = formData.getAll("linkLabels").map(String);
  const newLinks = linkUrls.filter((u) => u.trim());

  const anyChange = titleChanged || descriptionChanged || files.length > 0 || newLinks.length > 0;
  if (!anyChange) return;

  // Update title + description.
  if (titleChanged || descriptionChanged) {
    await db
      .update(issues)
      .set({ title, description })
      .where(eq(issues.id, issueId));
  }

  // Append new attachments (no messageId — they belong to the original issue).
  for (const f of files) {
    const stored = await saveUpload(f, `project-${project.id}/issue-${issueId}`);
    await db.insert(attachments).values({
      id: nanoid(21),
      issueId,
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
      kind: "link",
      filename: (linkLabels[i] ?? "").trim() || url,
      storedPath: url,
      mimeType: "text/uri-list",
      sizeBytes: 0,
    });
  }

  // Record an event for the timeline.
  const changes: string[] = [];
  if (titleChanged) changes.push("title");
  if (descriptionChanged) changes.push("description");
  if (files.length > 0) changes.push(`${files.length} file${files.length === 1 ? "" : "s"}`);
  if (newLinks.length > 0) changes.push(`${newLinks.length} link${newLinks.length === 1 ? "" : "s"}`);

  await db.insert(events).values({
    id: nanoid(21),
    issueId,
    kind: "attachment_added",
    actorType: "client",
    actorName: editorName || original.submitterName || project.clientName,
    metadata: JSON.stringify({ edit: true, changes }),
  });

  revalidatePath(`/p/${slug}/i/${issueId}`);
  revalidatePath(`/dashboard/projects/${project.id}/issues/${issueId}`);
}

export async function approveResolutionAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const approverName = String(formData.get("approverName") ?? "").trim() || "Client";
  if (!slug || !issueId) return;

  const project = await getProjectBySlug(slug);
  if (!project) return;

  const row = await db
    .select({ id: issues.id, projectId: issues.projectId, status: issues.status, approved: issues.clientApprovedAt })
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);
  if (row.length === 0 || row[0].projectId !== project.id) return;
  if (row[0].status !== "resolved") return; // can only approve a resolved issue
  if (row[0].approved) return; // already approved

  const now = new Date();
  await db
    .update(issues)
    .set({ clientApprovedAt: now, clientApprovedBy: approverName })
    .where(eq(issues.id, issueId));

  // Record an event so it shows up on the timeline.
  await db.insert(events).values({
    id: nanoid(21),
    issueId,
    kind: "status_changed", // reuse kind; the meta marks it as approval
    actorType: "client",
    actorName: approverName,
    metadata: JSON.stringify({ approval: true, to: "approved" }),
  });

  revalidatePath(`/p/${slug}/i/${issueId}`);
  revalidatePath(`/dashboard/projects/${project.id}/issues/${issueId}`);
}
