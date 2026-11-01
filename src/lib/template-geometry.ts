import { z } from "zod";

export const templateSectionSchema = z.enum(["summary", "experience", "education", "projects", "skills", "languages", "publications", "references", "certifications", "leadership"]);
export type TemplateSection = z.infer<typeof templateSectionSchema>;
const dimension = (min: number, max: number) => z.number().finite().min(min).max(max);
/** Style data only. No HTML, CSS, executable code, filenames or personal resume text. */
export const templateGeometrySchema = z.object({
  version: z.literal(1), paper: z.enum(["A4", "LETTER"]),
  paddingX: dimension(12, 100), paddingY: dimension(12, 100),
  fontSize: dimension(8, 18), nameSize: dimension(16, 48), headingSize: dimension(9, 24),
  lineHeight: dimension(1, 1.8), sectionGap: dimension(2, 30), itemGap: dimension(1, 16),
  headingGap: dimension(1, 12), headerGap: dimension(0, 20), bulletIndent: dimension(8, 32),
  headingWeight: z.union([z.literal(400), z.literal(600)]),
  computerModern: z.boolean(), smallCapsName: z.boolean(), showHeadline: z.boolean(),
  sectionOrder: z.array(templateSectionSchema).max(10),
  sidebarSections: z.array(templateSectionSchema).max(10),
  technicalSkillsLabel: z.boolean(), summaryBullet: z.boolean(),
});
export type TemplateGeometry = z.infer<typeof templateGeometrySchema>;
export function readTemplateGeometry(value: unknown): TemplateGeometry | undefined {
  const parsed = templateGeometrySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Recognize structural headings only. Unrecognized text is never stored as template metadata. */
export function sectionFromHeading(text: string): TemplateSection | undefined {
  const label = text.trim().toLowerCase().replace(/[:\s]+$/g, "");
  const headings: Record<TemplateSection, RegExp> = {
    summary: /^(profile|summary|professional summary|about me|objective)$/,
    experience: /^(experience|work experience|professional experience|employment)$/,
    education: /^(education|academic qualifications|academic background)$/,
    projects: /^(projects|personal projects|academic projects|selected projects)$/,
    skills: /^(skills|technical skills|technical expertise|core competencies)$/,
    languages: /^(languages|language proficiency)$/,
    publications: /^(publications|research publications)$/,
    references: /^(references)$/,
    certifications: /^(certifications|certificates|courses|certifications & courses)$/,
    leadership: /^(leadership|leadership & extracurricular activities|extracurricular activities|volunteering|leadership experience)$/,
  };
  return (Object.keys(headings) as TemplateSection[]).find(key => headings[key].test(label));
}
