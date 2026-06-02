import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "./_components/sidebar";
import { SidebarShell } from "./_components/sidebar-shell";
import { NotificationBell } from "./_components/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const projectMatch = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
  const issueMatch = pathname.match(
    /^\/dashboard\/projects\/[^/]+\/issues\/([^/]+)/,
  );
  const activeProjectId = projectMatch?.[1];
  const activeIssueId = issueMatch?.[1];

  return (
    <div className="min-h-screen lg:flex">
      <SidebarShell>
        <Sidebar
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          activeProjectId={activeProjectId}
          activeIssueId={activeIssueId}
        />
      </SidebarShell>
      <main className="relative min-w-0 flex-1 overflow-x-hidden">
        <div className="pointer-events-none absolute right-6 top-4 z-30 hidden lg:block">
          <div className="pointer-events-auto">
            <NotificationBell />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
