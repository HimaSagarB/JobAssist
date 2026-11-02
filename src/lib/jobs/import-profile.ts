import "server-only";

import { z } from "zod";

import { JobStatus } from "@/generated/prisma/enums";
import { getAiProvider } from "@/lib/ai";
import { loadTaskOptions } from "@/lib/ai/task-options";
import { extractProfile } from "@/lib/ai/tasks";
import { IMPORT_PROFILE_STEPS, KNOWLEDGE_TEXT_STEPS, importedProfileSchema } from "@/lib/profile-import";
import { prisma } from "@/lib/prisma";
import { MAX_RESUME_CHARACTERS } from "@/lib/resume-text";

import { cancelJob, defineJob } from "./runner";

const importResultSchema = z.object({ profile: importedProfileSchema, readWith: z.string(), source: z.enum(["resume", "text"]).optional() });

/**
 * Sorts a resume's text into a profile (E4-10, PRO-12). Nothing goes into
 * the profile here: the result waits in the job until the user merges or
 * replaces with it, and the job, with the resume's text, is deleted then.
 */
export const importProfileJob = defineJob({
  type: "import-profile",
  input: z.object({ resume: z.string().trim().min(1).max(MAX_RESUME_CHARACTERS) }),
  result: importResultSchema,
  async run({ resume }, { step, signal }) {
    await step(IMPORT_PROFILE_STEPS[0]);
    const [provider, options] = await Promise.all([getAiProvider(), loadTaskOptions()]);
    await step(IMPORT_PROFILE_STEPS[1]);
    const { data, promptVersion } = await extractProfile(provider, { resume }, { ...options, signal });
    return { profile: data, readWith: promptVersion };
  },
});

/** Free-form knowledge has its own jobs, so it never cancels a pending resume reading. */
export const importKnowledgeJob = defineJob({
  type: "import-knowledge",
  input: z.object({ text: z.string().trim().min(1).max(MAX_RESUME_CHARACTERS) }),
  result: importResultSchema,
  async run({ text }, { step, signal }) {
    await step(KNOWLEDGE_TEXT_STEPS[0]);
    const [provider, options] = await Promise.all([getAiProvider(), loadTaskOptions()]);
    await step(KNOWLEDGE_TEXT_STEPS[1]);
    const { data, promptVersion } = await extractProfile(provider, { resume: text, source: "text" }, { ...options, signal });
    return { profile: data, readWith: promptVersion, source: "text" as const };
  },
});

export type ImportProfileResult = z.infer<typeof importResultSchema>;

/**
 * Deletes a resume reading, or all of them, with the resume's text and what
 * was read from it; one still under way is stopped first.
 */
export async function discardProfileImports(id?: string): Promise<void> {
  const where = { type: id ? { in: [importProfileJob.type, importKnowledgeJob.type] } : importProfileJob.type, ...(id ? { id } : {}) };
  const unfinished = await prisma.job.findMany({ where: { ...where, status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] } }, select: { id: true } });
  for (const job of unfinished) await cancelJob(job.id);
  await prisma.job.deleteMany({ where });
}
