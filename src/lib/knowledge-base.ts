import { BASICS_FIELDS, formatDateRange, languageLevelLabel, type ProfileData } from "./profile";

export const KNOWLEDGE_GROUPS = [
  ["basics", "Personal details"], ["skills", "Skills"], ["languages", "Languages"],
  ["experience", "Experience"], ["projects", "Projects"], ["education", "Education & certifications"],
  ["publications", "Publications"], ["references", "References"], ["facts", "Facts about me"],
] as const;
export type KnowledgeGroup = (typeof KNOWLEDGE_GROUPS)[number][0];
export type KnowledgeEntry = { id: string; group: KnowledgeGroup; title: string; details: string[]; editHref: string; removable: boolean };
const BASIC_LABELS = { name: "Full name", headline: "Headline", email: "Email", phone: "Phone", dob: "Date of birth", website: "Website", address: "Street address", city: "City", country: "Country", linkedin: "LinkedIn", summary: "About you" };
const sectionHref = (group: KnowledgeGroup) => `/profile?section=${group === "languages" ? "skills" : group}`;

/** A live view of saved profile data, not a second copy or a document archive. */
export function knowledgeEntries(profile: ProfileData): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  const add = (group: KnowledgeGroup, id: string, title: string, details: (string | undefined)[], removable = true) => entries.push({ group, id, title, details: details.filter((text): text is string => Boolean(text?.trim())), editHref: sectionHref(group), removable });
  for (const field of BASICS_FIELDS) if (profile.basics[field].trim()) add("basics", field, BASIC_LABELS[field], [profile.basics[field]], false);
  if (profile.basics.dob) add("basics", "showAge", "Show age on resumes", [profile.basics.showAge ? "Yes" : "No"], false);
  if (profile.photo) add("basics", "photo", "Profile photo", [`Stored locally. ${profile.photo.onResumes ? "Shown on resumes." : "Hidden on resumes."} Never sent to the AI.`], false);
  for (const skill of profile.skills) {
    const roles = profile.experience.filter(entry => entry.skillIds.includes(skill.id));
    const projects = profile.projects.filter(entry => entry.skillIds.includes(skill.id));
    add("skills", skill.id, skill.name, [...roles.map(entry => `Used in: ${entry.role} · ${entry.company}`), ...projects.map(entry => `Used in project: ${entry.name}`)]);
  }
  for (const entry of profile.languages) add("languages", entry.id, entry.name, [languageLevelLabel(entry.level)]);

  for (const entry of profile.experience) add("experience", entry.id, entry.role || "Untitled experience", [entry.company, entry.location, formatDateRange(entry), entry.descriptor, entry.bullets]);
  for (const entry of profile.projects) add("projects", entry.id, entry.name || "Untitled project", [entry.link, formatDateRange(entry), entry.bullets]);
  for (const entry of profile.education) add("education", entry.id, entry.degree || "Untitled education", [entry.school, formatDateRange(entry), entry.notes]);
  for (const entry of profile.publications) add("publications", entry.id, entry.citation || "Untitled publication", [entry.link, entry.onResumes ? "Included on resumes" : "Hidden from resumes"]);
  for (const entry of profile.references) add("references", entry.id, entry.name || "Unnamed reference", [entry.relation, entry.company, entry.email, entry.phone]);
  for (const entry of profile.facts) add("facts", entry.id, "Saved fact", [entry.text || "Empty fact"]);
  return entries;
}

export function searchKnowledge(entries: KnowledgeEntry[], query: string, group: KnowledgeGroup | "all"): KnowledgeEntry[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (group === "all" || entry.group === group) && terms.every(term => `${entry.title} ${entry.details.join(" ")}`.toLocaleLowerCase().includes(term)));
}

/** Removing a skill record does not rewrite free-text statements. Surface those for review. */
export function writtenSkillMentions(entries: KnowledgeEntry[], name: string): KnowledgeEntry[] {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu");
  return entries.filter(entry => entry.group !== "skills" && entry.group !== "languages" && pattern.test(`${entry.title} ${entry.details.join(" ")}`));
}

/** Keeps the overview and role/project skill links in sync after a successful deletion. */
export function withoutKnowledgeEntry(profile: ProfileData, entry: KnowledgeEntry): ProfileData {
  if (entry.group === "basics") return profile;
  const next = { ...profile, [entry.group]: profile[entry.group].filter(record => record.id !== entry.id) };
  if (entry.group === "skills") {
    next.experience = profile.experience.map(role => ({ ...role, skillIds: role.skillIds.filter(id => id !== entry.id) }));
    next.projects = profile.projects.map(project => ({ ...project, skillIds: project.skillIds.filter(id => id !== entry.id) }));
  }
  return next;
}
