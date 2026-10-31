import "server-only";
import { loadSettings, saveSettings } from "@/lib/settings-data";
import type { SettingsData } from "@/lib/settings";

// Kept as a no-op interface for existing callers and imported settings.
// JobAssist has no usage-collection service and never sends install telemetry.
export const USAGE_PING_HOST = "disabled";
export const USAGE_PING_URL = "";
export const USAGE_PING_TEXT_VERSION = 2;
export const USAGE_PING_NOTICE = "JobAssist does not send usage telemetry.";
export const USAGE_PING_QUESTION_NOTICE = USAGE_PING_NOTICE;
export type UsagePingChoice = { choice: "on" | "off"; source: "env" | "app" } | { choice: null; source: null };
export function usagePingChoice(_settings: Pick<SettingsData, "usagePingChoice" | "usagePingChoiceText">, _fromEnv?: "on" | "off"): UsagePingChoice {
  void _settings; void _fromEnv;
  return { choice: "off", source: "app" };
}
export function usagePingEnabled(_settings: Pick<SettingsData, "usagePingChoice" | "usagePingChoiceText">): boolean { void _settings; return false; }
export function askForUsagePing(_settings: Pick<SettingsData, "usagePingChoice" | "usagePingChoiceText">): boolean { void _settings; return false; }
export async function saveUsagePingChoice(choice: "on" | "off", now = new Date()): Promise<void> {
  // Preserve the stored preference for old API clients; it cannot enable network collection.
  await saveSettings({ usagePingChoice: choice, usagePingChoiceAt: now.toISOString(), usagePingChoiceText: USAGE_PING_TEXT_VERSION, ...(choice === "off" ? { usagePingId: null, usagePingDay: null } : {}) });
}
export async function recordEnvChoice(_fromEnv?: "on" | "off", now = new Date()): Promise<void> {
  void _fromEnv;
  const settings = await loadSettings();
  if (settings.usagePingChoice !== "off" || settings.usagePingId) await saveUsagePingChoice("off", now);
}
export function usagePingNotice(_settings: Pick<SettingsData, "usagePingChoice" | "usagePingChoiceText">): string | null { void _settings; return null; }
export function utcDay(date: Date): string { return date.toISOString().slice(0, 10); }
export async function pingIfNewDay(_options: { now?: Date; production?: boolean; fetchImpl?: typeof fetch } = {}): Promise<"sent" | "failed" | "skipped"> { void _options; return "skipped"; }
export async function sendPing(_id: string, _fetchImpl: typeof fetch = fetch, _url?: string): Promise<boolean> { void _id; void _fetchImpl; void _url; return false; }
export async function notePageLoad(): Promise<void> { /* Telemetry intentionally disabled. */ }
