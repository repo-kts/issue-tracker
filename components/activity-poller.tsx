"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function ActivityPoller({
  scope,
  intervalMs = 10_000,
}: {
  scope:
    | { kind: "issue"; issueId: string }
    | { kind: "project"; projectId: string }
    | { kind: "slug"; slug: string }
    | { kind: "owner" };
  intervalMs?: number;
}) {
  const router = useRouter();
  const baselineRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const onVisibility = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const buildUrl = () => {
      const u = new URL("/api/activity", window.location.origin);
      if (scope.kind === "issue") u.searchParams.set("issueId", scope.issueId);
      if (scope.kind === "project") u.searchParams.set("projectId", scope.projectId);
      if (scope.kind === "slug") u.searchParams.set("slug", scope.slug);
      return u.toString();
    };

    const tick = async () => {
      if (!isVisibleRef.current || cancelled) return;
      try {
        const res = await fetch(buildUrl(), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const latest = Number(data.latest ?? 0);
        if (baselineRef.current == null) {
          baselineRef.current = latest;
          return;
        }
        if (latest > baselineRef.current) {
          baselineRef.current = latest;
          router.refresh();
        }
      } catch {
        // network blip — try again next tick
      }
    };

    tick(); // seed baseline immediately
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs, scope.kind, JSON.stringify(scope)]);

  return null;
}
