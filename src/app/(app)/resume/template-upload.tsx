"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { themeFieldsSchema, type ThemeFields } from "@/lib/theme-file";

export function TemplateUpload({ onPreview }: { onPreview: (theme: ThemeFields) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const analyze = async () => {
    if (!file) return;
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Choose a PDF template smaller than 5 MB.");
      const response = await fetch("/api/resume/template", { method: "POST", body: file, headers: { "Content-Type": "application/pdf" }, signal: AbortSignal.timeout(30_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The template couldn't be read. Try another PDF.");
      const theme = themeFieldsSchema.parse(result.theme);
      if (id === requestId.current) onPreview(theme);
    } catch (error) {
      if (id === requestId.current) setError(error instanceof Error ? error.message : "The template couldn't be read.");
    } finally { if (id === requestId.current) setBusy(false); }
  };

  return <section className="space-y-4" aria-labelledby="template-upload-title">
    <h2 id="template-upload-title" className="font-serif text-xl">Upload your own template</h2>
    <p className="text-sm text-muted">Choose a resume PDF as a style reference. JobAssist reads its first page locally and measures margins, type sizes, line spacing, header alignment, columns and recognized section order.</p>
    <p className="rounded-card bg-card p-3 text-sm">JobAssist reads the PDF locally for formatting. Save theme adds a new theme and makes it the default for your base resume. The preview uses your existing knowledge base for resume content.</p>
    <label className="block space-y-2"><span className="text-sm font-medium">Resume template PDF (up to 5 MB)</span>
      <input type="file" accept=".pdf,application/pdf" disabled={busy} aria-describedby="template-upload-help" onChange={event => { setFile(event.target.files?.[0] ?? null); setError(""); }} className="block w-full text-sm" />
    </label>
    <p id="template-upload-help" className="text-sm text-muted">The editable layout follows measured formatting and recognized headings. Unrecognized custom sections, graphics and icons may differ. Font substitutions and tailored content can change line breaks and page count. Scanned PDFs are not supported. Export Word templates as PDF first. Preview uses your existing profile content.</p>
    <Button disabled={!file || busy} onClick={() => void analyze()}>{busy ? "Reading template…" : "Preview template style"}</Button>
    {busy && <p role="status" className="text-sm text-muted">Reading PDF formatting…</p>}
    {error && <p role="alert" className="text-sm text-warning">{error}</p>}
  </section>;
}
