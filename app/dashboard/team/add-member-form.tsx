"use client";

import { useRef, useState } from "react";
import { addMemberAction } from "./actions";

const palette = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#ef4444",
];

export function AddMemberForm() {
  const [color, setColor] = useState(palette[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setSubmitting(true);
        try {
          await addMemberAction(fd);
          formRef.current?.reset();
          setColor(palette[Math.floor(Math.random() * palette.length)]);
        } finally {
          setSubmitting(false);
        }
      }}
      className="card grid grid-cols-1 gap-3 p-5 md:grid-cols-2"
    >
      <div>
        <label className="label" htmlFor="member-name">Name</label>
        <input id="member-name" name="name" required className="input text-sm" placeholder="Ritesh Sharma" />
      </div>
      <div>
        <label className="label" htmlFor="member-email">
          Email <span className="text-muted normal-case">(optional)</span>
        </label>
        <input
          id="member-email"
          name="email"
          type="email"
          className="input text-sm"
          placeholder="ritesh@yourteam.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="member-role">
          Role <span className="text-muted normal-case">(optional)</span>
        </label>
        <input
          id="member-role"
          name="role"
          className="input text-sm"
          placeholder="e.g. Frontend Developer"
        />
      </div>
      <div>
        <label className="label">Avatar color</label>
        <div className="flex flex-wrap gap-1.5">
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 ${
                c === color ? "border-text" : "border-transparent"
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <input type="hidden" name="color" value={color} />
        </div>
      </div>
      <div className="md:col-span-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? "Adding…" : "+ Add member"}
        </button>
      </div>
    </form>
  );
}
