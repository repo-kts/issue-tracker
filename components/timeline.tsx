import type { TimelineEntry } from "@/lib/projects";

export function Timeline({
  entries,
  viewerType,
}: {
  entries: TimelineEntry[];
  viewerType: "owner" | "client";
}) {
  return (
    <aside className="card sticky top-6 self-start p-5">
      <h3 className="mb-1 text-sm font-medium">Activity</h3>
      <p className="mb-5 text-xs text-muted">
        Oldest first.
      </p>

      {entries.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">No activity yet.</div>
      ) : (
        <ol className="relative space-y-5">
          <span
            className="absolute left-[5px] top-2 bottom-2 w-px bg-border"
            aria-hidden
          />
          {entries.map((e) => (
            <TimelineRow key={e.id} entry={e} viewerType={viewerType} />
          ))}
        </ol>
      )}
    </aside>
  );
}

function TimelineRow({
  entry,
  viewerType,
}: {
  entry: TimelineEntry;
  viewerType: "owner" | "client";
}) {
  const isMine = entry.actorType === viewerType;
  const displayName =
    entry.actorType === "system"
      ? "System"
      : isMine
        ? "You"
        : entry.actorName;

  return (
    <li className="relative flex gap-3 pl-0">
      <span
        className={`relative z-10 mt-[5px] inline-block h-3 w-3 shrink-0 rounded-full border-2 border-bg ${dotColor(
          entry.kind,
          entry.actorType,
        )}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs leading-snug">
          <span
            className={`font-medium ${
              entry.actorType === "owner"
                ? "text-accent"
                : entry.actorType === "client"
                  ? "text-blue-300"
                  : "text-text"
            }`}
          >
            {displayName}
          </span>{" "}
          <span className="text-muted">{entry.text}</span>
          {entry.kind === "status_changed" &&
            (entry.meta as any)?.to &&
            !(entry.meta as any)?.approval && (
              <span className={`ml-1 ${statusColor((entry.meta as any).to)}`}>
                {statusLabel((entry.meta as any).to)}
              </span>
            )}
        </div>
        <div className="mt-1 text-[10px] text-muted">
          {absoluteDate(entry.at)} · {relativeTime(entry.at)}
        </div>
      </div>
    </li>
  );
}

function dotColor(kind: TimelineEntry["kind"], actor: string) {
  if (kind === "created") return "bg-blue-400";
  if (kind === "status_changed") return "bg-accent";
  if (kind === "resolved") return "bg-success";
  if (kind === "reopened") return "bg-accent";
  if (kind === "message") return actor === "owner" ? "bg-accent" : "bg-blue-400";
  if (kind === "attachment_added") return "bg-muted";
  if (kind === "assigned") return "bg-purple-400";
  return "bg-muted";
}

function statusColor(s: string) {
  return (
    ({
      open: "text-orange-300",
      in_progress: "text-blue-300",
      resolved: "text-success",
      rejected: "text-danger",
    } as Record<string, string>)[s] ?? "text-text"
  );
}

function statusLabel(s: string) {
  return (
    ({ open: "Open", in_progress: "In progress", resolved: "Resolved", rejected: "Declined" } as Record<
      string,
      string
    >)[s] ?? s
  );
}

function absoluteDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
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
  return date.toLocaleDateString();
}
