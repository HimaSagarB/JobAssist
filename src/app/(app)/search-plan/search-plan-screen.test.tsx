import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { EMPTY_SEARCH_PLAN } from "@/lib/search-plan";
import { SearchPlanScreen } from "./search-plan-screen";
const save = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ saveSearchPlan: save }));
vi.mock("@/components/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
beforeEach(() => save.mockReset());
it("saves edits and reports success only after persistence", async () => {
  save.mockResolvedValue({ ok: true, data: { saved: true } });
  render(<SearchPlanScreen initial={EMPTY_SEARCH_PLAN} />);
  fireEvent.change(screen.getByLabelText("Target role titles"), { target: { value: "Backend developer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save search plan" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ ...EMPTY_SEARCH_PLAN, roles: "Backend developer" }));
  expect(await screen.findByText(/Search plan saved/)).toBeInTheDocument();
});
it("shows a save failure and can preview mismatches without saving", async () => {
  save.mockResolvedValue({ ok: false, error: "Please sign in again." });
  render(<SearchPlanScreen initial={{ ...EMPTY_SEARCH_PLAN, roles: "Backend developer" }} />);
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Designer" } });
  expect(screen.getByText("Filtered out")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save search plan" }));
  expect(await screen.findByText("Please sign in again.")).toBeInTheDocument();
});
