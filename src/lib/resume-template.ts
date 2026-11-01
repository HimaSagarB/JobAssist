import "server-only";

import { themeFieldsSchema, type ThemeFields } from "./theme-file";
import { THEME_STYLE_DEFAULTS } from "./themes";

export const TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;
export const TEMPLATE_LIMIT_MESSAGE = "Choose a PDF template smaller than 5 MB.";
export const TEMPLATE_NOTICE = "This recreates supported styling from the first PDF page. Fonts are matched to bundled alternatives; section order, exact spacing, icons and custom sections are not copied. Review the preview before saving.";

export class TemplateReadError extends Error {}

type TextMark = { x: number; y: number; width: number; size: number; weight: number; font: string };
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
  return themeFieldsSchema.parse({
    ...THEME_STYLE_DEFAULTS,
    name: "My uploaded template", headFont: font, bodyFont: font, accent,
    layout: "SINGLE", align: centered ? "CENTER" : "LEFT",
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
        size: Math.abs(item.height), weight: item.str.length, font });
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
