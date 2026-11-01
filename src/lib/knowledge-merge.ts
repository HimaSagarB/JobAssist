/** Add new statements without replacing earlier descriptions. Exact normalized duplicates are omitted. */
export function mergeKnowledgeText(existing: string, incoming: string): string {
  const lines = existing.split("\n").map(line => line.trim()).filter(Boolean);
  const normalize = (line: string) => line.normalize("NFKC").replace(/^[•*\-]\s*/, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const seen = new Set(lines.map(normalize));
  for (const line of incoming.split("\n").map(line => line.trim()).filter(Boolean)) {
    const key = normalize(line);
    if (!seen.has(key)) { lines.push(line); seen.add(key); }
  }
  return lines.join("\n");
}

/** Saved scalar values win conflicts; missing fields are filled, descriptive notes accumulate. */
export function accumulateKnowledgeFields<T extends Record<string, unknown>>(existing: Record<string, unknown>, incoming: T): Partial<T> {
  const result: Record<string, unknown> = {};
  const dates = new Set(["startYear", "startMonth", "endYear", "endMonth", "current"]);
  const addDates = existing.startYear == null && incoming.startYear != null;
  for (const [key, value] of Object.entries(incoming)) {
    if (dates.has(key)) { if (addDates) result[key] = value; continue; }
    if (key === "bullets" || key === "notes") {
      result[key] = mergeKnowledgeText(String(existing[key] ?? ""), String(value ?? ""));
    } else if (existing[key] == null || existing[key] === "") {
      if (typeof value !== "string" || value.trim()) result[key] = value;
    }
  }
  return result as Partial<T>;
}
