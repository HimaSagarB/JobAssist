"use server";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { isAiUsable } from "@/lib/ai/config";
import { dayOf } from "@/lib/calendar-view";
import { agentSetupProblem } from "@/lib/agent/run";
import { AGENT_JOB_KEY, agentScanJob } from "@/lib/agent/jobs";
import { runLimitProblem } from "@/lib/agent/runs";
import { serializeAgentStart } from "@/lib/agent/start-lock";
import { findUnfinishedJobs, startJob } from "@/lib/jobs/runner";
import { loadProfileName } from "@/lib/profile-data";
import { loadSettings, saveSettings } from "@/lib/settings-data";

const input = z.object({ timeZone: z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}, "Choose a valid time zone.") });

// Authenticated browser action only. Terminal launch never stores or bypasses
// a browser session, and this entry point never imports submission code.
export const startDailySearch = action(input, async ({ timeZone }) => serializeAgentStart(async () => {
  const [unfinished] = await findUnfinishedJobs(AGENT_JOB_KEY);
  if (unfinished) return { state: "running" as const, jobId: unfinished.id, message: "Your search is already running." };
  const settings = await loadSettings();
  const today = dayOf(new Date(), timeZone);
  if (settings.agentRuns.some(run => dayOf(new Date(run.at), timeZone) === today)) {
    return { state: "already" as const, jobId: null, message: "Today's search has already been started. Review its results in the job agent. If it failed, use Run now there after the cooldown." };
  }
  if (!(await loadProfileName()).trim()) throw new ActionError("Import your resume and check your profile before starting your daily search.");
  if (!(await isAiUsable())) throw new ActionError("Save and activate an AI connection with a model and any required API key first.");
  const problem = await agentSetupProblem(settings.agentQuery);
  if (problem) throw new ActionError(problem);
  const limit = runLimitProblem(settings.agentRuns, new Date(), { manual: true });
  if (limit) throw new ActionError(limit);
  await saveSettings({ browserTimeZone: timeZone });
  const jobId = await startJob(agentScanJob, { manual: true }, { key: AGENT_JOB_KEY });
  return { state: "started" as const, jobId, message: "Your daily search has started. Draft preparation follows your job agent settings." };
}));
