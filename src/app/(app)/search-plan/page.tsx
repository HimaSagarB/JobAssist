import type { Metadata } from "next";
import { loadSettings } from "@/lib/settings-data";
import { SearchPlanScreen } from "./search-plan-screen";

export const metadata: Metadata = { title: "Search plan" };
export default async function SearchPlanPage() {
  const settings = await loadSettings();
  return <SearchPlanScreen initial={settings.searchPlan} />;
}
