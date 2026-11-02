import { postingKey, type FoundPosting, type SearchPage } from "@/lib/job-search/search";
import { JobSearchError } from "@/lib/job-search/errors";

/** FreeHire exposes at most 10,000 results in pages of 20. Fetch sequentially. */
export async function collectSearchPages(fetchPage: (next: string | null) => Promise<SearchPage>, signal: AbortSignal, onPage: (page: number) => Promise<void>, maxPages = 500): Promise<{ postings: FoundPosting[]; warning: string }> {
  const postings: FoundPosting[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let next: string | null = null;
  for (let index = 0; index < maxPages; index++) {
    signal.throwIfAborted();
    await onPage(index + 1);
    let page: SearchPage;
    try { page = await fetchPage(next); }
    catch (error) {
      if (signal.aborted) signal.throwIfAborted();
      if (index === 0 || !(error instanceof JobSearchError)) throw error;
      return { postings, warning: `Search incomplete after ${index} pages. ${error.message}` };
    }
    for (const posting of page.postings) {
      const id = postingKey(posting);
      if (!ids.has(id)) { ids.add(id); postings.push(posting); }
    }
    if (page.next === null) return { postings, warning: "" };
    if (cursors.has(page.next)) return { postings, warning: "Search incomplete: the source repeated a page cursor." };
    cursors.add(page.next);
    next = page.next;
  }
  return { postings, warning: `Search stopped at the ${maxPages}-page safety limit; more results may exist.` };
}
