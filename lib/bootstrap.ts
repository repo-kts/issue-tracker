import "server-only";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

let bootstrapPromise: Promise<void> | null = null;

export function ensureAdminUser(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "";
    const name = (process.env.ADMIN_NAME ?? "Admin").trim();

    if (!email || !password) {
      console.warn(
        "[bootstrap] ADMIN_EMAIL or ADMIN_PASSWORD missing — admin user not created. Set them in .env.local.",
      );
      return;
    }

    const existing = await db
      .select({ id: users.id, passwordHash: users.passwordHash, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing.length === 0) {
      await db.insert(users).values({
        id: nanoid(21),
        email,
        passwordHash,
        name,
      });
      console.log(`[bootstrap] Created admin user ${email}`);
    } else {
      // Keep the admin password in sync with the env var so the operator
      // can rotate it by editing .env.local and restarting.
      const matches = await bcrypt.compare(password, existing[0].passwordHash);
      if (!matches || existing[0].name !== name) {
        await db
          .update(users)
          .set({ passwordHash, name })
          .where(eq(users.id, existing[0].id));
        console.log(`[bootstrap] Updated admin password/name for ${email}`);
      }
    }
  })().catch((err) => {
    console.error("[bootstrap] failed:", err);
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}
