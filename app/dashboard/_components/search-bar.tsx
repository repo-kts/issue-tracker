"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
      }}
      className="px-3 pb-3"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search issues…"
        className="input w-full py-1.5 text-xs"
      />
    </form>
  );
}
