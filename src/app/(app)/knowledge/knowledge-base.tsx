"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/components/toast";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { removeFact } from "@/lib/fact-actions";
import { KNOWLEDGE_GROUPS, knowledgeEntries, searchKnowledge, withoutKnowledgeEntry, writtenSkillMentions, type KnowledgeEntry, type KnowledgeGroup } from "@/lib/knowledge-base";
import type { ProfileData } from "@/lib/profile";
import { removeEducation, removeExperience, removeLanguage, removeProject, removePublication, removeReference, removeSkill } from "../profile/actions";

import { AddKnowledge, type AddKnowledgeMode } from "./add-knowledge";

const removeActions = { skills: removeSkill, languages: removeLanguage, experience: removeExperience, projects: removeProject, education: removeEducation, publications: removePublication, references: removeReference, facts: removeFact };

export function KnowledgeBase({ initial }: { initial: ProfileData }) {
  const [profile, setProfile] = useState(initial);
  const [adding, setAdding] = useState<AddKnowledgeMode | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<KnowledgeGroup | "all">("all");
  const [removing, setRemoving] = useState<KnowledgeEntry | null>(null);
  const [pending, setPending] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const entries = knowledgeEntries(profile);
  const filtered = searchKnowledge(entries, query, group);
  const mentions = removing?.group === "skills" ? writtenSkillMentions(entries, removing.title) : [];

  async function remove() {
    const entry = removing;
    if (!entry || entry.group === "basics" || pending) return;
    setRemoving(null);
    setPending(true);
    try {
      const result = await removeActions[entry.group]({ id: entry.id });
      if (!result.ok) { toast(result.error); return; }
      setProfile(current => withoutKnowledgeEntry(current, entry));
      toast(`Removed “${entry.title}” from your saved knowledge. Existing tailored text is not rewritten automatically.`, entry.group === "skills" ? {
        action: { label: "Find remaining mentions", onClick: () => { setQuery(entry.title); setGroup("all"); searchInput.current?.focus(); } },
      } : undefined);
    } catch { toast("Could not remove this item. Please try again."); }
    finally { setPending(false); }
  }

  return <>
    <PageHeader title="Knowledge base" description="Everything saved about you, in one place. Review what JobAssist can use for future resumes and cover letters." actions={<>
      <Link href="/profile/import" className={buttonClassName("secondary")}>Import resume content</Link>
      <Link href="/profile" className={buttonClassName("primary")}>Edit profile</Link>
    </>} />
    <div className="space-y-6 px-5 py-6 sm:px-10">
      <p className="rounded-card border border-line-card bg-paper p-4 text-sm text-muted">This is your saved profile knowledge. Add from text merges new information into your existing knowledge. Resume content imports let you choose between adding and merging or replacing profile entries after review. Template PDFs provide formatting for resumes. Application-specific notes and facts stay with their applications.</p>
      <div className="flex flex-wrap gap-3" aria-label="Add to knowledge base">
        <Link href="/knowledge/add" className={buttonClassName("primary")}>Add from text</Link>
        <Button variant="secondary" onClick={() => setAdding("project")}>Add a project</Button>
        <Button variant="secondary" onClick={() => setAdding("information")}>Add new information</Button>
        <Button variant="secondary" onClick={() => setAdding("skills")}>Add skills</Button>
      </div>
      {adding && <AddKnowledge key={adding} mode={adding} onCancel={() => setAdding(null)} onSaved={next => { setProfile(next); setAdding(null); setQuery(""); setGroup("all"); }} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <Input ref={searchInput} label="Search your knowledge" placeholder="Find a skill, project, employer or detail…" value={query} onChange={event => setQuery(event.target.value)} />
        <Select label="Category" value={group} onChange={event => setGroup(event.target.value as KnowledgeGroup | "all")}>
          <option value="all">All categories ({entries.length})</option>
          {KNOWLEDGE_GROUPS.map(([key, label]) => <option key={key} value={key}>{label} ({entries.filter(entry => entry.group === key).length})</option>)}
        </Select>
      </div>
      <p role="status" className="text-sm text-muted">{filtered.length} of {entries.length} saved items{pending ? " · Removing item…" : ""}</p>
      {entries.length === 0 ? <div className="rounded-card border border-line-card p-6"><h2 className="font-serif text-xl">Your knowledge base is empty</h2><p className="mt-2 text-sm text-muted">Import resume content or add information to your profile to get started.</p></div> : filtered.length === 0 ? <div className="space-y-3 rounded-card border border-line-card p-6"><p>No saved information matches your search.</p><Button variant="secondary" onClick={() => { setQuery(""); setGroup("all"); }}>Clear filters</Button></div> : KNOWLEDGE_GROUPS.map(([key, label]) => {
        const items = filtered.filter(entry => entry.group === key);
        if (!items.length) return null;
        return <section key={key} aria-labelledby={`knowledge-${key}`} className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 id={`knowledge-${key}`} className="font-serif text-xl">{label} <span className="font-sans text-sm text-muted">({items.length})</span></h2><Link href={items[0].editHref} className="text-sm underline underline-offset-2">Manage {label.toLowerCase()}</Link></div>
          <div className="grid gap-3 lg:grid-cols-2">{items.map(entry => <article key={`${entry.group}:${entry.id}`} aria-label={entry.title} className="min-w-0 space-y-3 rounded-card border border-line-card bg-card p-5">
            <h3 className="break-words font-semibold">{entry.title}</h3>
            {entry.details.map((detail, index) => <p key={index} className="whitespace-pre-line break-words text-sm text-muted">{detail}</p>)}
            <div className="flex gap-4 text-sm"><Link href={entry.editHref} aria-label={`Edit ${entry.title}`} className="underline underline-offset-2">Edit</Link>{entry.removable && <button type="button" disabled={pending} className="text-warning underline underline-offset-2 disabled:opacity-50" aria-label={`Remove ${entry.title}`} onClick={() => setRemoving(entry)}>Remove</button>}</div>
          </article>)}</div>
        </section>;
      })}
    </div>
    <ConfirmDialog open={removing !== null} onOpenChange={open => !open && setRemoving(null)} title={`Remove “${removing?.title ?? "item"}”?`} description={<>
      <span>This removes the saved item used for future tailoring. Existing tailored text is not rewritten automatically. Removing profile records can also change how saved application documents render.</span>
      {removing?.group === "skills" && <span className="mt-3 block">Its links to experience and projects will also be removed. Written descriptions are not rewritten. {mentions.length ? `${mentions.length} saved entries also mention this skill; review those if you want the mentions removed.` : "You can search for any remaining mentions afterward."}</span>}
    </>} confirmLabel="Remove saved item" onConfirm={() => void remove()} returnFocusTo={searchInput} />
  </>;
}
