import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attachments, issues, messages, projects } from "@/lib/db/schema";
import { IssuePdf } from "@/lib/pdf/issue-pdf";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { issueId } = await params;

  // Load issue + project + ownership check.
  const rows = await db
    .select({
      issue: issues,
      project: projects,
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .where(and(eq(issues.id, issueId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (rows.length === 0)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { issue, project } = rows[0];

  const issueAtts = await db
    .select()
    .from(attachments)
    .where(eq(attachments.issueId, issueId))
    .orderBy(asc(attachments.createdAt));

  const messagesRaw = await db
    .select()
    .from(messages)
    .where(eq(messages.issueId, issueId))
    .orderBy(asc(messages.createdAt));

  // Pre-load image bytes so React-PDF can embed them.
  const originalAtts = issueAtts.filter((a) => !a.messageId);
  const replyAttsByMessage = new Map<string, typeof issueAtts>();
  for (const a of issueAtts) {
    if (!a.messageId) continue;
    const arr = replyAttsByMessage.get(a.messageId) ?? [];
    arr.push(a);
    replyAttsByMessage.set(a.messageId, arr);
  }

  const embedImages = await Promise.all(
    originalAtts.map(async (a) => {
      if (a.kind !== "image") return { ...a, imageData: undefined };
      try {
        const buf = await readUpload(a.storedPath);
        return { ...a, imageData: buf };
      } catch {
        return { ...a, imageData: undefined };
      }
    }),
  );

  const enrichedMessages = messagesRaw.map((m) => ({
    id: m.id,
    authorType: m.authorType,
    authorName: m.authorName,
    body: m.body,
    createdAt: m.createdAt,
    attachments: (replyAttsByMessage.get(m.id) ?? []).map((a) => ({
      id: a.id,
      kind: a.kind,
      filename: a.filename,
      storedPath: a.storedPath,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  }));

  const pdfBuffer = await renderToBuffer(
    <IssuePdf
      data={{
        project: {
          name: project.name,
          clientName: project.clientName,
          clientEmail: project.clientEmail,
          projectUrl: project.projectUrl,
          brandColor: project.brandColor,
        },
        issue: {
          iterationNumber: issue.iterationNumber,
          title: issue.title,
          description: issue.description ?? "",
          status: issue.status,
          priority: issue.priority,
          submitterName: issue.submitterName,
          createdAt: issue.createdAt,
          etaAt: issue.etaAt,
          resolvedAt: issue.resolvedAt,
          clientApprovedAt: issue.clientApprovedAt,
          clientApprovedBy: issue.clientApprovedBy,
        },
        attachments: embedImages.map((a) => ({
          id: a.id,
          kind: a.kind,
          filename: a.filename,
          storedPath: a.storedPath,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          imageData: a.imageData,
        })),
        messages: enrichedMessages,
        generatedAt: new Date(),
      }}
    />,
  );

  const safeName = `${project.name}-${issue.iterationNumber}-${issue.title}`
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
