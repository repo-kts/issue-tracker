import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const u = await getCurrentUser();
  if (u) redirect("/dashboard");
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Admin sign-in</h1>
      <p className="mb-8 text-sm text-muted">
        Use the credentials set in <code className="font-mono text-text">.env.local</code>.
      </p>
      <LoginForm />
    </>
  );
}
