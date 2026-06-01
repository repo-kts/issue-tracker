export function AttachmentPreview({
  attachment,
  compact,
}: {
  attachment: {
    id: string;
    kind: string;
    storedPath: string;
    filename: string;
    mimeType: string;
    sizeBytes?: number;
  };
  /** When true, renders a small inline chip. Default false (full preview). */
  compact?: boolean;
}) {
  if (attachment.kind === "link") {
    return compact ? (
      <LinkChip url={attachment.storedPath} label={attachment.filename} />
    ) : (
      <LinkCard url={attachment.storedPath} label={attachment.filename} />
    );
  }

  const url = `/api/files/${attachment.storedPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  if (compact) return <FileChip attachment={attachment} url={url} />;

  if (attachment.kind === "image") {
    return (
      <a
        href={url}
        target="_blank"
        className="block overflow-hidden rounded-md border border-border hover:border-accent/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.filename} className="h-32 w-full object-cover" />
      </a>
    );
  }
  if (attachment.kind === "video") {
    return (
      <video
        controls
        src={url}
        className="h-32 w-full rounded-md border border-border bg-black"
      />
    );
  }
  if (attachment.kind === "audio") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-[#17171b] p-3">
        <div className="truncate text-xs text-muted">🎙 {attachment.filename}</div>
        <audio controls src={url} className="w-full" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      className="flex items-center gap-2 truncate rounded-md border border-border bg-[#17171b] p-3 text-sm hover:border-accent/60"
    >
      📎 {attachment.filename}
    </a>
  );
}

function LinkCard({ url, label }: { url: string; label: string }) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {}
  const display = label && label !== url ? label : host || url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-md border border-border bg-[#17171b] p-3 hover:border-accent/60"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>🔗</span>
        <span className="truncate">{display}</span>
      </div>
      <div className="truncate text-xs text-muted">{url}</div>
    </a>
  );
}

// ─── Compact (chip) versions ────────────────────────────────────────────

function FileChip({
  attachment,
  url,
}: {
  attachment: {
    id: string;
    kind: string;
    filename: string;
    sizeBytes?: number;
  };
  url: string;
}) {
  const { icon, accent } = chipMeta(attachment.kind);
  const size = attachment.sizeBytes ? prettySize(attachment.sizeBytes) : null;
  return (
    <a
      href={url}
      target="_blank"
      title={attachment.filename}
      className="group inline-flex max-w-[260px] items-center gap-2 rounded-full border border-border bg-[#17171b] px-3 py-1.5 text-xs transition-colors hover:border-accent/60"
    >
      <span className={`shrink-0 text-sm ${accent}`}>{icon}</span>
      <span className="truncate text-text group-hover:text-accent">
        {attachment.filename}
      </span>
      {size && <span className="shrink-0 text-[10px] text-muted">{size}</span>}
    </a>
  );
}

function LinkChip({ url, label }: { url: string; label: string }) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {}
  const display = label && label !== url ? label : host || url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="group inline-flex max-w-[260px] items-center gap-2 rounded-full border border-border bg-[#17171b] px-3 py-1.5 text-xs transition-colors hover:border-accent/60"
    >
      <span className="shrink-0 text-sm text-blue-300">🔗</span>
      <span className="truncate text-text group-hover:text-accent">{display}</span>
      {host && display !== host && (
        <span className="shrink-0 text-[10px] text-muted">{host}</span>
      )}
    </a>
  );
}

function chipMeta(kind: string): { icon: string; accent: string } {
  if (kind === "image") return { icon: "🖼", accent: "text-orange-300" };
  if (kind === "video") return { icon: "🎬", accent: "text-purple-300" };
  if (kind === "audio") return { icon: "🎙", accent: "text-pink-300" };
  return { icon: "📎", accent: "text-muted" };
}

function prettySize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
