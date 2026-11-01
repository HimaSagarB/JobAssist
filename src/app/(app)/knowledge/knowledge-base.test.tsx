import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoProfile } from "@/lib/demo-profile";
import { toast } from "@/components/toast";
import { removeSkill } from "../profile/actions";
import { KnowledgeBase } from "./knowledge-base";

vi.mock("../profile/actions", () => ({ removeSkill: vi.fn(), removeLanguage: vi.fn(), removeExperience: vi.fn(), removeProject: vi.fn(), removeEducation: vi.fn(), removePublication: vi.fn(), removeReference: vi.fn() }));
vi.mock("@/lib/fact-actions", () => ({ removeFact: vi.fn() }));
vi.mock("@/components/toast", () => ({ toast: vi.fn() }));
const profile = () => ({ ...demoProfile(), skills: [{ id: "test-skill", name: "KnowledgeTestSkill" }] });
beforeEach(() => vi.clearAllMocks());

describe("KnowledgeBase", () => {
  it("shows saved details and supports searching and category filtering", async () => {
    const user = userEvent.setup();
    render(<KnowledgeBase initial={profile()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Knowledge base" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import resume content" })).toHaveAttribute("href", "/profile/import");
    await user.type(screen.getByLabelText("Search your knowledge"), "KnowledgeTestSkill");
    expect(screen.getByRole("article", { name: "KnowledgeTestSkill" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^1 of/);
    await user.selectOptions(screen.getByLabelText("Category"), "education");
    expect(screen.getByText("No saved information matches your search.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("article", { name: "KnowledgeTestSkill" })).toBeInTheDocument();
  });
  it("requires confirmation before removing a skill and updates the overview after success", async () => {
    vi.mocked(removeSkill).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<KnowledgeBase initial={profile()} />);
    await user.click(screen.getByRole("button", { name: "Remove KnowledgeTestSkill" }));
    expect(removeSkill).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(removeSkill).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Remove KnowledgeTestSkill" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Written descriptions are not rewritten");
    await user.click(within(dialog).getByRole("button", { name: "Remove saved item" }));
    expect(removeSkill).toHaveBeenCalledWith({ id: "test-skill" });
    expect(screen.queryByRole("article", { name: "KnowledgeTestSkill" })).not.toBeInTheDocument();
  });
  it("retains the item when a server removal fails", async () => {
    vi.mocked(removeSkill).mockResolvedValue({ ok: false, error: "Please sign in again." });
    const user = userEvent.setup();
    render(<KnowledgeBase initial={profile()} />);
    await user.click(screen.getByRole("button", { name: "Remove KnowledgeTestSkill" }));
    await user.click(screen.getByRole("button", { name: "Remove saved item" }));
    expect(screen.getByRole("article", { name: "KnowledgeTestSkill" })).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Please sign in again.");
  });
  it("shows a useful empty state", () => {
    const initial = profile();
    for (const key of Object.keys(initial.basics)) Object.assign(initial.basics, { [key]: key === "showAge" ? false : "" });
    render(<KnowledgeBase initial={{ ...initial, skills: [], languages: [], experience: [], projects: [], education: [], publications: [], references: [], facts: [], photo: null }} />);
    expect(screen.getByText("Your knowledge base is empty")).toBeInTheDocument();
  });
});
