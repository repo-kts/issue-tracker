import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/projects";
import { ClientNotificationBell } from "./_components/client-notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ClientPortalLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const brand = project.brandColor && /^#[0-9a-fA-F]{6}$/.test(project.brandColor)
    ? project.brandColor
    : null;
  const logoUrl = project.logoPath
    ? `/api/files/${project.logoPath.split("/").map(encodeURIComponent).join("/")}`
    : null;

  return (
    <main
      className="min-h-screen"
      style={brand ? ({ ["--brand" as any]: brand } as React.CSSProperties) : undefined}
    >
      <nav
        className="border-b border-border bg-surface px-4 py-3 sm:px-6"
        style={brand ? { borderBottomColor: `${brand}33` } : undefined}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href={`/p/${slug}`}
            className="flex min-w-0 items-center gap-3 text-sm hover:opacity-90"
          >
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={`${project.name} logo`}
                className="h-8 w-8 shrink-0 rounded object-contain bg-white/5"
              />
            ) : (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: brand ?? "#f97316" }}
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{project.name}</span>
              <span className="block truncate text-xs text-muted">
                {project.projectUrl ? (
                  <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {new URL(project.projectUrl).hostname}
                  </a>
                ) : (
                  "client portal"
                )}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-muted sm:block">
              Signed in as <span className="text-text">{project.clientName}</span>
            </div>
            <ClientNotificationBell slug={slug} />
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <div>{children}</div>
    </main>
  );
}
