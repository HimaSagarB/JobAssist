import { expect, it } from "vitest";
import { demoProfile } from "@/lib/demo-profile";
import { tailorResume } from "./tailor-resume";

/** Explicit opt-in only: one call with synthetic data, using the configured provider. */
it.skipIf(process.env.JOBASSIST_VERIFY_PROJECT_SELECTION !== "1")("selects relevant projects with the connected model", async () => {
  const { getAiProvider } = await import("@/lib/ai");
  const { prisma } = await import("@/lib/prisma");
  try {
    const profile = demoProfile();
    profile.basics.name = "Synthetic test candidate";
    profile.skills = [{ id: "python", name: "Python" }, { id: "playwright", name: "Playwright" }, { id: "figma", name: "Figma" }];
    const base = profile.projects[0];
    profile.projects = [
      { ...base, id: "browser-qa", name: "Browser regression suite", bullets: "Built automated browser regression tests with Python and Playwright. Ran tests in CI.", skillIds: ["python", "playwright"] },
      { ...base, id: "network-qa", name: "Network validation toolkit", bullets: "Built Python scripts to automate Wi-Fi roaming validation and report failures.", skillIds: ["python"] },
      { ...base, id: "poster-design", name: "Film club posters", bullets: "Designed event posters in Figma.", skillIds: ["figma"] },
      { ...base, id: "recipe-site", name: "Recipe gallery", bullets: "Built a static HTML recipe gallery.", skillIds: [] },
    ];
    const extracted = { title: "QA Automation Engineer", company: "Example Company", role: "QA Automation Engineer", location: "Remote", mode: "remote", salary: null, deadline: null, requirements: [{ text: "Python and Playwright browser test automation in CI", kind: "skill" as const, skill: "Playwright", years: null, language: null }], asksForReferences: false, language: "English" };
    const result = await tailorResume(await getAiProvider(), { profile, extracted, match: null, facts: [], posting: "QA Automation Engineer: Python, Playwright browser regression tests, and CI." }, { strict: true, creativity: "FAITHFUL", language: "English", maxPages: 1, signal: AbortSignal.timeout(45000) });
    const selected = result.data.filter(unit => unit.id.startsWith("project:")).map(unit => unit.id);
    expect(selected).toContain("project:browser-qa");
    expect(selected).not.toContain("project:poster-design");
    expect(selected.length).toBeLessThanOrEqual(2);
    expect(profile.projects).toHaveLength(4);
  } finally { await prisma.$disconnect(); }
}, 50000);
