import Link from "next/link";
import type { OwnerIssueRow } from "@/lib/projects";
import { initials } from "@/lib/team";
import { FilterMenu } from "./filter-menu";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Declined" },
] as const;

const PRIORITY_FILTERS = [
  { key: "all", label: "All priorities" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
  { key: "low", label: "Low" },
] as const;

export function IssueMatrix({
  rows,
  statusFilter,
  priorityFilter,
  projectFilter,
  projects,
}: {
  rows: OwnerIssueRow[];
  statusFilter: string;
  priorityFilter: string;
  projectFilter: string;
  projects: { id: string; name: string; brandColor: string | null }[];
}) {
  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (projectFilter !== "all" && r.projectId !== projectFilter) return false;
    return true;
  });

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">All issues</h2>
          <p className="mt-0.5 text-xs text-muted">
            Every change request across every project. Click any row to open it.
          </p>
        </div>
        <span className="text-xs text-muted">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <InlineFilterGroup
          label="Status"
          name="status"
          current={statusFilter}
          options={STATUS_FILTERS as unknown as { key: string; label: string }[]}
          siblings={{ priority: priorityFilter, project: projectFilter }}
        />
        <InlineFilterGroup
          label="Priority"
          name="priority"
          current={priorityFilter}
          options={PRIORITY_FILTERS as unknown as { key: string; label: string }[]}
          siblings={{ status: statusFilter, project: projectFilter }}
        />
        <FilterMenu
          filters={[
            {
              name: "project",
              label: "Project",
              current: projectFilter,
              options: [
                { key: "all", label: "All projects" },
                ...projects.map((p) => ({
                  key: p.id,
                  label: p.name,
                  dotColor: p.brandColor ?? "#f97316",
                })),
              ],
            },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-12 text-center text-sm text-muted">
          No issues match these filters.
        </div>
      ) : (
        <>
          {/* Table view — md and up */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[#0c0c0e] text-left text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">ETA</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <MatrixRow key={row.issueId} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view — below md */}
          <div className="card divide-y divide-border md:hidden">
            {filtered.map((row) => (
              <MatrixCard key={row.issueId} row={row} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MatrixRow({ row }: { row: OwnerIssueRow }) {
  const href = `/dashboard/projects/${row.projectId}/issues/${row.issueId}`;
  const etaPast =
    row.etaAt && row.etaAt.getTime() < Date.now() && row.status !== "resolved";

  return (
    <tr className="group border-b border-border last:border-b-0 hover:bg-[#0e0e10]">
      <Cell>
        <Link href={href} className="block font-mono text-[11px] text-muted group-hover:text-text">
          #{row.iterationNumber}
        </Link>
      </Cell>
      <Cell>
        <Link href={href} className="flex items-center gap-2 text-xs">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: row.projectBrandColor ?? "#f97316" }}
          />
          <span className="min-w-0 truncate">{row.projectName}</span>
        </Link>
      </Cell>
      <Cell>
        <Link href={href} className="block min-w-0 truncate text-sm font-medium">
          {row.title}
          {row.clientApprovedAt && (
            <span className="ml-2 text-[10px] text-success">✓</span>
          )}
        </Link>
      </Cell>
      <Cell>
        <StatusPill status={row.status} />
      </Cell>
      <Cell>
        <PriorityPill priority={row.priority} />
      </Cell>
      <Cell>
        {row.assigneeId && row.assigneeName ? (
          <span className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-black"
              style={{ background: row.assigneeColor ?? "#f97316" }}
            >
              {initials(row.assigneeName)}
            </span>
            <span className="truncate text-xs">{row.assigneeName}</span>
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </Cell>
      <Cell>
        {row.etaAt ? (
          <span className={`text-xs ${etaPast ? "text-danger" : "text-orange-300"}`}>
            {row.etaAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year:
                row.etaAt.getFullYear() === new Date().getFullYear()
                  ? undefined
                  : "2-digit",
            })}
            {etaPast && <span className="ml-1">!</span>}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </Cell>
      <Cell>
        <span className="text-xs text-muted">
          {row.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </Cell>
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function MatrixCard({ row }: { row: OwnerIssueRow }) {
  const href = `/dashboard/projects/${row.projectId}/issues/${row.issueId}`;
  const etaPast =
    row.etaAt && row.etaAt.getTime() < Date.now() && row.status !== "resolved";

  return (
    <Link href={href} className="block px-4 py-3 hover:bg-[#0e0e10]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted">
            #{row.iterationNumber}
          </span>
          <span className="truncate text-sm font-medium">
            {row.title}
            {row.clientApprovedAt && (
              <span className="ml-1.5 text-[10px] text-success">✓</span>
            )}
          </span>
        </div>
        <StatusPill status={row.status} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[1.7rem] text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: row.projectBrandColor ?? "#f97316" }}
          />
          <span className="truncate">{row.projectName}</span>
        </span>
        {row.priority !== "normal" && <PriorityPill priority={row.priority} />}
        {row.assigneeId && row.assigneeName && (
          <span className="flex items-center gap-1.5">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-black"
              style={{ background: row.assigneeColor ?? "#f97316" }}
            >
              {initials(row.assigneeName)}
            </span>
            <span className="truncate">{row.assigneeName}</span>
          </span>
        )}
        {row.etaAt && (
          <span className={etaPast ? "text-danger" : "text-orange-300"}>
            ETA{" "}
            {row.etaAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
            {etaPast && " !"}
          </span>
        )}
        <span className="ml-auto shrink-0">
          {row.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
    </Link>
  );
}

function InlineFilterGroup({
  label,
  name,
  current,
  options,
  siblings,
}: {
  label: string;
  name: string;
  current: string;
  options: { key: string; label: string }[];
  siblings: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-panel p-1">
      <span className="px-1 text-[10px] uppercase tracking-wide text-muted">{label}</span>
      {options.map((o) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(siblings)) {
          if (v && v !== "all") params.set(k, v);
        }
        if (o.key !== "all") params.set(name, o.key);
        const qs = params.toString();
        const active = current === o.key;
        return (
          <Link
            key={o.key}
            href={`/dashboard${qs ? `?${qs}` : ""}`}
            className={`rounded px-2 py-1 text-[11px] transition-colors ${
              active ? "bg-accent text-black" : "text-muted hover:text-text"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    open: "border-orange-400/60 text-orange-300",
    in_progress: "border-blue-400/60 text-blue-300",
    resolved: "border-success/60 text-success",
    rejected: "border-danger/60 text-danger",
  };
  const label: Record<string, string> = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
    rejected: "Declined",
  };
  return (
    <span className={`pill text-[10px] ${cls[status] ?? ""}`}>{label[status] ?? status}</span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  if (priority === "normal") {
    return <span className="text-xs text-muted">Normal</span>;
  }
  const cls: Record<string, string> = {
    low: "text-muted",
    high: "text-orange-300",
    urgent: "text-danger",
  };
  const label: Record<string, string> = { low: "Low", high: "High", urgent: "Urgent" };
  const icon: Record<string, string> = { low: "↓", high: "↑", urgent: "‼" };
  return (
    <span className={`text-xs font-medium ${cls[priority] ?? ""}`}>
      {icon[priority] ?? ""} {label[priority] ?? priority}
    </span>
  );
}
