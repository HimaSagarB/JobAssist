import { prisma } from '@/lib/prisma';
import { loadAiConfig } from '@/lib/ai/config';
import { connectionsSchema } from '@/lib/ai/connections';
import { ConnectionsScreen } from './screen';
export const metadata = { title: 'AI connections' };
export default async function ConnectionsPage() {
  const row = await prisma.setting.findUnique({ where: { key: 'aiConnections' } });
  const connections = connectionsSchema.parse(row ? JSON.parse(row.value) : []);
  const active = await loadAiConfig();
  return <ConnectionsScreen connections={connections.map(({ apiKeyEnc, ...item }) => ({ ...item, hasKey: Boolean(apiKeyEnc) }))} active={`${active.provider} · ${active.model || 'No model selected'} · ${active.baseUrl}`} />;
}
