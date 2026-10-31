"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { startDailySearch } from "./actions";

export function DailyScreen() {
  const started = useRef(false);
  const router = useRouter();
  const [message, setMessage] = useState("Checking your profile and today's search…");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startDailySearch({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).then(result => {
      if (!result.ok) { setMessage(result.error); return; }
      setMessage(result.data.message);
      if (result.data.state !== "already") router.replace("/agent");
    }).catch(() => setMessage("Could not start the search. Open the job agent to check its status before trying again."));
  }, [router]);
  return <><PageHeader title="Your daily job search" description="Find relevant jobs, prepare drafts, and review what is worth applying to." />
    <section className="mx-5 mb-10 space-y-5 rounded-panel border border-line-card bg-card p-7 md:mx-10">
      <p role="status">{message}</p>
      <p className="text-sm text-muted">Keep JobAssist running until the search and drafts finish. Sending application emails requires a separate confirmation.</p>
      <div className="flex flex-wrap gap-4 text-sm font-medium text-primary-text">
        <Link href="/agent">Open review queue →</Link><Link href="/profile">Profile</Link><Link href="/ai-connections">AI connections</Link><Link href="/search-plan">Search plan</Link><Link href="/settings?section=jobs">Job source</Link><Link href="/settings?section=agent">Search keywords and drafts</Link>
      </div>
      <p className="text-sm text-muted">Enable Prepare drafts in Job agent settings if you want personalized documents generated automatically. For this daily terminal workflow, the background daily schedule can stay off.</p>
    </section></>;
}
