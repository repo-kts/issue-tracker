import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { initials, listTeamMembers } from "@/lib/team";
import { AddMemberForm } from "./add-member-form";
import { addMemberAction, removeMemberAction, updateMemberAction } from "./actions";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const members = await listTeamMembers(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted">Settings</div>
      <h1 className="text-2xl font-semibold tracking-tight">Team members</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Add the people who help you deliver client work. You can then assign change requests
        to them — they won't get a login here yet, this is for tracking and visibility.
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Add a member</h2>
        <AddMemberForm />
      </section>

      <section className="mt-10">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">
            All members{" "}
            <span className="ml-1 text-muted">({members.length})</span>
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="card flex flex-col items-center justify-center px-6 py-12 text-center text-sm text-muted">
            <div className="mb-2 text-3xl">👥</div>
            <p>No team members yet. Add one above to start assigning tickets.</p>
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {members.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MemberRow({
  member,
}: {
  member: { id: string; name: string; email: string | null; role: string | null; color: string };
}) {
  return (
    <details className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center gap-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-black"
          style={{ background: member.color }}
        >
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{member.name}</div>
          <div className="truncate text-xs text-muted">
            {member.role || "No role"}
            {member.email && <> · {member.email}</>}
          </div>
        </div>
        <span className="text-xs text-muted group-open:hidden">Edit ›</span>
        <span className="hidden text-xs text-muted group-open:inline">Close ▾</span>
      </summary>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <form action={updateMemberAction} className="space-y-3">
          <input type="hidden" name="id" value={member.id} />
          <div>
            <label className="label">Name</label>
            <input name="name" defaultValue={member.name} required className="input text-sm" />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={member.email ?? ""}
              className="input text-sm"
              placeholder="optional"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <input
              name="role"
              defaultValue={member.role ?? ""}
              className="input text-sm"
              placeholder="Designer, Developer, etc."
            />
          </div>
          <div>
            <label className="label">Avatar color</label>
            <input
              name="color"
              type="color"
              defaultValue={member.color}
              className="h-9 w-16 cursor-pointer rounded border border-border bg-panel"
            />
          </div>
          <button type="submit" className="btn-primary text-xs">
            Save changes
          </button>
        </form>
        <form action={removeMemberAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={member.id} />
          <div className="text-xs uppercase tracking-wide text-muted">Danger zone</div>
          <p className="text-xs text-muted">
            Removing a member also unassigns them from any open tickets. Past assignments stay
            in the timeline.
          </p>
          <button
            type="submit"
            className="self-start rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger hover:bg-danger/20"
          >
            Remove {member.name}
          </button>
        </form>
      </div>
    </details>
  );
}
