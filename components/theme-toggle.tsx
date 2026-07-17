"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  // No explicit choice yet → follow the device (System).
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(currentTheme());
    setMounted(true);
    // Keep in sync if the OS theme changes while on System (no explicit choice).
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!document.documentElement.getAttribute("data-theme")) {
        setTheme(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  // Render nothing until mounted so server/client markup match (theme is
  // applied pre-paint by the inline script in the root layout).
  if (!mounted) return null;

  // Show the icon of the theme you'd switch TO.
  const nextIsDark = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${nextIsDark ? "dark" : "light"} mode`}
      aria-label={`Switch to ${nextIsDark ? "dark" : "light"} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-elevated hover:text-text ${className}`}
    >
      <span className="text-base leading-none">{nextIsDark ? "🌙" : "☀️"}</span>
    </button>
  );
}
