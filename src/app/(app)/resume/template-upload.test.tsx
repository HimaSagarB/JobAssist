import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { themeFile } from "@/lib/theme-file";
import { BUILT_IN_THEMES } from "@/lib/themes";
import { TemplateUpload } from "./template-upload";

afterEach(() => vi.unstubAllGlobals());
describe("template upload", () => {
  it("previews style only and leaves saving to the user", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const theme = themeFile(BUILT_IN_THEMES[1]).theme;
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ theme }) });
    vi.stubGlobal("fetch", fetch);
    render(<TemplateUpload onPreview={onPreview} />);
    expect(screen.getByText(/Save theme adds a new theme/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Preview template style" });
    expect(button).toBeDisabled();
    const file = new File(["%PDF-test"], "private-resume.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/Resume template PDF/), file);
    await user.click(button);
    expect(fetch).toHaveBeenCalledWith("/api/resume/template", expect.objectContaining({ method: "POST", body: file }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(theme);
  });
  it("shows an upload error without applying a style", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Choose a readable PDF." }) }));
    const onPreview = vi.fn();
    const user = userEvent.setup();
    render(<TemplateUpload onPreview={onPreview} />);
    await user.upload(screen.getByLabelText(/Resume template PDF/), new File(["%PDF"], "bad.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Preview template style" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a readable PDF.");
    expect(onPreview).not.toHaveBeenCalled();
  });
});
