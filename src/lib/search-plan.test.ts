import { describe, expect, it } from "vitest";
import { EMPTY_SEARCH_PLAN, planDecision, searchPlanSchema } from "./search-plan";
import { settingsFromRows } from "./settings";
const posting = { title: "Senior Software Engineer", company: "Example Inc", place: "Bengaluru, India", remote: true };
describe("search plan eligibility", () => {
  it("keeps existing searches unchanged without a plan", () => {
    expect(planDecision(EMPTY_SEARCH_PLAN, posting)).toEqual({ eligible: true, reasons: [], review: [] });
    expect(settingsFromRows([]).searchPlan).toEqual(EMPTY_SEARCH_PLAN);
  });
  it("round trips preferences and rejects malformed stored data", () => {
    const plan = { ...EMPTY_SEARCH_PLAN, roles: "Software engineer", workMode: "remote" as const };
    expect(settingsFromRows([{ key: "searchPlan", value: JSON.stringify(plan) }]).searchPlan).toEqual(plan);
    expect(settingsFromRows([{ key: "searchPlan", value: "broken" }]).searchPlan).toEqual(EMPTY_SEARCH_PLAN);
    expect(searchPlanSchema.safeParse({ ...plan, roles: "a".repeat(3001) }).success).toBe(false);
  });
  it("matches role phrases without matching partial words", () => {
    expect(planDecision({ ...EMPTY_SEARCH_PLAN, roles: "Data scientist\nSoftware engineer" }, posting).eligible).toBe(true);
    expect(planDecision({ ...EMPTY_SEARCH_PLAN, roles: "Engineer" }, { ...posting, title: "Engineering manager" }).eligible).toBe(false);
  });
  it("excludes exact company names with normalized punctuation", () => {
    const plan = { ...EMPTY_SEARCH_PLAN, excludedCompanies: "Other, EXAMPLE, INC." };
    expect(planDecision(plan, posting).eligible).toBe(true);
    expect(planDecision({ ...plan, excludedCompanies: "Example Inc." }, posting).eligible).toBe(false);
    expect(planDecision({ ...plan, excludedCompanies: "Example" }, posting).eligible).toBe(true);
  });
  it("does not interpret punctuation-only entries as matches", () => {
    expect(planDecision({ ...EMPTY_SEARCH_PLAN, roles: "---" }, posting).eligible).toBe(false);
  });
  it("checks remote location restrictions and keeps unknown metadata for review", () => {
    const plan = { ...EMPTY_SEARCH_PLAN, locations: "India", workMode: "remote" as const };
    expect(planDecision(plan, posting).eligible).toBe(true);
    expect(planDecision(plan, { ...posting, place: "Germany" }).eligible).toBe(false);
    expect(planDecision(plan, { ...posting, remote: false }).eligible).toBe(false);
    expect(planDecision(plan, { ...posting, remote: null, place: "" })).toEqual({ eligible: true, reasons: [], review: ["Work arrangement is not specified.", "Location is not specified."] });
  });
});
