import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { createTestClient, resetDatabase } from "@/test/db";
import { addKnowledgeInformation, addKnowledgeProject, addKnowledgeSkills } from "./actions";
const db = vi.hoisted(() => ({ client: undefined as ReturnType<typeof createTestClient> | undefined }));
vi.mock("@/lib/prisma", async () => { const { createTestClient } = await import("@/test/db"); db.client = createTestClient(); return { prisma: db.client }; });
vi.mock("@/lib/auth/session", () => ({ getSession: async () => ({ persistent: false, issuedAt: new Date(), expiresAt: new Date(Date.now() + 60000) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => resetDatabase(db.client!)); afterAll(() => db.client!.$disconnect());
it("merges matching projects, descriptions and technology links without duplicates", async () => {
  expect((await addKnowledgeProject({ name: "Wi-Fi toolkit", description: "Built roaming tests", link: "", skills: ["Python"] })).ok).toBe(true);
  const result = await addKnowledgeProject({ name: "wi-fi toolkit", description: "Built roaming tests\nAdded CI coverage", link: "github.com/example/toolkit", skills: ["python", "Testing"] });
  expect(result.ok).toBe(true); if (!result.ok) return;
  expect(result.data.projects).toHaveLength(1); expect(result.data.projects[0].bullets).toBe("Built roaming tests\nAdded CI coverage");
  expect(result.data.skills).toHaveLength(2); expect(result.data.projects[0].skillIds).toHaveLength(2);
  expect(await db.client!.project.count()).toBe(1);
});
it("adds skills and personal facts idempotently without touching templates", async () => {
  await addKnowledgeSkills({ skills: ["Python", "python", "Wi-Fi testing"] });
  expect(await db.client!.skill.count()).toBe(2);
  await addKnowledgeInformation({ text: "Available for remote roles" }); await addKnowledgeInformation({ text: "available for remote roles" });
  expect(await db.client!.fact.count()).toBe(1); expect(await db.client!.theme.count()).toBe(0);
});
it("rejects invalid manual entries before saving", async () => {
  expect((await addKnowledgeProject({ name: "", description: "", link: "", skills: [] })).ok).toBe(false);
  expect(await db.client!.project.count()).toBe(0);
});
