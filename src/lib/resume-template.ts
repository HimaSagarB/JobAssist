import "server-only";

import { themeFieldsSchema, type ThemeFields } from "./theme-file";
import { THEME_STYLE_DEFAULTS } from "./themes";
import { sectionFromHeading, type TemplateSection } from "./template-geometry";

export const TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;
export const TEMPLATE_LIMIT_MESSAGE = "Choose a PDF template smaller than 5 MB.";
export const TEMPLATE_NOTICE = "Measured first-page layout: type sizes, margins, spacing, header alignment and recognized section order. Fonts are matched locally. Content changes may alter line breaks and page count; scanned/image-only PDFs are not supported.";

export class TemplateReadError extends Error {}

type TextMark = { x: number; y: number; width: number; size: number; weight: number; font: string; text?: string };
type StyleEvidence = { width: number; height: number; marks: TextMark[]; colors: string[]; rules: boolean };

/** Converts only visual measurements into editable settings; no resume text leaves this module. */
export function templateStyle({ width, height, marks, colors, rules }: StyleEvidence): ThemeFields {
  if (!marks.length) throw new TemplateReadError("That PDF has no readable text. Choose an exported resume PDF rather than a scan.");
  const fonts = new Map<string, number>();
  for (const mark of marks) fonts.set(mark.font, (fonts.get(mark.font) ?? 0) + mark.weight);
  const primaryFont = [...fonts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const font = /times|garamond|serif|cmr|cmbx|cmti|cmcsc|lmr|latin.?modern|liberation.?serif/i.test(primaryFont) && !/sans/i.test(primaryFont)
    ? "GARAMOND" : /mono|courier|consolas/i.test(primaryFont) ? "PLEX_MONO" : "GEIST";
  const top = marks.filter(mark => mark.y > height * 0.75).sort((a, b) => b.size - a.size)[0];
  const centered = top && Math.abs(top.x + top.width / 2 - width / 2) < width * 0.08;
  const accents = new Map<string, number>();
  for (const color of colors) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) continue;
    const rgb = [1, 3, 5].map(i => Number.parseInt(color.slice(i, i + 2), 16));
    if (Math.max(...rgb) - Math.min(...rgb) < 35 || Math.min(...rgb) > 210) continue;
    accents.set(color.toLowerCase(), (accents.get(color.toLowerCase()) ?? 0) + 1);
  }
  const accent = [...accents].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#1d1c1a";
  const left = Math.min(...marks.map(mark => mark.x));
  const scale = 640 / width;
  const bounded = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value * 100) / 100));
  const median = (values: number[], fallback: number) => values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : fallback;
  const sizes = new Map<number, number>();
  for (const mark of marks) { const size = Math.round(mark.size * 5) / 5; sizes.set(size, (sizes.get(size) ?? 0) + mark.weight); }
  const bodySize = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
  const rows: { y: number; x: number; end: number; size: number; text: string }[] = [];
  for (const mark of [...marks].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const previous = rows[rows.length - 1];
    if (previous && Math.abs(previous.y - mark.y) < 2 && mark.x - previous.end < width * 0.12) {
      previous.text += ` ${mark.text ?? ""}`; previous.end = Math.max(previous.end, mark.x + mark.width);
    } else rows.push({ y: mark.y, x: mark.x, end: mark.x + mark.width, size: mark.size, text: mark.text ?? "" });
  }
  const headings = rows.flatMap((row, index) => {
    const section = sectionFromHeading(row.text);
    return section ? [{ ...row, section, index }] : [];
  });
  const order = [...new Set(headings.map(row => row.section))];
  const headingSize = median(headings.map(row => row.size), bodySize * 1.2);
  const advances = rows.slice(1).map((row, index) => rows[index].y - row.y).filter(gap => gap > bodySize * 1.05 && gap < bodySize * 1.6);
  const leading = [...advances].sort((a, b) => a - b)[Math.floor(advances.length * 0.25)] ?? bodySize * 1.2;
  const sectionGaps = headings.flatMap(row => row.index ? [rows[row.index - 1].y - row.y - (headingSize + bodySize) * leading / bodySize / 2] : []);
  const headingGaps = headings.flatMap(row => rows[row.index + 1] ? [row.y - rows[row.index + 1].y - (headingSize + bodySize) * leading / bodySize / 2 - 1] : []);
  const sidebarSections: TemplateSection[] = [];
  const leftHeadings = headings.filter(row => row.x < width * 0.25);
  const rightHeadings = headings.filter(row => row.x > width * 0.3);
  const columns = leftHeadings.length >= 2 && rightHeadings.length >= 2;
  if (columns) sidebarSections.push(...leftHeadings.map(row => row.section));
  const firstHeading = headings[0];
  const headerRows = rows.filter(row => top && row.y < top.y - top.size * 0.5 && (!firstHeading || row.y > firstHeading.y));
  const headerHasHeadline = headerRows.some(row => row.text && !/@|https?:|linkedin|github|\+?\d[\d ()-]{6,}/i.test(row.text));
  const geometry = {
    version: 1, paper: Math.abs(width / height - 612 / 792) < 0.025 ? "LETTER" : "A4",
    paddingX: bounded(left * scale, 12, 100),
    paddingY: bounded((height - Math.max(...marks.map(mark => mark.y + mark.size * 0.8))) * scale, 12, 100),
    fontSize: bounded(bodySize * scale, 8, 18), nameSize: bounded((top?.size ?? 25) * scale, 16, 48),
    headingSize: bounded(headingSize * scale, 9, 24),
    lineHeight: bounded(leading / bodySize, 1, 1.8),
    sectionGap: bounded(median(sectionGaps, 5) * scale, 2, 30), itemGap: bounded(bodySize * 0.3 * scale, 1, 16),
    headingGap: bounded(median(headingGaps, 4) * scale, 1, 12), headerGap: bounded(bodySize * 0.2 * scale, 0, 20),
    bulletIndent: bounded(bodySize * 2.4 * scale, 8, 32), headingWeight: 400,
    computerModern: /cmr|cmbx|cmti|cmcsc|lmr|latin.?modern/i.test(primaryFont),
    smallCapsName: /cmcsc|smallcaps/i.test(top?.font ?? ""), showHeadline: headerHasHeadline,
    sectionOrder: order, sidebarSections,
    technicalSkillsLabel: headings.some(row => row.section === "skills" && /^technical/i.test(row.text)),
    summaryBullet: (() => { const row = headings.find(row => row.section === "summary"); return row ? /^[•·*-]/.test(rows[row.index + 1]?.text.trim() ?? "") : false; })(),
  };
  return themeFieldsSchema.parse({
    ...THEME_STYLE_DEFAULTS,
    name: "Matched resume template", headFont: font, bodyFont: font, accent,
    templateGeometry: geometry,
    layout: columns ? "SPLIT" : "SINGLE", align: centered ? "CENTER" : "LEFT",
    headingStyle: rules ? "RULE" : "PLAIN",
    density: left / width < 0.065 ? "COMPACT" : "REGULAR",
  });
}

