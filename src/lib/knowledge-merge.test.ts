import { describe, expect, it } from "vitest";
import { accumulateKnowledgeFields, mergeKnowledgeText } from "./knowledge-merge";

describe("additive knowledge merging", () => {
  it("retains earlier statements and appends only novel lines", () => {
    expect(mergeKnowledgeText("Built a Python API\nTested Wi-Fi", "- built a Python API\nAdded CI automation")).toBe("Built a Python API\nTested Wi-Fi\nAdded CI automation");
  });
  it("preserves conflicting saved details and dates while filling blanks", () => {
    expect(accumulateKnowledgeFields({ name: "Saved", link: "", startYear: 2024, current: true, bullets: "First detail" }, { name: "Other", link: "github.com/example", startYear: 2025, current: false, bullets: "Second detail" })).toEqual({ link: "github.com/example", bullets: "First detail\nSecond detail" });
  });
});
