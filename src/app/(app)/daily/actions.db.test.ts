import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestClient, resetDatabase } from "@/test/db";
import { saveSettings } from "@/lib/settings-data";
import { startDailySearch } from "./actions";
const state = vi.hoisted(() => ({ client: undefined as ReturnType<typeof createTestClient> | undefined, ai: true, name: "Test User", signedIn: true }));
vi.mock("@/lib/prisma", async () => { const { createTestClient } = await import("@/test/db"); state.client = createTestClient(); return { prisma: state.client }; });
vi.mock("@/lib/auth/session", () => ({ getSession: async () => state.signedIn ? { persistent: false, issuedAt: new Date(), expiresAt: new Date(Date.now() + 60000) } : null }));
vi.mock("@/lib/ai/config", () => ({ isAiConfigured: async () => state.ai, isAiUsable: async () => state.ai }));
vi.mock("@/lib/profile-data", () => ({ loadProfileName: async () => state.name }));
vi.mock("@/lib/job-search/config", () => ({ loadJobSearchConfig: async () => ({ source: "JSEARCH" }), credentialsFor: () => ({ key: "test" }), requestContext: () => ({}) }));
vi.mock("@/lib/jobs/runner", async original => ({ ...(await original<typeof import("@/lib/jobs/runner")>()), startJob: vi.fn(async () => {
  const job = await state.client!.job.create({ data: { type: "agent-scan", key: "agent", input: { manual: true } } }); return job.id;
}) }));
beforeEach(async () => {
  Object.assign(state, { ai: true, name: "Test User", signedIn: true });
  await resetDatabase(state.client!);
  await saveSettings({ agentEnabled: false, agentQuery: { keywords: "Designer", country: "in", place: "", radiusKm: 25, remoteOnly: false, postedWithin: "any" } });
});
afterEach(() => vi.useRealTimers());
afterAll(() => state.client!.$disconnect());
describe("daily terminal search", () => {
 it("starts without enabling the unattended schedule and reuses an in-flight scan", async () => {
  const first = await startDailySearch({ timeZone: "Asia/Kolkata" });
  expect(first).toMatchObject({ ok: true, data: { state: "started" } });
  const second = await startDailySearch({ timeZone: "Asia/Kolkata" });
  expect(second).toMatchObject({ ok: true, data: { state: "running" } });
  expect(await state.client!.job.count()).toBe(1);
 });
 it("serializes simultaneous launches", async () => {
  await Promise.all([startDailySearch({ timeZone: "UTC" }), startDailySearch({ timeZone: "UTC" })]);
  expect(await state.client!.job.count()).toBe(1);
 });
 it("recognizes an earlier search on the same local day across UTC midnight", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-01T03:00:00Z"));
  await saveSettings({ agentRuns: [{ at: "2026-10-31T20:00:00Z", manual: true, message: "Done" }] });
  expect(await startDailySearch({ timeZone: "Asia/Kolkata" })).toMatchObject({ ok: true, data: { state: "already" } });
  expect(await state.client!.job.count()).toBe(0);
 });
 it("blocks empty profile, missing AI and invalid timezones without starting work", async () => {
  state.name = ""; expect(await startDailySearch({ timeZone: "UTC" })).toMatchObject({ ok: false });
  state.name = "Test"; state.ai = false; expect(await startDailySearch({ timeZone: "UTC" })).toMatchObject({ ok: false });
  expect(await startDailySearch({ timeZone: "not-a-zone" })).toMatchObject({ ok: false });
  expect(await state.client!.job.count()).toBe(0);
 });
 it("requires normal browser authentication", async () => {
  state.signedIn = false;
  expect(await startDailySearch({ timeZone: "UTC" })).toMatchObject({ ok: false });
  expect(await state.client!.job.count()).toBe(0);
 });
});
