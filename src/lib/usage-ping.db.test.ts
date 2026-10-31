import { describe, expect, it, vi } from "vitest";
import { askForUsagePing, pingIfNewDay, sendPing, usagePingEnabled } from "./usage-ping";
describe("JobAssist telemetry disabled", () => {
 it("never sends a request even with old consent and an explicit URL", async () => {
  const fetchImpl = vi.fn();
  const consent = { usagePingChoice: "on" as const, usagePingChoiceText: 2 };
  expect(usagePingEnabled(consent)).toBe(false);
  expect(askForUsagePing(consent)).toBe(false);
  expect(await pingIfNewDay({ production: true, fetchImpl })).toBe("skipped");
  expect(await sendPing("old-install", fetchImpl, "https://example.com/ping")).toBe(false);
  expect(fetchImpl).not.toHaveBeenCalled();
 });
});
