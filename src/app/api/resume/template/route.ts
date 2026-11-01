import { NextResponse } from "next/server";

import { route } from "@/lib/route";
import { readResumeTemplate, TEMPLATE_MAX_BYTES, TEMPLATE_LIMIT_MESSAGE, TEMPLATE_NOTICE, TemplateReadError } from "@/lib/resume-template";

export const runtime = "nodejs";

/** Style-only upload: session/origin protected, bounded, with no database or profile writes. */
export const POST = route(async request => {
  if (Number(request.headers.get("content-length") ?? 0) > TEMPLATE_MAX_BYTES) {
    return NextResponse.json({ error: TEMPLATE_LIMIT_MESSAGE }, { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Choose a PDF template first." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > TEMPLATE_MAX_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: TEMPLATE_LIMIT_MESSAGE }, { status: 413 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    return NextResponse.json({ theme: await readResumeTemplate(bytes), notice: TEMPLATE_NOTICE });
  } catch (error) {
    if (!(error instanceof TemplateReadError)) throw error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
