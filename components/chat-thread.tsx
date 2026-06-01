import type { Message, Attachment } from "@/lib/db/schema";
import { MessageComposer } from "./message-composer";
import { AttachmentPreview } from "./attachment-preview";

type MessageWithAttachments = Message & { attachments: Attachment[] };

export function ChatThread({
  messages,
  postAction,
  viewerType,
  disabled,
  disabledReason,
}: {
  messages: MessageWithAttachments[];
  postAction: (formData: FormData) => Promise<void>;
  viewerType: "owner" | "client";
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-[#0c0c0e] px-5 py-3">
        <div className="text-sm font-medium">Conversation</div>
        <span className="text-xs text-muted">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex-1 space-y-6 px-5 py-6">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            No replies yet. Start the conversation below.
          </div>
        ) : (
          messages.map((m, idx) => (
            <MessageRow
              key={m.id}
              message={m}
              viewerType={viewerType}
              prev={messages[idx - 1] ?? null}
            />
          ))
        )}
      </div>

      <div className="border-t border-border bg-[#0a0a0c] px-5 py-4">
        {disabled ? (
          <div className="rounded-md border border-border bg-panel px-3 py-2 text-sm text-muted">
            {disabledReason ?? "Replies are disabled."}
          </div>
        ) : (
          <MessageComposer postAction={postAction} viewerType={viewerType} />
        )}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  viewerType,
  prev,
}: {
  message: MessageWithAttachments;
  viewerType: "owner" | "client";
  prev: MessageWithAttachments | null;
}) {
  const isMine = message.authorType === viewerType;
  const isOwner = message.authorType === "owner";
  const isGrouped =
    prev !== null &&
    prev.authorType === message.authorType &&
    prev.authorName === message.authorName &&
    message.createdAt.getTime() - prev.createdAt.getTime() < 5 * 60 * 1000;

  return (
    <div className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
      <div className="shrink-0 self-end">
        {isGrouped ? (
          <span className="block h-7 w-7" />
        ) : (
          <Avatar name={message.authorName} kind={isOwner ? "owner" : "client"} />
        )}
      </div>

      <div className={`flex max-w-[76%] min-w-0 flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {!isGrouped && (
          <div className="flex items-center gap-1.5 px-1 text-[11px]">
            <span className="font-medium text-text">{message.authorName}</span>
            {isOwner && (
              <span className="rounded-sm bg-accent/15 px-1 py-px text-[9px] uppercase tracking-wide text-accent">
                agency
              </span>
            )}
            <span className="text-muted">· {formatTime(message.createdAt)}</span>
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ring-1 transition-colors ${
            isMine
              ? "bg-accent/15 text-text ring-accent/25"
              : "bg-[#161618] text-text ring-border"
          } ${
            isMine
              ? isGrouped
                ? "rounded-tr-md"
                : "rounded-tr-sm"
              : isGrouped
                ? "rounded-tl-md"
                : "rounded-tl-sm"
          }`}
        >
          {message.body && (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
          {message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${message.body ? "mt-2" : ""}`}>
              {message.attachments.map((a) => (
                <AttachmentPreview key={a.id} attachment={a} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, kind }: { name: string; kind: "owner" | "client" }) {
  const initial = name.charAt(0).toUpperCase();
  const cls =
    kind === "owner"
      ? "bg-gradient-to-br from-orange-400 to-accent text-black"
      : "bg-gradient-to-br from-blue-400 to-blue-600 text-white";
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${cls}`}
    >
      {initial}
    </span>
  );
}

function formatTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && d.getDate() === new Date().getDate()) {
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
