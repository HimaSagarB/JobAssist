"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { planDecision, type SearchPlan } from "@/lib/search-plan";
import { saveSearchPlan } from "./actions";

const fieldClass = "w-full rounded-control border border-line-card bg-surface p-3 text-sm";
export function SearchPlanScreen({ initial }: { initial: SearchPlan }) {
  const [plan, setPlan] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [sample, setSample] = useState({ title: "", company: "", place: "", remote: null as boolean | null });
  const decision = sample.title.trim() ? planDecision(plan, sample) : null;
  function update<K extends keyof SearchPlan>(key: K, value: SearchPlan[K]) {
    setPlan((current) => ({ ...current, [key]: value }));
    setNotice("");
  }
  return <>
    <PageHeader title="Your search plan" description="Define what is worth your time. The daily agent checks this plan before spending time scoring a job." />
    <div className="grid gap-8 px-5 pb-10 md:px-10 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <form className="space-y-6" onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            const result = await saveSearchPlan(plan);
            setNotice(result.ok ? "Search plan saved. Your next agent run will use it." : result.error);
          } catch { setNotice("Could not save your plan. Please try again."); }
        });
      }}>
        <section className="space-y-4 rounded-panel border border-line-card p-6">
          <h2 className="font-serif text-xl">Focus your search</h2>
          <p className="text-sm text-muted">Enter one item per line, or separate items with commas. Leave a field empty to allow any value.</p>
          <label className="block space-y-2"><span className="text-sm font-medium">Target role titles</span><textarea className={fieldClass} rows={3} maxLength={3000} value={plan.roles} placeholder={"Software engineer\nBackend developer"} onChange={(event) => update("roles", event.target.value)} disabled={pending} /></label>
          <p className="text-xs text-muted">Titles must contain one of these phrases. Add alternate titles to avoid missing relevant roles.</p>
          <label className="block space-y-2"><span className="text-sm font-medium">Allowed locations</span><textarea className={fieldClass} rows={2} maxLength={3000} value={plan.locations} placeholder="City, region, or country as listed by the job source" onChange={(event) => update("locations", event.target.value)} disabled={pending} /></label>
          <p className="text-xs text-muted">Also applies to remote jobs. A remote listing can still have location restrictions.</p>
          <label className="block space-y-2"><span className="text-sm font-medium">Work arrangement</span><select className={fieldClass} value={plan.workMode} disabled={pending} onChange={(event) => update("workMode", event.target.value as SearchPlan["workMode"])}><option value="any">Any arrangement</option><option value="remote">Remote only</option><option value="onsite">Non-remote only</option></select></label>
          <p className="text-xs text-muted">Unknown arrangements stay eligible for review. The source may group hybrid and onsite jobs together as non-remote.</p>
          <label className="block space-y-2"><span className="text-sm font-medium">Companies to exclude</span><textarea className={fieldClass} rows={2} maxLength={3000} value={plan.excludedCompanies} onChange={(event) => update("excludedCompanies", event.target.value)} disabled={pending} /></label>
          <p className="text-xs text-muted">Exact company names, ignoring capitalization and punctuation.</p>
        </section>
        <button type="submit" disabled={pending} className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-on-primary disabled:opacity-50">{pending ? "Saving…" : "Save search plan"}</button>
        <p role="status" className="text-sm">{notice}</p>
      </form>
      <aside className="space-y-6">
        <section className="space-y-3 rounded-panel border border-line-card p-6">
          <h2 className="font-serif text-xl">Try your filters</h2>
          <p className="text-sm text-muted">Preview your current edits against a job. This checks your preferences, not your qualifications.</p>
          {([ ["title", "Job title"], ["company", "Company"], ["place", "Location"] ] as const).map(([key, label]) => <label key={key} className="block space-y-1"><span className="text-sm">{label}</span><input className={fieldClass} value={sample[key]} onChange={(event) => setSample({ ...sample, [key]: event.target.value })} /></label>)}
          <label className="block space-y-1"><span className="text-sm">Listed work arrangement</span><select className={fieldClass} value={sample.remote === null ? "unknown" : String(sample.remote)} onChange={(event) => setSample({ ...sample, remote: event.target.value === "unknown" ? null : event.target.value === "true" })}><option value="unknown">Not specified</option><option value="true">Remote</option><option value="false">Non-remote</option></select></label>
          {decision && <div role="status" className="space-y-2 border-t border-line-card pt-4"><strong>{decision.eligible ? "Eligible for scoring" : "Filtered out"}</strong>{[...decision.reasons, ...decision.review].map((reason) => <p className="text-sm text-muted" key={reason}>{reason}</p>)}</div>}
        </section>
        <section className="space-y-3 rounded-panel border border-line-card p-6 text-sm">
          <h2 className="font-serif text-xl">Put your plan to work</h2>
          <p>Your plan filters jobs returned by the agent’s saved search. Set its search keywords and country separately in Settings → Job agent.</p>
          <p>Drafts wait for your review. Sending an application still needs your confirmation.</p>
          <div className="flex flex-wrap gap-4"><Link href="/profile">Update profile →</Link><Link href="/settings">Configure agent →</Link><Link href="/agent">Review queue →</Link></div>
        </section>
      </aside>
    </div>
  </>;
}
