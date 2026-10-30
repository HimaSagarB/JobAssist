'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AiProvider } from '@/generated/prisma/enums';
import type { ConnectionView } from '@/lib/ai/connections';
import { PROVIDER_OPTIONS } from '@/lib/ai/provider-options';
import { PageHeader } from '@/components/page-header';
import { addConnection, activateConnection, removeConnection } from './actions';
const presets = [
  ['OpenAI', 'https://api.openai.com/v1'],
  ['Google Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/'],
  ['Groq', 'https://api.groq.com/openai/v1'],
  ['DeepSeek', 'https://api.deepseek.com'],
] as const;
const field = 'w-full rounded-control border border-line-card bg-surface p-3 text-sm';
export function ConnectionsScreen({ connections, active }: { connections: ConnectionView[]; active: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', provider: AiProvider.OPENAI as AiProvider, baseUrl: '', model: '', apiKey: '' });
  function run(task: () => Promise<{ ok: boolean; error?: string }>, success: string, clear = false) {
    start(async () => { try { const result = await task(); setNotice(result.ok ? success : result.error || 'Could not save.'); if (result.ok) { if(clear) setForm(current => ({ ...current, apiKey: '', name: '' })); router.refresh(); } } catch { setNotice('Connection could not be saved. Please try again.'); } });
  }
  return <><PageHeader title="AI connections" description="Keep multiple accounts ready and choose one connection for new AI tasks." />
    <div className="grid gap-8 px-5 pb-10 md:px-10 lg:grid-cols-2">
      <section className="space-y-4"><h2 className="font-serif text-xl">Active connection</h2><p className="break-words text-sm">{active}</p><p className="text-sm text-muted">Existing tasks can finish with their previous connection. Each provider has its own quota and billing. Switching is manual.</p><Link href="/settings?section=ai" className="underline">Test the active connection and list models →</Link>
      <h2 className="pt-4 font-serif text-xl">Saved connections</h2>{!connections.length && <p>No connections saved yet.</p>}
      {connections.map(item => <article key={item.id} className="space-y-2 rounded-panel border border-line-card p-4"><h3 className="font-semibold">{item.name}</h3><p className="break-words text-sm">{item.model} · {item.baseUrl}</p><p className="text-sm text-muted">{item.hasKey ? 'API key stored encrypted' : 'No saved API key'}</p><div className="flex gap-4"><button disabled={pending} onClick={() => run(() => activateConnection({ id: item.id }), `${item.name} is active for new tasks.`)}>Use this connection</button><button disabled={pending} onClick={() => run(() => removeConnection({ id: item.id }), 'Saved connection removed. Active settings are unchanged.')}>Remove saved copy</button></div></article>)}
      </section>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); run(() => addConnection(form), 'Connection saved. Select Use this connection to activate it.', true); }}>
        <h2 className="font-serif text-xl">Add a connection</h2><p className="text-sm text-muted">Use a separate name for each account or endpoint. For another vendor, select OpenAI-compatible if that vendor supports it and enter its documented API address and model.</p>
        <div className="flex flex-wrap gap-2">{presets.map(([name, baseUrl]) => <button type="button" key={name} className="rounded-control border border-line-card px-3 py-2 text-sm" onClick={() => setForm({ name, provider: AiProvider.OPENAI, baseUrl, model: "", apiKey: "" })}>{name}</button>)}</div><p className="text-sm text-muted">Choose a shortcut or enter a custom endpoint. Model support varies; test the active connection before generating documents.</p>
        <label className="block">Name<input className={field} required maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block">API format<select className={field} value={form.provider} onChange={e => { const option = PROVIDER_OPTIONS.find(item => item.value === e.target.value)!; setForm({ ...form, provider: option.value, baseUrl: option.defaultUrl, model: option.defaultModel, apiKey: '' }); }}>{PROVIDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.name}</option>)}</select></label>
        <label className="block">API base URL<input className={field} type="url" required value={form.baseUrl} placeholder="https://api.openai.com/v1" onChange={e => setForm({ ...form, baseUrl: e.target.value })} /></label>
        <label className="block">Model ID<input className={field} required maxLength={200} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></label>
        <label className="block">API key<input className={field} type="password" autoComplete="new-password" maxLength={1000} value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} /></label>
        <button disabled={pending} className="rounded-control bg-primary px-5 py-3 text-on-primary">{pending ? 'Saving…' : 'Save connection'}</button>
      </form><p role="status">{notice}</p>
    </div></>;
}
