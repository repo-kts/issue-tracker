"use client";

import { useState } from "react";

export function CopyMagicLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input value={link} readOnly className="input font-mono text-xs" />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-secondary whitespace-nowrap"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      <a href={link} target="_blank" className="btn-ghost whitespace-nowrap">
        Open ↗
      </a>
    </div>
  );
}
