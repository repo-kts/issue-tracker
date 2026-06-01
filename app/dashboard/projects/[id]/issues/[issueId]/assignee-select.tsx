"use client";

export function AssigneeSelect({
  value,
  members,
}: {
  value: string | null;
  members: { id: string; name: string }[];
}) {
  return (
    <select
      // key forces a fresh mount when the server-side assignee changes, so the
      // dropdown always reflects the persisted state instead of stale DOM.
      key={value ?? "none"}
      name="assigneeId"
      defaultValue={value ?? ""}
      onChange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
      className="input w-auto py-1.5 text-xs"
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
