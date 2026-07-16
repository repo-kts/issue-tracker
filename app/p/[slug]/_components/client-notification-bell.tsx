"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notif = {
  id: string;
  kind: "owner_reply" | "status_changed";
  createdAt: number;
  issueId: string;
  issueTitle: string;
  iterationNumber: number;
  authorName: string;
  body?: string;
  newStatus?: string;
};

export function ClientNotificationBell({ slug }: { slug: string }) {
  const storageKey = `notif-read-${slug}`;
  const [items, setItems] = useState<Notif[]>([]);
  const [lastRead, setLastRead] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initial read of localStorage (only after mount to avoid SSR hydration mismatch).
  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    setLastRead(raw ? Number(raw) || 0 : 0);
  }, [storageKey]);

  const load = async () => {
    try {
      const res = await fetch(`/api/p/${slug}/notifications`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
    } catch {}
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = items.filter((n) => n.createdAt > lastRead).length;

  const markAllRead = () => {
    const now = Date.now();
    window.localStorage.setItem(storageKey, String(now));
    setLastRead(now);
  };

  const handleItemClick = () => {
    markAllRead();
    setOpen(false);
    router.refresh();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-text"
        aria-label="Notifications"
        title="Notifications"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[340px] overflow-hidden rounded-md border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-sm font-medium">
              Updates
              {unread > 0 && (
                <span className="ml-2 text-xs text-muted">({unread} new)</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-10 text-center text-xs text-muted">
                Nothing yet. We'll let you know when the team replies or moves a request.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/p/${slug}/i/${n.issueId}`}
                      onClick={handleItemClick}
                      className={`flex items-start gap-3 px-3 py-3 hover:bg-panel ${
                        n.createdAt > lastRead ? "bg-accent/5" : ""
                      }`}
                    >
                      <KindIcon kind={n.kind} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium text-text">
                            {n.authorName}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide text-accent">
                            agency
                          </span>
                          {n.createdAt > lastRead && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {n.kind === "owner_reply" ? (
                            <>
                              replied on{" "}
                              <span className="font-mono text-text">
                                #{n.iterationNumber}
                              </span>{" "}
                              <span className="text-text">{n.issueTitle}</span>
                            </>
                          ) : (
                            <>
                              moved{" "}
                              <span className="font-mono text-text">
                                #{n.iterationNumber}
                              </span>{" "}
                              <span className="text-text">{n.issueTitle}</span>{" "}
                              to{" "}
                              <span
                                className={
                                  n.newStatus === "resolved"
                                    ? "text-success"
                                    : n.newStatus === "in_progress"
                                      ? "text-blue-300"
                                      : n.newStatus === "rejected"
                                        ? "text-danger"
                                        : "text-orange-300"
                                }
                              >
                                {statusLabel(n.newStatus ?? "")}
                              </span>
                            </>
                          )}
                        </div>
                        {n.body && (
                          <p className="mt-1 line-clamp-1 rounded border border-border bg-elevated px-2 py-1 text-[11px] text-muted">
                            {n.body}
                          </p>
                        )}
                        <div className="mt-1 text-[10px] text-muted">
                          {relativeTime(new Date(n.createdAt))}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function KindIcon({ kind }: { kind: Notif["kind"] }) {
  const map: Record<Notif["kind"], { emoji: string; color: string }> = {
    owner_reply: { emoji: "💬", color: "bg-blue-400/20 text-blue-300" },
    status_changed: { emoji: "⟳", color: "bg-orange-400/20 text-orange-300" },
  };
  const m = map[kind];
  return (
    <span
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${m.color}`}
    >
      {m.emoji}
    </span>
  );
}

function statusLabel(s: string): string {
  return (
    ({ open: "Open", in_progress: "In progress", resolved: "Done", rejected: "Declined" } as Record<
      string,
      string
    >)[s] ?? s
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
