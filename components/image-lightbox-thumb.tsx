"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A submitted-image thumbnail that opens an in-page lightbox (not a new tab)
// with Download and Close controls. Portaled to <body> so the overlay can't
// be clipped by an ancestor's overflow/transform/stacking context.
export function ImageLightboxThumb({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border transition-colors hover:border-accent/60">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Click to preview"
          className="block w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={filename} className="h-32 w-full object-cover" />
        </button>
        <a
          href={url}
          download={filename}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 border-t border-border bg-panel px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-elevated hover:text-text"
        >
          ⬇ Download
        </a>
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/85 p-4 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <div
              className="flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={url}
                download={filename}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/70"
              >
                ⬇ Download
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close preview"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white transition-colors hover:bg-black/70"
              >
                ×
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={filename}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            </div>

            <div className="truncate text-center text-xs text-white/70">
              {filename}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
