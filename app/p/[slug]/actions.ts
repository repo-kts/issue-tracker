"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, issues } from "@/lib/db/schema";
import { getProjectBySlug, getIterationStatus } from "@/lib/projects";
import { saveUpload, classifyKind } from "@/lib/storage";

export async function submitIssueAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const submitterName = String(formData.get("submitterName") ?? "").trim();

  if (!slug) return;
  const project = await getProjectBySlug(slug);
  if (!project || project.status !== "active") return;

  const status = await getIterationStatus(project.id);
  if (status.needsPayment) {
    redirect(`/p/${slug}/pay`);
  }

  if (!title) {
    redirect(`/p/${slug}/new?error=title`);
  }

  const files = formData.getAll("attachments") as File[];
  const validFiles = files.filter((f) => f && typeof f === "object" && f.size > 0);

  const issueId = nanoid(21);
  // Atomically determine next iteration number = current count + 1.
  const nextIterRow = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(issues)
    .where(sql`${issues.projectId} = ${project.id}`);
  const iterationNumber = (nextIterRow[0]?.c ?? 0) + 1;

  await db.insert(issues).values({
    id: issueId,
    projectId: project.id,
    iterationNumber,
    title,
    description,
    submitterName: submitterName || null,
    billable: iterationNumber > project.freeIterationLimit,
  });

  for (const file of validFiles) {
    const stored = await saveUpload(file, `project-${project.id}/issue-${issueId}`);
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

  // Reference links. URLs and labels arrive as paired arrays from the form.
  const linkUrls = formData.getAll("linkUrls").map(String);
  const linkLabels = formData.getAll("linkLabels").map(String);
  for (let i = 0; i < linkUrls.length; i++) {
    const url = linkUrls[i].trim();
    if (!url) continue;
    try {
      new URL(url);
    } catch {
      continue; // skip invalid URLs silently
    }
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

  revalidatePath(`/p/${slug}`);
  revalidatePath(`/dashboard/projects/${project.id}`);
  redirect(`/p/${slug}?submitted=1`);
}
