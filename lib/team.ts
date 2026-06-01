import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import { teamMembers } from "./db/schema";

export async function listTeamMembers(ownerId: string) {
  return db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.ownerId, ownerId))
    .orderBy(asc(teamMembers.name));
}

export async function getTeamMember(id: string, ownerId: string) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function addTeamMember(input: {
  ownerId: string;
  name: string;
  email?: string | null;
  role?: string | null;
  color?: string | null;
}) {
  const id = nanoid(21);
  await db.insert(teamMembers).values({
    id,
    ownerId: input.ownerId,
    name: input.name,
    email: input.email ?? null,
    role: input.role ?? null,
    color: input.color || "#f97316",
  });
  return id;
}

export async function updateTeamMember(
  id: string,
  ownerId: string,
  patch: { name?: string; email?: string | null; role?: string | null; color?: string },
) {
  await db
    .update(teamMembers)
    .set(patch)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, ownerId)));
}

export async function removeTeamMember(id: string, ownerId: string) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, ownerId)));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
