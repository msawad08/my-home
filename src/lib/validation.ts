import { z } from 'zod';

export const DeviceCommandSchema = z.object({
  power: z.boolean().optional(),
  temperature: z.number().int().min(16).max(30).optional(),
  mode: z.string().optional(),
  fanSpeed: z.string().optional(),
});

export type DeviceCommand = z.infer<typeof DeviceCommandSchema>;
