import { describe, expect, it } from "vitest";
import { demoProfile } from "./demo-profile";
import { knowledgeEntries, searchKnowledge, withoutKnowledgeEntry, writtenSkillMentions } from "./knowledge-base";

function profile() {
  const data = demoProfile();
  data.skills = [{ id: "skill-cpp", name: "C++" }, { id: "skill-java", name: "Java" }];
  data.experience = [{ ...data.experience[0], id: "role", bullets: "Built C++ systems and JavaScript tools.", skillIds: ["skill-cpp", "skill-java"] }];
  data.projects = [{ ...data.projects[0], id: "project", name: "Compiler", bullets: "Built a compiler.", skillIds: ["skill-cpp"] }];
  return data;
}

describe("knowledge base", () => {
  it("includes every saved profile collection without copying template or credential data", () => {
    const data = profile();
    const entries = knowledgeEntries(data);
    for (const group of ["skills", "languages", "experience", "projects", "education", "publications", "references", "facts"] as const) {
      expect(entries.filter(entry => entry.group === group)).toHaveLength(data[group].length);
    }
    expect(entries.find(entry => entry.group === "skills" && entry.id === "skill-cpp")?.details).toEqual(expect.arrayContaining([expect.stringContaining("Compiler")]));
    expect(JSON.stringify(entries)).not.toMatch(/apiKey|templateGeometry|data:image/);
  });
  it("searches full saved descriptions with case-insensitive terms and category filters", () => {
    const entries = knowledgeEntries(profile());
    expect(searchKnowledge(entries, "c++ SYSTEMS", "all").map(entry => entry.id)).toEqual(["role"]);
    expect(searchKnowledge(entries, "Compiler", "projects").map(entry => entry.id)).toEqual(["project"]);
    expect(searchKnowledge(entries, "", "skills")).toHaveLength(2);
    expect(searchKnowledge(entries, "no-such-detail", "all")).toHaveLength(0);
  });
  it("finds literal written skill mentions, not only skill links or substrings", () => {
    const entries = knowledgeEntries(profile());
    expect(writtenSkillMentions(entries, "C++").map(entry => entry.id)).toEqual(["role"]);
    expect(writtenSkillMentions(entries, "Java")).toHaveLength(0);
  });
  it("removes a skill and its role/project links while retaining descriptions and unrelated knowledge", () => {
    const data = profile();
    const skill = knowledgeEntries(data).find(entry => entry.id === "skill-cpp")!;
    const changed = withoutKnowledgeEntry(data, skill);
    expect(changed.skills.map(entry => entry.id)).toEqual(["skill-java"]);
    expect(changed.experience[0].skillIds).toEqual(["skill-java"]);
    expect(changed.projects[0].skillIds).toEqual([]);
    expect(changed.experience[0].bullets).toContain("C++");
    expect(data.skills).toHaveLength(2);
    expect(changed.education).toEqual(data.education);
  });
});
