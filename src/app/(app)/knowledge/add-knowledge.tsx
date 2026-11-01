"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/toast";
import type { ProfileData } from "@/lib/profile";
import { addKnowledgeInformation, addKnowledgeProject, addKnowledgeSkills } from "./actions";

export type AddKnowledgeMode = "project" | "information" | "skills";
export function AddKnowledge({ mode, onSaved, onCancel }: { mode: AddKnowledgeMode; onSaved: (profile: ProfileData) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = mode === "project" ? "Add a project" : mode === "skills" ? "Add skills" : "Add new information";
  const names = () => skills.split(/[,\n]/).map(value => value.trim()).filter(Boolean);
  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const result = mode === "project" ? await addKnowledgeProject({ name, description, link, skills: names() }) : mode === "skills" ? await addKnowledgeSkills({ skills: names() }) : await addKnowledgeInformation({ text: description });
      if (!result.ok) { setError(result.error); return; }
      onSaved(result.data);
      toast(mode === "project" ? "Project saved. Tailoring can now consider it alongside your other projects." : "New information added to your knowledge base.");
    } catch { setError("Could not save. Please try again."); }
    finally { setSaving(false); }
  }
  return <section className="rounded-card border border-line-card bg-card p-5" aria-label={title}>
    <h2 className="font-serif text-xl">{title}</h2>
    <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      {mode === "project" && <><Input label="Project name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={saving} />
        <Textarea label="Project description" required rows={5} maxLength={10000} value={description} onChange={event => setDescription(event.target.value)} disabled={saving} placeholder="What you built, the problem it solves, your contribution, technologies you used, and any real results." />
        <Input label="Project link (optional)" maxLength={500} value={link} onChange={event => setLink(event.target.value)} disabled={saving} />
        <p className="text-sm text-muted">All projects stay in your knowledge base. For each job, the assistant compares their descriptions and chooses only the most relevant ones. A matching project name adds new details to that project.</p></>}
      {(mode === "project" || mode === "skills") && <Textarea label={mode === "project" ? "Technologies you used (optional)" : "Skills to add"} required={mode === "skills"} rows={2} value={skills} onChange={event => setSkills(event.target.value)} disabled={saving} placeholder="Separate names with commas or new lines, for example: Python, React, Wi-Fi testing" />}
      {mode === "information" && <Textarea label="New information about you" required rows={4} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} disabled={saving} placeholder="For example: availability, work preferences, achievements or context you want the assistant to know." />}
      <p className="text-sm text-muted">This is saved as information you supplied. Nothing is sent to an AI while you add it.</p>
      {error && <p role="alert" className="text-sm text-warning">{error}</p>}
      <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save to knowledge base"}</Button><Button variant="secondary" disabled={saving} onClick={onCancel}>Cancel</Button></div>
    </form>
  </section>;
}
