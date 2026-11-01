import type { Metadata } from "next";
import { loadProfile } from "@/lib/profile-data";
import { KnowledgeBase } from "./knowledge-base";

export const metadata: Metadata = { title: "Knowledge base" };
/** Uses the same saved profile as resume generation. No separate knowledge database. */
export default async function KnowledgePage() {
  return <KnowledgeBase initial={await loadProfile()} />;
}
