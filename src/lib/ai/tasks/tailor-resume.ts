import { z } from "zod";

import { unitsSchema, type Extracted, type Match, type Unit } from "@/lib/application-data";
import { publicationLabel } from "@/lib/citation";
import { documentLabels, ENGLISH_LABELS, languagesLine, type DocumentLabels } from "@/lib/document-labels";
import { resumePublications, sameName, type ProfileData } from "@/lib/profile";

import { guardSources, guardUnits } from "../fact-guard";

import {
  applicationFacts,
  candidateFacts,
  CREATIVITY,
  JOB_ALIGNED_WORDING,
  jobForPrompt,
  postingForPrompt,
  languageRule,
  NO_EM_DASHES,
  profileForPrompt,
  system,
  truthfulness,
  UNTRUSTED_POSTING,
  type Task,
} from "./prompt-parts";

export const TAILOR_RESUME_VERSION = "tailor-resume@9";

const answerSchema = z.object({
  summary: z.string(),
  roles: z.array(z.object({ id: z.string(), bullets: z.array(z.string()) })),
  projects: z.array(z.object({ id: z.string(), bullets: z.array(z.string()) })),
  /** The profile's skills, most relevant first; leave out ones that don't help. */
  skills: z.array(z.string()),
  education: z.array(z.object({ id: z.string(), notes: z.string() })),
});

const INSTRUCTIONS = `You tailor a candidate's resume to one job, as JSON.

- summary: 2–3 sentences in the first person without "I" at the start of every sentence, about the candidate as this job would see them.
- roles: every role from the profile, by id, with 2–5 bullets each. Lead with what this job cares about, keep each bullet to one line, and start with a verb.
- projects: review ALL saved projects and their descriptions and skills, then select ONLY those with direct evidence relevant to the job requirements. Return the strongest first, by exact saved id, with 1–3 factual bullets each. Omit unrelated, weak or redundant projects; an empty list is valid. Do not invent missing skills or accomplishments. Never include all projects just because they are available.
- skills: the candidate's own skills, most relevant to this job first. Copy their names exactly; you may leave out ones that don't help.
- education: every entry by id, with its notes shortened or left empty.
- The profile's publications go on the resume word for word, so don't answer with them; the summary may mention them.`;

/** SET-9: asked for when "Resume length" has a limit; anything still over is trimmed afterwards (E10-10). */
function pageFit(maxPages: number | null | undefined): string | null {
  if (maxPages === 1) {
    return "The resume has to fit on one page: keep the summary to two sentences, give the most relevant roles 3–4 bullets and older roles 2, and keep education and project notes to a few words.";
  }
  if (maxPages === 2) {
    return "The resume has to fit on two pages: keep the summary to three sentences, give the most relevant roles 4–5 bullets and older roles 2–3, and keep education and project notes short.";
  }
  return null;
}

export type TailorInput = {
  profile: ProfileData;
  extracted: Extracted;
  match: Match | null;
  /** What the candidate tells the AI for this application (APP-15). */
  facts: string[];
  /** The posting as pasted, for the fact guard. */
  posting: string;
};

/** APP-4: the tailored resume as units (summary, each role, each project, skills, each degree, each publication, languages). */
export const tailorResume: Task<TailorInput, Unit[]> = async (provider, { profile, extracted, match, facts, posting }, options) => {
  const maxProjects = options.maxPages === 1 ? 2 : 3;
  const answer = await provider.complete({
    system: system(
      INSTRUCTIONS,
      `Include at most ${maxProjects} projects. Judge relevance from the full descriptions, demonstrated technologies, responsibilities and outcomes; do not rank on the title alone.`,
      pageFit(options.maxPages),
      truthfulness(options.strict),
      JOB_ALIGNED_WORDING,
      candidateFacts(profile, facts),
      CREATIVITY[options.creativity],
      languageRule(options.language),
      UNTRUSTED_POSTING,
      NO_EM_DASHES,
    ),
    messages: [
      {
        role: "user",
        content: [
          `The candidate's profile:\n${profileForPrompt(profile)}`,
          `The job:\n${jobForPrompt(extracted, match)}`,
          `The original job description:\n${postingForPrompt(posting)}`,
          applicationFacts(facts),
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    schema: answerSchema,
    schemaName: "tailored_resume",
    creativity: options.creativity,
    signal: options.signal,
  });
  // The languages line in the resume's language: the chosen one, or the posting's.
  const units = resumeUnits(profile, answer, documentLabels(options.language ?? extracted.language), maxProjects);
  // E6-6: in strict mode, note what the profile and posting don't back.
  return {
    data: options.strict ? guardUnits(units, guardSources(profile, extracted, posting, facts)) : units,
    promptVersion: TAILOR_RESUME_VERSION,
  };
};

/**
 * Turns the answer into units, trusting nothing: unknown roles, projects and
 * degrees are dropped, skills must be the profile's own, and a role the model skipped keeps its bullets from the profile. Projects are included only when selected, in relevance order, within the cap. The publications and languages
 * come from the profile, publications word for word (#218), and languages with their levels in
 * the words of `labels`.
 */
export function resumeUnits(profile: ProfileData, answer: z.infer<typeof answerSchema>, labels: DocumentLabels = ENGLISH_LABELS, maxProjects = 3): Unit[] {
  const roles = new Map(answer.roles.map((role) => [role.id, role.bullets]));
  const selectedProjects = [...new Map(answer.projects.map(project => [project.id, project])).values()]
    .filter(project => profile.projects.some(entry => entry.id === project.id) && project.bullets.some(line => line.trim()))
    .slice(0, maxProjects);
  const notes = new Map(answer.education.map((entry) => [entry.id, entry.notes]));
  const skills = [
    ...new Set(answer.skills.flatMap((name) => profile.skills.find((skill) => sameName(skill.name, name))?.name ?? [])),
  ];
  const units: Unit[] = [
    { id: "summary", label: "Summary", text: answer.summary.trim() },
    ...profile.experience.map((entry) => {
      const bullets = (roles.get(entry.id) ?? entry.bullets.split("\n")).map((line) => line.trim()).filter(Boolean);
      return { id: `experience:${entry.id}`, label: `${entry.company || entry.role} role`, text: bullets.join("\n") };
    }),
    ...selectedProjects.map((selected) => {
      const entry = profile.projects.find(project => project.id === selected.id)!;
      const bullets = selected.bullets.map((line) => line.trim()).filter(Boolean);
      return { id: `project:${entry.id}`, label: `${entry.name || "Untitled"} project`, text: bullets.join("\n") };
    }),
    { id: "skills", label: "Skills", text: skills.join(" · ") },
    ...profile.education.map((entry) => ({
      id: `education:${entry.id}`,
      label: entry.degree || entry.school,
      text: (notes.get(entry.id) ?? entry.notes).trim(),
    })),
    ...resumePublications(profile.publications).map((entry) => ({
      id: `publication:${entry.id}`,
      label: publicationLabel(entry.citation),
      text: entry.citation.trim(),
    })),
    {
      id: "languages",
      label: "Languages",
      text: languagesLine(profile.languages, labels),
    },
  ];
  return unitsSchema.parse(units);
}
