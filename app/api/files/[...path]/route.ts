import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const rel = parts.join("/");
  const fullPath = path.resolve(UPLOAD_DIR, rel);

  // Guard against path traversal.
  if (!fullPath.startsWith(UPLOAD_DIR + path.sep) && fullPath !== UPLOAD_DIR) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Lookup mime type from DB. (Cheap; supports small SaaS scale.)
  const row = await db
    .select({ mimeType: attachments.mimeType, filename: attachments.filename })
    .from(attachments)
    .where(eq(attachments.storedPath, rel))
    .limit(1);

  try {
    const data = await fs.readFile(fullPath);
    const mime = row[0]?.mimeType ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
