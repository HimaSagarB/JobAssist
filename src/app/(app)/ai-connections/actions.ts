'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { action, ActionError } from '@/lib/action';
import { connectionInput, connectionsSchema } from '@/lib/ai/connections';
import { encryptApiKey, decryptApiKey } from '@/lib/ai/api-key';
import { prisma } from '@/lib/prisma';
import { saveSettings } from '@/lib/settings-data';

export const addConnection = action(connectionInput, async (input) => {
  const { apiKey, ...fields } = input;
  await prisma.$transaction(async tx => {
    // Serialize updates to this vault, including the first insert.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742831)`;
    const row = await tx.setting.findUnique({ where: { key: 'aiConnections' } });
    const connections = connectionsSchema.parse(row ? JSON.parse(row.value) : []);
    if (connections.length >= 30) throw new ActionError('Remove a connection before adding another.');
    connections.push({ ...fields, id: randomUUID(), apiKeyEnc: apiKey ? encryptApiKey(apiKey) : null });
    const value = JSON.stringify(connections);
    await tx.setting.upsert({ where: { key: 'aiConnections' }, create: { key: 'aiConnections', value }, update: { value } });
  });
  revalidatePath('/ai-connections');
  return { saved: true };
});
export const activateConnection = action(z.object({ id: z.string().uuid() }), async ({ id }) => {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742831)`;
    const row = await tx.setting.findUnique({ where: { key: 'aiConnections' } });
    const found = connectionsSchema.parse(row ? JSON.parse(row.value) : []).find(item => item.id === id);
    if (!found) throw new ActionError('That connection no longer exists.');
    if (found.apiKeyEnc) decryptApiKey(found.apiKeyEnc);
    await saveSettings({ provider: found.provider, baseUrl: found.baseUrl, model: found.model, apiKeyEnc: found.apiKeyEnc }, tx);
  });
  revalidatePath('/ai-connections');
  revalidatePath('/settings');
  return { activated: true };
});
export const removeConnection = action(z.object({ id: z.string().uuid() }), async ({ id }) => {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742831)`;
    const row = await tx.setting.findUnique({ where: { key: 'aiConnections' } });
    if (!row) return;
    const items = connectionsSchema.parse(JSON.parse(row.value)).filter(item => item.id !== id);
    await tx.setting.update({ where: { key: 'aiConnections' }, data: { value: JSON.stringify(items) } });
  });
  revalidatePath('/ai-connections');
  return { removed: true };
});
