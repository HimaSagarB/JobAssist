"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/action";
import { searchPlanSchema } from "@/lib/search-plan";
import { saveSettings } from "@/lib/settings-data";

export const saveSearchPlan = action(searchPlanSchema, async (searchPlan) => {
  await saveSettings({ searchPlan });
  revalidatePath("/search-plan");
  return { saved: true };
});
