"use server";

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { FREE_ITERATIONS_PER_PROJECT } from "@/lib/config";
import { saveUpload } from "@/lib/storage";

export type NewProjectState = { error?: string } | undefined;

export async function createProjectAction(
  formData: FormData,
): Promise<NewProjectState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const projectUrlRaw = String(formData.get("projectUrl") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const dueDateStr = String(formData.get("dueDate") ?? "").trim();
  const logoFile = formData.get("logo");
  const freeIterationLimit =
    Number(formData.get("freeIterationLimit") ?? FREE_ITERATIONS_PER_PROJECT) ||
    FREE_ITERATIONS_PER_PROJECT;

  if (!name) return { error: "Project name is required." };
  if (!clientName) return { error: "Client name is required." };
  if (freeIterationLimit < 1 || freeIterationLimit > 50)
    return { error: "Free iteration limit must be between 1 and 50." };

  // Normalize project URL (allow domain-only input).
  let projectUrl: string | null = null;
  if (projectUrlRaw) {
    const candidate = /^https?:\/\//i.test(projectUrlRaw)
      ? projectUrlRaw
      : `https://${projectUrlRaw}`;
    try {
      new URL(candidate);
      projectUrl = candidate;
    } catch {
      return { error: "Project URL doesn't look valid." };
    }
  }

  const id = nanoid(21);
  const slug = nanoid(12);

  // Save logo if uploaded.
  let logoPath: string | null = null;
  if (logoFile && typeof logoFile === "object" && logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { error: "Logo must be an image file." };
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      return { error: "Logo must be under 5 MB." };
    }
    const stored = await saveUpload(logoFile, `project-${id}/branding`);
    logoPath = stored.storedPath;
  }

  let dueDate: Date | null = null;
  if (dueDateStr) {
    const parsed = new Date(dueDateStr);
    if (!isNaN(parsed.getTime())) dueDate = parsed;
  }

  const validHex = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : null;

  await db.insert(projects).values({
    id,
    ownerId: user.id,
    name,
    clientName,
    clientEmail: clientEmail || null,
    description: description || null,
    projectUrl,
    logoPath,
    brandColor: validHex,
    dueDate,
    slug,
    freeIterationLimit,
  });

  redirect(`/dashboard/projects/${id}?created=1`);
}