/** Reads PDF geometry locally. Never saves files, starts profile imports, or calls an AI. */
export async function readResumeTemplate(bytes: Uint8Array): Promise<ThemeFields> {
  if (bytes.length > TEMPLATE_MAX_BYTES) throw new TemplateReadError(TEMPLATE_LIMIT_MESSAGE);
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new TemplateReadError("Choose a PDF for template styling. Export Word templates as PDF first.");
  }
  const { getDocumentProxy, getResolvedPDFJS } = await import("unpdf");
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes, { fontExtraProperties: true });
    if (pdf.numPages > 10) throw new TemplateReadError("Choose a resume template with at most 10 pages.");
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const text = await page.getTextContent();
    const operators = await page.getOperatorList();
    const { OPS } = await getResolvedPDFJS();
    const marks: TextMark[] = [];
    for (const item of text.items) {
      if (marks.length >= 10_000) break;
      if (!("str" in item) || !item.str.trim()) continue;
      let font = text.styles[item.fontName]?.fontFamily ?? "";
      try {
        const metadata = page.commonObjs.get(item.fontName) as { name?: string };
        font = metadata?.name ?? font;
      } catch { /* Some PDFs don't expose font names; use their font family. */ }
      if (/awesome|symbol|dingbat/i.test(font)) continue;
      marks.push({ x: item.transform[4], y: item.transform[5], width: item.width,
        size: Math.abs(item.height), weight: item.str.length, font, text: item.str });
    }
    const colors = operators.fnArray.flatMap((op, index) =>
      op === OPS.setFillRGBColor || op === OPS.setStrokeRGBColor
        ? [operators.argsArray[index]?.[0]].filter((color): color is string => typeof color === "string") : []);
    return templateStyle({ width: viewport.width, height: viewport.height, marks, colors,
      rules: operators.fnArray.some(op => op === OPS.stroke || op === OPS.constructPath) });
  } catch (error) {
    if (error instanceof TemplateReadError) throw error;
    throw new TemplateReadError("That PDF couldn't be read. It may be damaged or password protected. Export it as a new PDF and try again.");
  } finally {
    await pdf?.cleanup?.();
  }
}
