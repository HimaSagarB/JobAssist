import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readResumeTemplate, TEMPLATE_MAX_BYTES, TemplateReadError } from "@/lib/resume-template";
import { POST } from "./route";

vi.mock("@/lib/route", () => ({ route: (handler: unknown) => handler }));
vi.mock("@/lib/resume-template", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/resume-template")>(), readResumeTemplate: vi.fn() }));
const request = (body: string, headers: Record<string, string> = {}) => new NextRequest("http://localhost:3000/api/resume/template", { method: "POST", body, headers });

beforeEach(() => vi.clearAllMocks());
describe("style-only template upload route", () => {
  it("returns only the extracted style and approximation notice", async () => {
    vi.mocked(readResumeTemplate).mockResolvedValue({ name: "My uploaded template" } as never);
    const response = await POST(request("%PDF-template"), undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: { name: "My uploaded template" }, notice: expect.stringContaining("first-page") });
    expect(response.headers.get("cache-control")).toBeNull(); // The shared route wrapper adds private, no-store in production.
  });
  it("rejects declared and actual oversized bodies before parsing", async () => {
    expect((await POST(request("small", { "content-length": String(TEMPLATE_MAX_BYTES + 1) }), undefined)).status).toBe(413);
    expect((await POST(request("x".repeat(TEMPLATE_MAX_BYTES + 1)), undefined)).status).toBe(413);
    expect(readResumeTemplate).not.toHaveBeenCalled();
  });
  it("returns actionable PDF errors instead of success", async () => {
    vi.mocked(readResumeTemplate).mockRejectedValue(new TemplateReadError("Choose a readable PDF."));
    const response = await POST(request("%PDF-broken"), undefined);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Choose a readable PDF." });
  });
});
