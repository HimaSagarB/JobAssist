import { describe, expect, it } from "vitest";
import { readTemplateGeometry, sectionFromHeading } from "./template-geometry";
import { templateStyle } from "./resume-template";
import { themeFile, parseThemeFile } from "./theme-file";
import { BUILT_IN_THEMES, printCss, resolveTheme } from "./themes";

const style = () => templateStyle({ width: 612, height: 792, rules: true, colors: ["#c43119"], marks: [
  { x: 210, y: 752, width: 192, size: 25, weight: 12, font: "Subset+CMCSC10", text: "PRIVATE NAME" },
  { x: 150, y: 736, width: 312, size: 10, weight: 25, font: "CMR10", text: "private@example.test" },
  { x: 29, y: 720, width: 80, size: 12, weight: 7, font: "CMR10", text: "Profile" },
  { x: 29, y: 704, width: 550, size: 10, weight: 200, font: "CMR10", text: "PRIVATE PROFILE CONTENT" },
  { x: 29, y: 692, width: 550, size: 10, weight: 100, font: "CMR10", text: "MORE PRIVATE CONTENT" },
  { x: 29, y: 674, width: 80, size: 12, weight: 9, font: "CMR10", text: "Education" },
  { x: 29, y: 650, width: 80, size: 12, weight: 8, font: "CMR10", text: "Projects" },
  { x: 29, y: 625, width: 100, size: 12, weight: 16, font: "CMR10", text: "Technical Skills" },
] });

describe("measured PDF geometry", () => {
  it("preserves dimensions and recognized ordering without retaining personal text", () => {
    const fields = style();
    expect(fields.templateGeometry).toMatchObject({ paper: "LETTER", computerModern: true, smallCapsName: true, showHeadline: false, sectionOrder: ["summary", "education", "projects", "skills"], technicalSkillsLabel: true });
    expect(fields.templateGeometry?.fontSize).toBeCloseTo(10.46, 1);
    expect(fields.templateGeometry?.paddingX).toBeCloseTo(30.33, 1);
    expect(JSON.stringify(fields)).not.toMatch(/PRIVATE|example\.test/);
  });
  it("keeps headings in separate columns when their baselines align", () => {
    const marks = [
      { x: 30, y: 700, text: "Skills" }, { x: 240, y: 700, text: "Experience" },
      { x: 30, y: 500, text: "Languages" }, { x: 240, y: 500, text: "Education" },
    ].map(mark => ({ ...mark, width: 70, size: 12, weight: 10, font: "Arial" }));
    const fields = templateStyle({ width: 612, height: 792, marks, colors: [], rules: false });
    expect(fields.layout).toBe("SPLIT");
    expect(fields.templateGeometry?.sidebarSections).toEqual(["skills", "languages"]);
    expect(fields.templateGeometry?.sectionOrder).toContain("experience");
  });
  it("exports, restores and renders geometry with matching print margins", () => {
    const theme = { ...BUILT_IN_THEMES[0], ...style() };
    const file = themeFile(theme);
    const restored = parseThemeFile(JSON.parse(JSON.stringify(file)));
    expect(restored).toMatchObject({ ok: true, theme: { templateGeometry: theme.templateGeometry } });
    const resolved = resolveTheme(theme);
    expect(resolved.bodyFamily).toContain("--typeface-computer-modern");
    expect(resolved.density.fontSize).toBe(readTemplateGeometry(theme.templateGeometry)?.fontSize);
    expect(printCss(theme, "A4")).toContain("size: 215.9mm 279.4mm");
  });
  it("refuses invalid geometry and recognizes only structural headings", () => {
    expect(readTemplateGeometry({ ...style().templateGeometry, fontSize: -100 })).toBeUndefined();
    expect(readTemplateGeometry({ ...style().templateGeometry, sectionOrder: ["PRIVATE NAME"] })).toBeUndefined();
    expect(sectionFromHeading("Leadership & Extracurricular Activities")).toBe("leadership");
    expect(sectionFromHeading("PRIVATE NAME")).toBeUndefined();
  });
});
