"use client";

import { useRef, useState } from "react";
import { updateIssueDetailsAction } from "./actions";
import { extractPastedFiles } from "@/lib/clipboard";
import { LocalFilePreview } from "@/components/local-file-preview";

type RecState = "idle" | "recording" | "ready";
type LinkItem = { url: string; label: string };

export function EditIssueForm({
  slug,
  issueId,
  initialTitle,
  initialDescription,
  defaultEditorName,
}: {
  slug: string;
  issueId: string;
  initialTitle: string;
  initialDescription: string;
  defaultEditorName: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recorder
  const [recState, setRecState] = useState<RecState>("idle");
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecBlob(blob);
        setRecState("ready");
        stream.getTracks().forEach((t) => t.stop());
        if (tickRef.current) window.clearInterval(tickRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();
      setRecDuration(0);
      tickRef.current = window.setInterval(() => {
        setRecDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
      setRecState("recording");
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();
  const discardRecording = () => {
    setRecBlob(null);
    setRecDuration(0);
    setRecState("idle");
  };

  const reset = () => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setFiles([]);
    setLinks([]);
    discardRecording();
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    for (const f of files) fd.append("attachments", f);
    if (recBlob) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      fd.append(
        "attachments",
        new File([recBlob], `voice-note-${ts}.webm`, { type: "audio/webm" }),
      );
    }
    for (const l of links) {
      const u = l.url.trim();
      if (!u) continue;
      const normalized = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      fd.append("linkUrls", normalized);
      fd.append("linkLabels", l.label.trim());
    }
    fd.set("slug", slug);
    fd.set("issueId", issueId);

    try {
      await updateIssueDetailsAction(fd);
      setFiles([]);
      setLinks([]);
      discardRecording();
      setOpen(false);
    } catch {
      // server may throw on redirect — that's fine
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
            What you asked for
          </h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-secondary shrink-0 text-xs"
          >
            ✎ Edit / Add more details
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {initialDescription}
        </p>
      </>
    );
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = extractPastedFiles(e);
    if (pasted.length > 0) setFiles((prev) => [...prev, ...pasted]);
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Edit this request</div>
        <button type="button" onClick={reset} className="text-xs text-muted hover:text-text">
          Cancel
        </button>
      </div>

      <div>
        <label className="label">Title</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="input text-sm"
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="input resize-none text-sm"
          placeholder="Add more detail if you missed something."
        />
      </div>

      <div>
        <label className="label">Add a voice note <span className="text-muted normal-case">(optional)</span></label>
        {recState === "idle" && !recBlob && (
          <button type="button" onClick={startRecording} className="btn-secondary text-xs">
            🎙 Start recording
          </button>
        )}
        {recState === "recording" && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              Recording · {recDuration}s
            </span>
            <button type="button" onClick={stopRecording} className="btn-primary text-xs">
              ⏹ Stop
            </button>
          </div>
        )}
        {recState === "ready" && recBlob && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-elevated p-3">
            <audio controls src={URL.createObjectURL(recBlob)} className="w-full" />
            <div className="flex justify-between text-xs">
              <span className="text-muted">{recDuration}s — will be attached on save</span>
              <button type="button" onClick={discardRecording} className="text-danger hover:underline">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label">Add files <span className="text-muted normal-case">(optional)</span></label>
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
          className="btn-secondary text-xs"
        >
          + Add files
        </button>
        <p className="mt-1 text-xs text-muted">
          Tip: you can also paste a screenshot directly (Ctrl+V / ⌘V).
        </p>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <LocalFilePreview
                key={i}
                file={f}
                onRemove={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">Add reference links <span className="text-muted normal-case">(optional)</span></label>
        {links.length === 0 ? (
          <button
            type="button"
            onClick={() => setLinks([{ url: "", label: "" }])}
            className="btn-secondary text-xs"
          >
            🔗 Add link
          </button>
        ) : (
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex flex-col gap-2 md:flex-row">
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)),
                    )
                  }
                  className="input text-xs md:flex-[2]"
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
                  className="input text-xs md:flex-1"
                />
                <button
                  type="button"
                  onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, { url: "", label: "" }])}
              className="text-xs text-accent hover:underline"
            >
              + Add another link
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="label">Your name <span className="text-muted normal-case">(optional)</span></label>
        <input
          name="editorName"
          defaultValue={defaultEditorName}
          className="input text-sm"
          placeholder="So we know who made the edit"
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={reset} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
