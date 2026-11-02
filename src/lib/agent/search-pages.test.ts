import { describe, expect, it, vi } from "vitest";
import { JobSearchError } from "@/lib/job-search/errors";
import type { FoundPosting, SearchPage } from "@/lib/job-search/search";
import { collectSearchPages } from "./search-pages";
const posting = (id: string) => ({ source: "FREEHIRE", externalId: id } as FoundPosting);
const signal = () => new AbortController().signal;
const progress = async () => {};

describe("collectSearchPages", () => {
  it("follows every cursor, deduplicates across pages, and traverses empty pages", async () => {
    const fetch = vi.fn<(next: string | null) => Promise<SearchPage>>()
      .mockResolvedValueOnce({ postings: [posting("a")], next: "20" })
      .mockResolvedValueOnce({ postings: [], next: "40" })
      .mockResolvedValueOnce({ postings: [posting("a"), posting("b")], next: null });
    const step = vi.fn(progress);
    const result = await collectSearchPages(fetch, signal(), step);
    expect(result.postings.map(p => p.externalId)).toEqual(["a", "b"]);
    expect(fetch.mock.calls.map(c => c[0])).toEqual([null, "20", "40"]);
    expect(step.mock.calls).toHaveLength(3);
    expect(result.warning).toBe("");
  });
  it("stops repeated cursors and reports incomplete coverage", async () => {
    const fetch = vi.fn(async () => ({ postings: [posting("a")], next: "same" }));
    const result = await collectSearchPages(fetch, signal(), progress);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.warning).toContain("repeated");
  });
  it("preserves earlier pages on a later source failure", async () => {
    const fetch = vi.fn<() => Promise<SearchPage>>()
      .mockResolvedValueOnce({ postings: [posting("a")], next: "20" })
      .mockRejectedValueOnce(new JobSearchError("quota", "Source quota reached."));
    const result = await collectSearchPages(fetch, signal(), progress);
    expect(result.postings).toHaveLength(1);
    expect(result.warning).toContain("incomplete after 1 pages");
    expect(result.warning).toContain("Source quota reached");
  });
  it("propagates first-page failures", async () => {
    await expect(collectSearchPages(async () => { throw new JobSearchError("unavailable", "Unavailable"); }, signal(), progress)).rejects.toThrow("Unavailable");
  });
  it("honours cancellation without fetching", async () => {
    const controller = new AbortController(); controller.abort();
    const fetch = vi.fn();
    await expect(collectSearchPages(fetch, controller.signal, progress)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stops at the page budget and reports that more results may exist", async () => {
    let n = 0;
    const result = await collectSearchPages(async () => ({ postings: [posting(String(++n))], next: String(n) }), signal(), progress, 2);
    expect(n).toBe(2);
    expect(result.warning).toContain("2-page safety limit");
  });
});
