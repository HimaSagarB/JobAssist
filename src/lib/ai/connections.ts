import { z } from 'zod';
import { AiProvider } from '@/generated/prisma/enums';

export const connectionInput = z.object({
  name: z.string().trim().min(1).max(80),
  provider: z.enum(AiProvider),
  baseUrl: z.string().url().max(500).refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an HTTP or HTTPS address.'),
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().max(1000),
});
export const storedConnection = connectionInput.omit({ apiKey: true }).extend({ id: z.string().uuid(), apiKeyEnc: z.string().nullable() });
export const connectionsSchema = z.array(storedConnection).max(30);
export type ConnectionView = Omit<z.infer<typeof storedConnection>, 'apiKeyEnc'> & { hasKey: boolean };
