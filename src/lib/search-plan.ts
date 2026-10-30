import { z } from "zod";

const lines = z.string().trim().max(3000);
export const searchPlanSchema = z.object({
  roles: lines,
  locations: lines,
  workMode: z.enum(["any", "remote", "onsite"]),
  excludedCompanies: lines,
});
export type SearchPlan = z.infer<typeof searchPlanSchema>;
export const EMPTY_SEARCH_PLAN: SearchPlan = { roles: "", locations: "", workMode: "any", excludedCompanies: "" };
export const planItems = (text: string) => text.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const containsPhrase = (text: string, phrase: string) => {
  const key = normalize(phrase);
  return key !== "" && ` ${normalize(text)} `.includes(` ${key} `);
};

/** Source metadata only: unknown work arrangements/locations need review, never assumed. */
export function planDecision(plan: SearchPlan, posting: { title: string; company: string; place: string; remote: boolean | null }): { eligible: boolean; reasons: string[]; review: string[] } {
  const reasons: string[] = [];
  const review: string[] = [];
  if (planItems(plan.excludedCompanies).some((company) => normalize(company) === normalize(posting.company))) reasons.push("Company is on your exclusion list.");
  const roles = planItems(plan.roles);
  if (roles.length && !roles.some((role) => containsPhrase(posting.title, role))) reasons.push("Title does not match a target role.");
  if (plan.workMode !== "any") {
    if (posting.remote === null) review.push("Work arrangement is not specified.");
    else if ((plan.workMode === "remote") !== posting.remote) reasons.push("Work arrangement does not match your plan.");
  }
  const places = planItems(plan.locations);
  if (places.length) {
    if (!posting.place.trim()) review.push("Location is not specified.");
    else if (!places.some((place) => containsPhrase(posting.place, place))) reasons.push("Location does not match your plan.");
  }
  return { eligible: reasons.length === 0, reasons, review };
}
