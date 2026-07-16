"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Option = { key: string; label: string; dotColor?: string };

export function FilterMenu({
  filters,
  triggerLabel,
}: {
  filters: Array<{
    name: string;
    label: string;
    current: string;
    options: Option[];
  }>;
  triggerLabel?: string;
}) {
  const buttonLabel = triggerLabel ?? (filters.length === 1 ? filters[0].label : "Filter");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeCount = filters.filter((f) => f.current !== "all").length;
  const allClearedHref = "/dashboard";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5 text-xs transition-colors ${
          open || activeCount > 0
            ? "border-accent/60 text-accent"
            : "text-muted hover:text-text"
        }`}
        aria-label="Filter"
      >
        <FunnelIcon />
        <span>{buttonLabel}</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-black">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-30 w-[320px] overflow-hidden rounded-md border border-border bg-[#0c0c0e] shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-sm font-medium">Filters</div>
            {activeCount > 0 && (
              <Link
                href={allClearedHref}
                onClick={() => setOpen(false)}
                className="text-xs text-accent hover:underline"
              >
                Clear all
              </Link>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto p-3">
            <div className="space-y-4">
              {filters.map((f) => (
                <FilterRow
                  key={f.name}
                  filter={f}
                  siblings={Object.fromEntries(
                    filters
                      .filter((s) => s.name !== f.name)
                      .map((s) => [s.name, s.current]),
                  )}
                  onPick={() => setOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  filter,
  siblings,
  onPick,
}: {
  filter: { name: string; label: string; current: string; options: Option[] };
  siblings: Record<string, string>;
  onPick: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
        {filter.label}
      </div>
      <div className="flex flex-wrap gap-1">
        {filter.options.map((o) => {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(siblings)) {
            if (v && v !== "all") params.set(k, v);
          }
          if (o.key !== "all") params.set(filter.name, o.key);
          const qs = params.toString();
          const active = filter.current === o.key;
          return (
            <Link
              key={o.key}
              href={`/dashboard${qs ? `?${qs}` : ""}`}
              onClick={onPick}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors ${
                active
                  ? "bg-accent text-black"
                  : "border border-border bg-[#17171b] text-muted hover:text-text"
              }`}
            >
              {o.dotColor && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: o.dotColor }}
                />
              )}
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FunnelIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
