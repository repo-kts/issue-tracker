"use client";

import { useRef, useState } from "react";
import { extractPastedFiles } from "@/lib/clipboard";
import { LocalFilePreview } from "@/components/local-file-preview";

type LinkItem = { url: string; label: string };

export function MessageComposer({
  postAction,
  viewerType,
}: {
  postAction: (formData: FormData) => Promise<void>;
  viewerType: "owner" | "client";
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasContent = body.trim() || files.length > 0 || links.some((l) => l.url.trim());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasContent || submitting) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    for (const f of files) fd.append("attachments", f);
    for (const l of links) {
      const u = l.url.trim();
      if (!u) continue;
      const normalized = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      fd.append("linkUrls", normalized);
      fd.append("linkLabels", l.label.trim());
    }

    try {
      await postAction(fd);
      setBody("");
      setFiles([]);
      setLinks([]);
      setShowLinkInput(false);
      formRef.current?.reset();
    } catch (err) {
      // server action redirect throws — that's fine
    } finally {
      setSubmitting(false);
    }
  };

  const placeholder =
    viewerType === "owner"
      ? "Reply to client — they'll see this in their portal"
      : "Type a message to the team";

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = extractPastedFiles(e);
    if (pasted.length > 0) setFiles((prev) => [...prev, ...pasted]);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      className="flex flex-col gap-2"
    >
      {viewerType === "client" && (
        <input
          name="authorName"
          required
          placeholder="Your name"
          className="input text-sm"
        />
      )}
      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="input resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            formRef.current?.requestSubmit();
          }
        }}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <LocalFilePreview
              key={i}
              file={f}
              compact
              onRemove={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {showLinkInput && (
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                placeholder="https://…"
                value={link.url}
                onChange={(e) =>
                  setLinks((prev) =>
                    prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)),
                  )
                }
                className="input text-xs"
              />
              <input
                type="text"
                placeholder="Label"
                value={link.label}
                onChange={(e) =>
                  setLinks((prev) =>
                    prev.map((l, idx) =>
                      idx === i ? { ...l, label: e.target.value } : l,
                    ),
                  )
                }
                className="input w-32 text-xs"
              />
              <button
                type="button"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-danger"
                title="Remove link"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, { url: "", label: "" }])}
            className="text-xs text-accent hover:underline"
          >
            + Add another
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            onChange={(e) => {
              const picked = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              if (picked.length > 0) setFiles((prev) => [...prev, ...picked]);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted hover:text-text"
            title="Attach files"
          >
            📎 Attach
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput((s) => !s);
              if (!showLinkInput && links.length === 0) {
                setLinks([{ url: "", label: "" }]);
              }
            }}
            className={`hover:text-text ${showLinkInput ? "text-accent" : "text-muted"}`}
            title="Add reference link"
          >
            🔗 Link
          </button>
          <span className="ml-2 text-muted">⌘/Ctrl + Enter to send</span>
        </div>
        <button
          type="submit"
          disabled={!hasContent || submitting}
          className="btn-primary text-sm"
        >
          {submitting ? "Sending…" : "Send →"}
        </button>
      </div>
    </form>
  );
}
