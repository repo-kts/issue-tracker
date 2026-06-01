"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { ensureAdminUser } from "@/lib/bootstrap";

export type ActionState = { error?: string } | undefined;

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await ensureAdminUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const row = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (row.length === 0) return { error: "Invalid email or password." };
  const ok = await verifyPassword(password, row[0].passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  await createSession(row[0].id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
