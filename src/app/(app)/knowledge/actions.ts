"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/config";
import { importKnowledgeJob } from "@/lib/jobs/import-profile";
import { startJob } from "@/lib/jobs/runner";
import { MAX_RESUME_CHARACTERS } from "@/lib/resume-text";
import { action, ActionError } from "@/lib/action";
import { mergeKnowledgeText } from "@/lib/knowledge-merge";
import { loadProfile } from "@/lib/profile-data";
import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/profile";

const skillNames = z.array(z.string().trim().min(1).max(100)).max(40);
async function updatedProfile() { revalidatePath("/", "layout"); return loadProfile(); }

/** Explicitly supplied technologies are saved as skills; project descriptions are never expanded into invented claims. */
export const addKnowledgeProject = action(z.object({
  name: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(10_000),
  link: z.string().trim().max(500), skills: skillNames,
}), async ({ name, description, link, skills }) => {
  await prisma.$transaction(async tx => {
    const ids: string[] = [];
    let sort = ((await tx.skill.aggregate({ _max: { sort: true } }))._max.sort ?? -1) + 1;
    for (const skillName of [...new Set(skills.map(value => value.trim()))]) {
      const skill = await tx.skill.upsert({ where: { name: skillName }, create: { name: skillName, sort: sort++ }, update: {} });
      if (!ids.includes(skill.id)) ids.push(skill.id);
    }
    const known = await tx.project.findMany({ select: { id: true, name: true, bullets: true, link: true } });
    const existing = known.find(project => sameName(project.name, name));
    let projectId: string;
    if (existing) {
      await tx.project.update({ where: { id: existing.id }, data: { bullets: mergeKnowledgeText(existing.bullets, description), link: existing.link || link } });
      projectId = existing.id;
    } else {
      const sort = ((await tx.project.aggregate({ _max: { sort: true } }))._max.sort ?? -1) + 1;
      const project = await tx.project.create({ data: { name, bullets: description, link, sort } });
      projectId = project.id;
    }
    await tx.projectSkill.createMany({ data: ids.map(skillId => ({ projectId, skillId })), skipDuplicates: true });
  });
  return updatedProfile();
});

export const addKnowledgeSkills = action(z.object({ skills: skillNames.min(1) }), async ({ skills }) => {
  await prisma.$transaction(async tx => {
    let sort = ((await tx.skill.aggregate({ _max: { sort: true } }))._max.sort ?? -1) + 1;
    for (const name of skills) await tx.skill.upsert({ where: { name }, create: { name, sort: sort++ }, update: {} });
  });
  return updatedProfile();
});

export const addKnowledgeInformation = action(z.object({ text: z.string().trim().min(1).max(1000) }), async ({ text }) => {
  await prisma.$transaction(async tx => {
    const existing = await tx.fact.findMany({ where: { applicationId: null }, select: { text: true } });
    if (existing.some(fact => sameName(fact.text, text))) return;
    if (existing.length >= 50) throw new ActionError("You have 50 personal facts. Edit or remove one before adding more.");
    const sort = ((await tx.fact.aggregate({ _max: { sort: true } }))._max.sort ?? -1) + 1;
    await tx.fact.create({ data: { text, sort, applicationId: null } });
  });
  return updatedProfile();
});

/** Read informal notes with the active provider; results are reviewed before merging. */
export const extractKnowledgeText = action(z.object({ text: z.string().trim().min(1).max(MAX_RESUME_CHARACTERS) }), async ({ text }) => {
  if (!(await isAiConfigured())) throw new ActionError("Choose an AI connection in Settings before extracting knowledge from text.");
  return { jobId: await startJob(importKnowledgeJob, { text }) };
});
