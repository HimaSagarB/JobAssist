import { test, expect } from "@playwright/test";
import { resetData, answerUsagePing, fakePings } from "./support";
test("does not offer or send usage telemetry even with previous consent", async ({ page }) => {
 await resetData(); await answerUsagePing("on"); await page.goto("/");
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.goto("/settings?section=about");
 await expect(page.getByText("JobAssist does not collect usage telemetry.")).toBeVisible();
 await expect(page.getByRole("switch", { name: "Send the daily usage ping" })).toHaveCount(0);
 expect(await fakePings()).toEqual([]);
});
