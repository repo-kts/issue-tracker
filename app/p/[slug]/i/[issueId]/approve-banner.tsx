"use client";

import { useState } from "react";
import { approveResolutionAction } from "./actions";

export function ApproveBanner({
  slug,
  issueId,
  defaultName,
}: {
  slug: string;
  issueId: string;
  defaultName: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="card flex flex-col gap-3 border-success/40 bg-success/5 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-success">
            ✓ This change has been marked as done
          </div>
          <p className="mt-1 text-xs text-muted">
            Please confirm you're happy with it. Once approved, this iteration is officially closed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn-primary shrink-0 text-sm"
        >
          ✓ Approve this resolution
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        setSubmitting(true);
        try {
          await approveResolutionAction(fd);
        } finally {
          setSubmitting(false);
        }
      }}
      className="card flex flex-col gap-3 border-success/40 bg-success/5 p-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="issueId" value={issueId} />
      <div className="text-sm font-medium text-success">Confirm approval</div>
      <p className="text-xs text-muted">
        We'll record your name and the time. The agency will see it. You can't undo this.
      </p>
      <input
        name="approverName"
        defaultValue={defaultName}
        required
        placeholder="Your name"
        className="input text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? "Approving…" : "Yes, approve →"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
