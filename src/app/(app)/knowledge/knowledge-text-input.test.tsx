import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { KnowledgeTextInput } from "./knowledge-text-input";
import { extractKnowledgeText } from "./actions";
vi.mock("./actions", () => ({ extractKnowledgeText: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function Harness({ onExtracted = vi.fn() }: { onExtracted?: (id: string) => void }) { const [value, setValue] = useState(""); return <KnowledgeTextInput value={value} onChange={setValue} onExtracted={onExtracted} />; }
it("accepts one free-form text area and starts a reviewed extraction", async () => {
  vi.mocked(extractKnowledgeText).mockResolvedValue({ ok: true, data: { jobId: "text-job" } });
  const onExtracted = vi.fn(); const user = userEvent.setup(); render(<Harness onExtracted={onExtracted} />);
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Extract knowledge" })).toBeDisabled();
  const text = "I built a Python Wi-Fi testing toolkit and automated reports.";
  await user.type(screen.getByLabelText("What would you like to add?"), text);
  await user.click(screen.getByRole("button", { name: "Extract knowledge" }));
  expect(extractKnowledgeText).toHaveBeenCalledWith({ text }); expect(onExtracted).toHaveBeenCalledWith("text-job");
});
it("keeps the text when extraction cannot start", async () => {
  vi.mocked(extractKnowledgeText).mockResolvedValue({ ok: false, error: "Choose an AI connection first." });
  const user = userEvent.setup(); render(<Harness />);
  await user.type(screen.getByLabelText("What would you like to add?"), "Learned Python");
  await user.click(screen.getByRole("button", { name: "Extract knowledge" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Choose an AI connection first.");
  expect(screen.getByRole("textbox")).toHaveValue("Learned Python");
});
