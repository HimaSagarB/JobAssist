import { describe, expect, it, vi } from "vitest";
import { readResumeTemplate, templateStyle, TEMPLATE_MAX_BYTES } from "./resume-template";

vi.mock("unpdf", () => ({ getDocumentProxy: vi.fn(), getResolvedPDFJS: vi.fn() }));

const mark = { x: 30, y: 600, width: 400, size: 10, weight: 200, font: "Subset+CMR10" };
const evidence = { width: 600, height: 800, marks: [mark, { ...mark, x: 200, y: 760, width: 200, size: 25, weight: 12 }], colors: ["#000000", "#ffffff", "#c43119", "#c43119"], rules: true };

describe("resume template styling", () => {
  it("matches a centered serif PDF with red rules without returning resume content", () => {
    const style = templateStyle(evidence);
    expect(style).toMatchObject({ headFont: "GARAMOND", bodyFont: "GARAMOND", accent: "#c43119", align: "CENTER", density: "COMPACT", headingStyle: "RULE", layout: "SINGLE" });
    expect(Object.keys(style)).not.toEqual(expect.arrayContaining(["text", "skills", "experience", "profile", "fileName"]));
  });
  it("uses restrained defaults for plain sans-serif layouts and rejects scans", () => {
    expect(templateStyle({ ...evidence, marks: [{ ...mark, x: 80, font: "sans-serif" }], colors: ["#999999"], rules: false })).toMatchObject({ bodyFont: "GEIST", accent: "#1d1c1a", align: "LEFT", density: "REGULAR", headingStyle: "PLAIN" });
    expect(() => templateStyle({ ...evidence, marks: [] })).toThrow("no readable text");
  });
  it("rejects oversized and non-PDF content before parsing", async () => {
    await expect(readResumeTemplate(new Uint8Array(TEMPLATE_MAX_BYTES + 1))).rejects.toThrow("5 MB");
    await expect(readResumeTemplate(new TextEncoder().encode("a resume is not a PDF"))).rejects.toThrow("Choose a PDF");
  });
  it("extracts formatting while excluding symbol fonts and releasing PDF resources", async () => {
    const { getDocumentProxy, getResolvedPDFJS } = await import("unpdf");
    const cleanup = vi.fn();
    vi.mocked(getDocumentProxy).mockResolvedValue({ numPages: 1, cleanup, getPage: async () => ({
      getViewport: () => ({ width: 600, height: 800 }),
      getTextContent: async () => ({ styles: { serif: { fontFamily: "serif" } }, items: [{ str: "PRIVATE PERSON", fontName: "serif", transform: [1, 0, 0, 1, 200, 760], width: 200, height: 25 }, { str: "icon", fontName: "symbol", transform: [], width: 1, height: 10 }] }),
      getOperatorList: async () => ({ fnArray: [1, 2], argsArray: [["#c43119"], []] }),
      commonObjs: { get: (name: string) => ({ name: name === "symbol" ? "FontAwesome" : "CMR10" }) },
    }) } as never);
    vi.mocked(getResolvedPDFJS).mockResolvedValue({ OPS: { setFillRGBColor: 1, setStrokeRGBColor: 3, stroke: 2, constructPath: 4 } } as never);
    const style = await readResumeTemplate(new TextEncoder().encode("%PDF-test"));
    expect(style).toMatchObject({ bodyFont: "GARAMOND", align: "CENTER", accent: "#c43119" });
    expect(JSON.stringify(style)).not.toContain("PRIVATE PERSON");
    expect(cleanup).toHaveBeenCalled();
  });
  it("gives readable errors for damaged and excessively long PDFs", async () => {
    const { getDocumentProxy } = await import("unpdf");
    vi.mocked(getDocumentProxy).mockRejectedValueOnce(new Error("sensitive parser details"));
    await expect(readResumeTemplate(new TextEncoder().encode("%PDF-test"))).rejects.toThrow("couldn't be read");
    const cleanup = vi.fn();
    vi.mocked(getDocumentProxy).mockResolvedValueOnce({ numPages: 11, cleanup } as never);
    await expect(readResumeTemplate(new TextEncoder().encode("%PDF-test"))).rejects.toThrow("at most 10 pages");
    expect(cleanup).toHaveBeenCalled();
  });
});
