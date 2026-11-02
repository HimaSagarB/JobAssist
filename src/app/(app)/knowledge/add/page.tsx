import type { Metadata } from "next";
import { isAiConfigured, loadAiConfig } from "@/lib/ai/config";
import { jobRetentionLabel } from "@/lib/settings";
import { loadSettings } from "@/lib/settings-data";
import { ProfileImport } from "../../profile/import/profile-import";

export const metadata: Metadata = { title: "Add from text" };
export default async function AddKnowledgePage({ searchParams }: PageProps<"/knowledge/add">) {
  const [{ job }, aiReady, ai, settings] = await Promise.all([searchParams, isAiConfigured(), loadAiConfig(), loadSettings()]);
  return <ProfileImport source="text" basePath="/knowledge/add" aiReady={aiReady} provider={ai.provider} initialJobId={typeof job === "string" ? job : null} keptFor={jobRetentionLabel(settings.jobRetentionHours)} />;
}
