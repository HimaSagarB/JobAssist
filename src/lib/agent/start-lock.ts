import "server-only";

// One application instance owns the queue. Serialize all entry points so the
// terminal launch, scheduler and Run now cannot create simultaneous scans.
const state = globalThis as typeof globalThis & { agentStartTail?: Promise<unknown> };
export function serializeAgentStart<T>(start: () => Promise<T>): Promise<T> {
  const pending = (state.agentStartTail ?? Promise.resolve()).then(start, start);
  state.agentStartTail = pending.then(() => undefined, () => undefined);
  return pending;
}
