"use client";

import { useState } from "react";
import { createProjectAction } from "./actions";
import { FREE_ITERATIONS_PER_PROJECT } from "@/lib/config";

export function NewProjectForm() {
  const [brandColor, setBrandColor] = useState("#f97316");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createProjectAction(new FormData(e.currentTarget));
      if (result && "error" in result && result.error) {
        setError(result.error);
        setSubmitting(false);
      }
      // success path redirects; nothing more to do
    } catch (err) {
      // redirect throws — that's expected
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="name">Project name</label>
        <input
          id="name"
          name="name"
          required
          className="input"
          placeholder="Acme Co. website redesign"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="clientName">Client name</label>
          <input id="clientName" name="clientName" required className="input" placeholder="Rohit Sharma" />
        </div>
        <div>
          <label className="label" htmlFor="clientEmail">
            Client email <span className="text-muted normal-case">(optional)</span>
          </label>
          <input id="clientEmail" name="clientEmail" type="email" className="input" placeholder="rohit@acme.com" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          What's the deliverable? <span className="text-muted normal-case">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="input resize-none"
          placeholder="E.g. Landing page + 4 inner pages with CMS integration."
        />
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          Project details <span className="normal-case text-muted">(all optional — clients see these)</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="projectUrl">Project URL</label>
            <input
              id="projectUrl"
              name="projectUrl"
              type="url"
              className="input"
              placeholder="https://acme.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="dueDate">Target delivery date</label>
            <input id="dueDate" name="dueDate" type="date" className="input" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="logo">Project logo</label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="input file:mr-3 file:rounded file:border-0 file:bg-panel file:px-2 file:py-1 file:text-xs file:text-text"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setLogoPreview(String(ev.target?.result ?? ""));
                  reader.readAsDataURL(f);
                } else {
                  setLogoPreview(null);
                }
              }}
            />
            {logoPreview && (
              <div className="mt-2 flex items-center gap-3 rounded-md border border-border bg-[#17171b] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="h-12 w-12 rounded object-contain" />
                <span className="text-xs text-muted">Logo preview</span>
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="brandColor">Brand accent color</label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                name="brandColor"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-panel"
              />
              <code className="font-mono text-xs text-muted">{brandColor}</code>
              <button
                type="button"
                onClick={() => setBrandColor("#f97316")}
                className="text-xs text-muted hover:text-text"
              >
                Reset
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">Tints the client portal header.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <label className="label" htmlFor="freeIterationLimit">Free iterations included</label>
        <input
          id="freeIterationLimit"
          name="freeIterationLimit"
          type="number"
          min={1}
          max={50}
          defaultValue={FREE_ITERATIONS_PER_PROJECT}
          className="input"
        />
        <p className="mt-1 text-xs text-muted">
          After this many change requests, the client must pay to submit more.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Creating…" : "Create project →"}
      </button>
    </form>
  );
}
