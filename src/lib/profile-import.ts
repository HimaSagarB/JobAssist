import { z } from "zod";

import { LanguageLevel } from "@/generated/prisma/enums";
import { BASICS_FIELDS } from "@/lib/profile";

// A profile read from a resume file (E4-10, PRO-12), as the preview shows it
// and the import applies it. Anything the file's text doesn't contain is
// marked, so the preview can say "check this".

const span = {
  startYear: z.number().int().nullable(),
  startMonth: z.number().int().min(1).max(12).nullable(),
  endYear: z.number().int().nullable(),
  endMonth: z.number().int().min(1).max(12).nullable(),
  current: z.boolean(),
};
/** Words of an entry that aren't in the file, e.g. a company the model misspelled. */
const unverified = z.array(z.string());

export const importedProfileSchema = z.object({
  /** Personal knowledge from notes; absent from older resume readings. */
  facts: z.array(z.object({ text: z.string().max(1000), found: z.boolean() })).optional(),
  basics: z.partialRecord(z.enum(BASICS_FIELDS), z.string()),
  skills: z.array(z.object({ name: z.string(), found: z.boolean() })),
  languages: z.array(z.object({ name: z.string(), level: z.enum(LanguageLevel), levelGiven: z.boolean() })),
  experience: z.array(
    // descriptor: absent in readings from before #257.
    z.object({ role: z.string(), company: z.string(), location: z.string(), descriptor: z.string().default(""), bullets: z.string(), skills: z.array(z.string()), ...span, unverified }),
  ),
  /** Absent in readings made before projects (PRO-13). */
  projects: z
    .array(z.object({ name: z.string(), link: z.string(), bullets: z.string(), skills: z.array(z.string()), ...span, unverified }))
    .default([]),
  education: z.array(z.object({ degree: z.string(), school: z.string(), notes: z.string(), ...span, unverified })),
  /** Absent in readings made before publications (#218). */
  publications: z.array(z.object({ citation: z.string(), link: z.string(), unverified })).default([]),
  references: z.array(
    z.object({ name: z.string(), relation: z.string(), company: z.string(), email: z.string(), phone: z.string(), unverified }),
  ),
});
export type ImportedProfile = z.infer<typeof importedProfileSchema>;

/** Accumulate into the saved profile without discarding prior knowledge, or explicitly replace it. */
export type ImportMode = "merge" | "replace";

/** The steps of reading a resume, as the progress shows them. */
export const KNOWLEDGE_TEXT_STEPS = ["Reading your text", "Organizing your knowledge"] as const;

export const IMPORT_PROFILE_STEPS = ["Reading your resume", "Sorting it into your profile"] as const;

/** "3 roles, 1 project, 12 skills…": what a preview holds, for the page and the toast. */
export function importCounts(profile: ImportedProfile): string {
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  return [
    plural(profile.experience.length, "role", "roles"),
    plural(profile.projects.length, "project", "projects"),
    plural(profile.education.length, "degree", "degrees"),
    // Optional and rare: only said when there are some (#218).
    ...(profile.publications.length > 0 ? [plural(profile.publications.length, "publication", "publications")] : []),
    plural(profile.skills.length, "skill", "skills"),
    plural(profile.languages.length, "language", "languages"),
    plural(profile.references.length, "reference", "references"),
    ...((profile.facts?.length ?? 0) > 0 ? [plural(profile.facts!.length, "personal fact", "personal facts")] : []),
  ].join(", ");
}
