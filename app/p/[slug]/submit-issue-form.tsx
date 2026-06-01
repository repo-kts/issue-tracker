"use client";

import { useRef, useState } from "react";
import { submitIssueAction } from "./actions";

type RecState = "idle" | "recording" | "ready";
type LinkItem = { url: string; label: string };

export function SubmitIssueForm({ slug }: { slug: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recorder
  const [recState, setRecState] = useState<RecState>("idle");
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  // Links
  const [links, setLinks] = useState<LinkItem[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const onAddFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

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
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const discardRecording = () => {
    setRecBlob(null);
    setRecDuration(0);
    setRecState("idle");
  };

  const addLink = () => setLinks((prev) => [...prev, { url: "", label: "" }]);
  const updateLink = (idx: number, patch: Partial<LinkItem>) =>
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLink = (idx: number) =>
    setLinks((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    for (const f of files) fd.append("attachments", f);
    if (recBlob) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      fd.append(
        "attachments",
        new File([recBlob], `voice-note-${ts}.webm`, { type: "audio/webm" }),
      );
    }

    // Trim and normalize link URLs (skip empty rows; auto-prepend https://).
    for (const l of links) {
      const u = l.url.trim();
      if (!u) continue;
      const normalized = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      fd.append("linkUrls", normalized);
      fd.append("linkLabels", l.label.trim());
    }

    fd.set("slug", slug);

    try {
      await submitIssueAction(fd);
    } catch (err) {
      // redirect throws — that's expected behavior
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">What needs to change?</label>
        <input id="title" name="title" required className="input" placeholder="E.g. Make the hero headline shorter" />
      </div>

      <div>
        <label className="label" htmlFor="description">Tell us more <span className="text-muted normal-case">(optional)</span></label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input resize-none"
          placeholder="Describe the change. The more detail, the fewer back-and-forths."
        />
      </div>

      <div>
        <label className="label">Voice note <span className="text-muted normal-case">(optional)</span></label>
        {recState === "idle" && !recBlob && (
          <button type="button" onClick={startRecording} className="btn-secondary">
            🎙 Start recording
          </button>
        )}
        {recState === "recording" && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              Recording · {recDuration}s
            </span>
            <button type="button" onClick={stopRecording} className="btn-primary">
              ⏹ Stop
            </button>
          </div>
        )}
        {recState === "ready" && recBlob && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-[#17171b] p-3">
            <audio controls src={URL.createObjectURL(recBlob)} className="w-full" />
            <div className="flex justify-between text-xs">
              <span className="text-muted">{recDuration}s — will be attached on submit</span>
              <button type="button" onClick={discardRecording} className="text-danger hover:underline">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label">Screenshots, screen recordings, files <span className="text-muted normal-case">(optional)</span></label>
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
          className="btn-secondary"
        >
          + Add files
        </button>
        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-border bg-[#17171b] px-3 py-2 text-sm">
                <span className="truncate">
                  {f.type.startsWith("image/") && "🖼 "}
                  {f.type.startsWith("video/") && "🎬 "}
                  {f.type.startsWith("audio/") && "🎙 "}
                  {!f.type.startsWith("image/") && !f.type.startsWith("video/") && !f.type.startsWith("audio/") && "📎 "}
                  {f.name}
                  <span className="ml-2 text-muted">({Math.round(f.size / 1024)} KB)</span>
                </span>
                <button type="button" onClick={() => removeFile(i)} className="text-danger hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label">Reference links <span className="text-muted normal-case">(optional)</span></label>
        {links.length === 0 && (
          <button type="button" onClick={addLink} className="btn-secondary">
            🔗 Add link
          </button>
        )}
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((link, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-md border border-border bg-[#17171b] p-3 md:flex-row md:items-center"
              >
                <input
                  type="url"
                  inputMode="url"
                  required
                  placeholder="https://example.com"
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  className="input text-sm md:flex-[2]"
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={link.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  className="input text-sm md:flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-xs text-danger hover:underline md:shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addLink} className="btn-ghost text-xs">
              + Add another link
            </button>
          </div>
        )}
        <p className="mt-1 text-xs text-muted">
          Paste reference URLs — e.g. "make my landing page look like this".
        </p>
      </div>

      <div>
        <label className="label" htmlFor="submitterName">Your name <span className="text-muted normal-case">(optional)</span></label>
        <input id="submitterName" name="submitterName" className="input" placeholder="So we know who wrote this" />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Submitting…" : "Submit change request →"}
      </button>
    </form>
  );
}
