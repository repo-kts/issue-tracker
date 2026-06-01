import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/dashboard" className="mb-6 inline-block text-sm text-muted hover:text-text">
        ← Back to projects
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">New project</h1>
      <p className="mb-8 text-sm text-muted">
        Set up an engagement. You'll get a shareable link to send to your client.
      </p>
      <NewProjectForm />
    </div>
  );
}
