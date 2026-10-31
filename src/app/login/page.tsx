import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { getSession } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Password-only sign-in, outside the app shell (PRD AUTH-1, AUTH-8). */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;

  return (
    // The form on the panel's colour, a warm wash on the right.
    <main className="grid min-h-screen bg-surface min-[960px]:grid-cols-2">
      <div className="flex items-center justify-center px-8 py-12">
      <div className="flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex flex-col items-start gap-2">
          <BrandMark className="size-10" />
          <div className="flex flex-col">
            <div className="font-sans text-[30px] font-bold tracking-[-0.01em]">JobAssist</div>
            <div className="text-sm text-muted">Your next opportunity starts here</div>
          </div>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
        <p className="text-meta leading-[1.6] text-pretty text-muted">
          Your password is set on the server, as a hash in{" "}
          <code className="font-mono text-label">JOBASSIST_PASSWORD</code>. Forgot it? Make a new hash with{" "}
          <code className="font-mono text-label">hash-password</code> and restart.
        </p>
      </div>
      </div>
      <div
        aria-hidden="true"
        className="hidden bg-[linear-gradient(to_left,color-mix(in_srgb,var(--color-ink)_9%,transparent)_0%,transparent_65%)] min-[960px]:grid min-[960px]:place-items-center"
      >
        <div className="flex max-w-md flex-col items-start gap-7 p-10"><BrandMark className="size-24 rounded-[24px] shadow-dialog" /><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-text">Your career, moving forward</p><h2 className="text-4xl font-semibold leading-tight tracking-tight">Less busywork.<br />More opportunity.</h2><p className="text-lg leading-relaxed text-muted">Find your fit, tell your story, and keep every application in one place.</p></div>
      </div>
    </main>
  );
}
