import { expect, test } from "@playwright/test";
import { resetData, sql } from "./support";
test.beforeEach(async () => {
 await resetData();
 await sql(`INSERT INTO "Setting" (key,value,"updatedAt") VALUES ('agentQuery',$1,now()),('agentAutoDraft','true',now()),('agentMinScore','75',now()),('agentMaxDrafts','1',now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [JSON.stringify({ keywords: "Product Designer", country: "nl", place: "Rotterdam", radiusKm: 25, remoteOnly: false, postedWithin: "any" })]);
});
test("daily launch searches, prepares a draft and does not run twice or submit it", async ({ page }) => {
 await page.goto("/daily");
 await expect(page).toHaveURL("/agent");
 await expect(page.getByRole("region", { name: "Drafts to review" }).getByRole("link", { name: "Review draft" })).toBeVisible({ timeout: 60000 });
 const runs = await sql<{ value: string }>(`SELECT value FROM "Setting" WHERE key='agentRuns'`);
 expect(JSON.parse(runs[0].value)).toHaveLength(1);
 expect(await sql(`SELECT status,"awaitingReview" FROM "Application" WHERE origin='AGENT'`)).toEqual([{ status: "DRAFT", awaitingReview: true }]);
 await page.goto("/daily");
 await expect(page.getByRole("status").filter({ hasText: "Today's search has already been started" })).toBeVisible();
 const later = await sql<{ value: string }>(`SELECT value FROM "Setting" WHERE key='agentRuns'`);
 expect(JSON.parse(later[0].value)).toHaveLength(1);
});
test("shows missing profile setup without searching", async ({ page }) => {
 await sql(`UPDATE "ProfileField" SET value='' WHERE key='name'`);
 await page.goto("/daily");
 await expect(page.getByRole("status").filter({ hasText: "Import your resume" })).toBeVisible();
 expect(await sql(`SELECT id FROM "Job" WHERE type='agent-scan'`)).toHaveLength(0);
});
test("daily launch redirects a signed-out user to normal sign-in", async ({ page }) => {
 await page.context().clearCookies(); await page.goto("/daily");
 await expect(page).toHaveURL(/\/login\?next=/);
 expect(await sql(`SELECT id FROM "Job" WHERE type='agent-scan'`)).toHaveLength(0);
});
