import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const id = z.coerce.number().int().positive();
const envelope = (query) => z.object({ body: z.object({}).strict().default({}), params: z.object({}), query });
export const analyticsSchema = envelope(z.object({ startDate: date.optional(), endDate: date.optional() }));
export const invoiceSchema = z.object({
  body: z.object({}).strict().default({}),
  params: z.object({ agentId: id }),
  query: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM') }),
});
export const exportSchema = envelope(z.object({
  agentId: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
  startDate: date.optional(), endDate: date.optional(),
}));
