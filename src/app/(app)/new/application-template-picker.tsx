"use client";

import { useState } from "react";

import { ResumeDocument } from "@/components/documents/resume-document";
import { toastResult } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { PaperSize } from "@/generated/prisma/enums";
import type { ProfileData } from "@/lib/profile";
import type { ThemeFields } from "@/lib/theme-file";
import type { ThemeData } from "@/lib/themes";

import { saveTheme } from "../resume/actions";
import { TemplateUpload } from "../resume/template-upload";

export type TemplateOptions = {
  themes: ThemeData[];
  baseThemeId: string;
  profile: ProfileData;
  paper: PaperSize;
};

export function ApplicationTemplatePicker({
  id, themes, baseThemeId, profile, paper, selectedId, onSelect, onAdd,
}: TemplateOptions & {
  id: string;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onAdd: (theme: ThemeData) => void;
}) {
  const [upload, setUpload] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fields, setFields] = useState<ThemeFields | null>(null);
  const [saving, setSaving] = useState(false);
  const base = themes.find(theme => theme.id === baseThemeId) ?? themes[0];
  const selected = themes.find(theme => theme.id === (selectedId ?? baseThemeId)) ?? base;
  const shown = fields ? { ...fields, id: "upload-preview", builtIn: false } : selected;

  async function save() {
    if (!fields || saving) return;
    setSaving(true);
    try {
      const result = toastResult(await saveTheme({ ...fields, id: null, makeBase: false }));
      if (result.ok) {
        onAdd(result.data);
        setFields(null);
        setUpload(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="font-serif text-xl">Resume template</h2>
      <Select label="Template for this application" value={selectedId ?? ""} onChange={event => onSelect(event.target.value || undefined)}>
        <option value="">Base resume default{base ? ` · ${base.name}` : ""}</option>
        {selectedId && !themes.some(theme => theme.id === selectedId) && <option value={selectedId}>Template unavailable</option>}
        {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}{theme.builtIn ? "" : " · Saved template"}</option>)}
      </Select>
      <p className="text-sm text-muted">Choose the layout for this application’s resume and cover letter. You can change it on the finished application.</p>
      <div className="flex flex-wrap gap-2">
        {selected && <Button variant="secondary" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview template"}</Button>}
        <Button variant="secondary" aria-expanded={upload} disabled={saving} onClick={() => { setUpload(!upload); setFields(null); }}>{upload ? "Close PDF upload" : "Upload PDF template"}</Button>
      </div>
      {upload && <TemplateUpload forApplication onPreview={setFields} />}
      {fields && <Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save and use this template"}</Button>}
      {(preview || fields) && shown && <div className="max-h-[38rem] space-y-2 overflow-auto rounded-card border border-line-card p-3">
        <p className="text-sm text-muted">Layout preview with your current profile. The finished resume uses content tailored to the job.</p>
        <ResumeDocument theme={shown} profile={profile} paper={paper} />
      </div>}
    </Card>
  );
}
