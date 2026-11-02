"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractKnowledgeText } from "./actions";

/** One free-form space. The AI organizes it; no project/skill fields are required. */
export function KnowledgeTextInput({ value, onChange, onExtracted, disabled = false }: { value: string; onChange: (text: string) => void; onExtracted: (jobId: string) => void; disabled?: boolean }) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  async function read() {
    if (reading || disabled) return;
    setReading(true); setError("");
    try {
      const result = await extractKnowledgeText({ text: value });
      if (!result.ok) { setError(result.error); return; }
      onExtracted(result.data.jobId);
    } catch { setError("Your text could not be submitted. Please try again."); }
    finally { setReading(false); }
  }
  return <form className="w-full space-y-4" onSubmit={event => { event.preventDefault(); void read(); }}>
    <Textarea label="What would you like to add?" value={value} onChange={event => onChange(event.target.value)} minLength={1} maxLength={30000} required rows={10} disabled={disabled || reading} placeholder="Paste anything you want JobAssist to know. For example: I built a Wi-Fi test toolkit in Python that checks roaming and produces reports. I also used GitHub Actions for automated tests. I'm available for remote QA roles…" />
    <p className="text-sm text-muted">Paste project write-ups, skills, achievements, experience or preferences in your own words. Your active AI connection will organize them for review. Nothing is added to your knowledge base until you approve the merge. Templates stay separate.</p>
    {error && <p role="alert" className="text-sm text-warning">{error}</p>}
    <Button type="submit" disabled={disabled || reading || value.trim().length < 1}>{reading ? "Starting extraction…" : "Extract knowledge"}</Button>
  </form>;
}
