"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
} from "@/lib/team";

const palette = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#ef4444",
];

export async function addMemberAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "").trim() || null;
  let color = String(formData.get("color") ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    color = palette[Math.floor(Math.random() * palette.length)];
  }
  if (!name) return;

  await addTeamMember({ ownerId: user.id, name, email, role, color });
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
}

export async function updateMemberAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim();
  if (!id || !name) return;
  await updateTeamMember(id, user.id, {
    name,
    email,
    role,
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined,
  });
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeTeamMember(id, user.id);
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
}
