"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Thumbnail preview for a not-yet-uploaded File (picked or pasted).
// Images/videos render a real preview; everything else gets an icon tile.
export function LocalFilePreview({
  file,
  onRemove,
  compact = false,
}: {
  file: File;
  onRemove: () => void;
  compact?: boolean;
}) {
  // Object URL is created inside the effect (not useMemo) so each effect
  // run owns and revokes only its own URL — under React Strict Mode's
  // mount→cleanup→mount dev cycle, a useMemo-created URL gets revoked by
  // the first cleanup while the img src (fixed at first render) still
  // points at it, leaving a permanently broken image.
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Blob URLs are scoped to the tab that created them, so opening one via
  // target="_blank" lands on a blank/broken new tab. Show a same-page
  // lightbox instead — rendered via a portal to document.body so it can't
  // be clipped by the card's overflow-hidden or trapped by an ancestor's
  // stacking/transform context.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  const icon = isAudio ? "🎙" : isVideo ? "🎬" : "📎";

  const width = compact ? "w-28" : "w-40";
  const mediaHeight = compact ? "h-16" : "h-24";

  return (
    <div
      className={`${width} shrink-0 overflow-hidden rounded-md border border-border bg-elevated`}
    >
      {isImage && url ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          title="Click to preview"
          className="block w-full"
        >
          <img
            src={url}
            alt={file.name}
            className={`${mediaHeight} w-full object-cover`}
          />
        </button>
      ) : isVideo && url ? (
        <video src={url} muted className={`${mediaHeight} w-full object-cover`} />
      ) : (
        <div
          className={`${mediaHeight} flex w-full items-center justify-center text-2xl`}
        >
          {icon}
        </div>
      )}
      <div className="px-2 py-1.5 text-xs">
        <div className="truncate" title={file.name}>
          {file.name}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-muted">{Math.round(file.size / 1024)} KB</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      {lightboxOpen &&
        url &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close preview"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white hover:bg-black/70"
            >
              ×
            </button>
            <img
              src={url}
              alt={file.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-md object-contain"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
