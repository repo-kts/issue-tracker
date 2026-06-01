import Link from "next/link";

export function SidebarLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent/15 text-accent"
          : "text-text hover:bg-panel"
      }`}
    >
      {children}
    </Link>
  );
}

export function SidebarSubLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-panel hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}
