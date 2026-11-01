import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { demoProfile } from "@/lib/demo-profile";
import { AddKnowledge } from "./add-knowledge";
import { addKnowledgeInformation, addKnowledgeProject, addKnowledgeSkills } from "./actions";
vi.mock("./actions", () => ({ addKnowledgeProject: vi.fn(), addKnowledgeSkills: vi.fn(), addKnowledgeInformation: vi.fn() }));
vi.mock("@/components/toast", () => ({ toast: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it("saves a described project and explicitly supplied technologies", async () => {
  const profile = demoProfile(); vi.mocked(addKnowledgeProject).mockResolvedValue({ ok: true, data: profile });
  const user = userEvent.setup(); const onSaved = vi.fn();
  render(<AddKnowledge mode="project" onSaved={onSaved} onCancel={vi.fn()} />);
  await user.type(screen.getByLabelText("Project name"), "Network testing toolkit");
  await user.type(screen.getByLabelText("Project description"), "Built Python scripts to validate Wi-Fi roaming.");
  await user.type(screen.getByLabelText("Technologies you used (optional)"), "Python, Wi-Fi testing");
  await user.click(screen.getByRole("button", { name: "Save to knowledge base" }));
  expect(addKnowledgeProject).toHaveBeenCalledWith({ name: "Network testing toolkit", description: "Built Python scripts to validate Wi-Fi roaming.", link: "", skills: ["Python", "Wi-Fi testing"] });
  expect(onSaved).toHaveBeenCalledWith(profile);
});
it("saves manually supplied information", async () => {
  vi.mocked(addKnowledgeInformation).mockResolvedValue({ ok: true, data: demoProfile() });
  const user = userEvent.setup(); render(<AddKnowledge mode="information" onSaved={vi.fn()} onCancel={vi.fn()} />);
  await user.type(screen.getByLabelText("New information about you"), "Available for remote roles.");
  await user.click(screen.getByRole("button", { name: "Save to knowledge base" }));
  expect(addKnowledgeInformation).toHaveBeenCalledWith({ text: "Available for remote roles." });
});
it("retains input and displays errors when saving skills fails", async () => {
  vi.mocked(addKnowledgeSkills).mockResolvedValue({ ok: false, error: "Please sign in again." });
  const user = userEvent.setup(); const onSaved = vi.fn(); render(<AddKnowledge mode="skills" onSaved={onSaved} onCancel={vi.fn()} />);
  await user.type(screen.getByLabelText("Skills to add"), "Python");
  await user.click(screen.getByRole("button", { name: "Save to knowledge base" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in again."); expect(onSaved).not.toHaveBeenCalled();
});
