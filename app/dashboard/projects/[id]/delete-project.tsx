"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteProjectAction, type DeleteProjectState } from "./actions";

export function DeleteProject({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteProjectState, FormData>(
    deleteProjectAction,
    {},
  );

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  return (
    <>
      <div className="card mt-10 border-danger/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-danger">Danger zone</div>
            <div className="mt-0.5 text-xs text-muted">
              Permanently delete this project and every change request, attachment,
              message and payment record under it. This cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn shrink-0 border border-danger/50 text-danger hover:bg-danger/10"
          >
            Delete project
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !pending && setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm project deletion"
            className="card relative z-10 w-full max-w-md p-6"
          >
            <h2 className="text-lg font-semibold">Delete this project?</h2>
            <p className="mt-2 text-sm text-muted">
              You're about to permanently delete{" "}
              <span className="font-medium text-text">{projectName}</span> and all of
              its data. Enter your account password to confirm.
            </p>

            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="projectId" value={projectId} />
              <div>
                <label className="label" htmlFor="delete-password">
                  Your password
                </label>
                <input
                  id="delete-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  required
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              {state?.error && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {state.error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn border border-danger bg-danger/90 text-black hover:bg-danger disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
