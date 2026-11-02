import type { Metadata } from "next";

import { isAiConfigured, loadAiConfig } from "@/lib/ai/config";
import { jobRetentionLabel } from "@/lib/settings";
import { loadSettings } from "@/lib/settings-data";

import { ProfileImport } from "./profile-import";

export async function generateMetadata({ searchParams }: PageProps<"/profile/import">): Promise<Metadata> {
  return { title: (await searchParams).source === "text" ? "Add from text" : "Import from a resume" };
}

/** Starts the profile from an existing resume file (E4-10, PRO-12); `?job=` follows a reading in progress. */
export default async function ProfileImportPage({ searchParams }: PageProps<"/profile/import">) {
  const [{ job, source }, aiReady, ai, settings] = await Promise.all([searchParams, isAiConfigured(), loadAiConfig(), loadSettings()]);
  return (
    <ProfileImport
      source={source === "text" ? "text" : "resume"}
      aiReady={aiReady}
      provider={ai.provider}
      initialJobId={typeof job === "string" ? job : null}
      keptFor={jobRetentionLabel(settings.jobRetentionHours)}
    />
  );
}
