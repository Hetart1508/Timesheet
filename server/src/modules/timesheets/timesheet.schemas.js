import { z } from 'zod';

const envelope = ({ body = z.object({}).strict().default({}), params = z.object({}), query = z.object({}) }) => z.object({ body, params, query });
const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const createTimesheetSchema = envelope({ body: z.object({ workDate: date.optional() }).strict() });
export const timesheetIdSchema = envelope({ params: z.object({ id }) });
export const visitIdSchema = envelope({ params: z.object({ id }) });
export const updateTimesheetSchema = envelope({
  params: z.object({ id }),
  body: z.object({ dailySummary: z.string().trim().max(4000) }).strict(),
});
export const visitSchema = envelope({
  params: z.object({ id }),
  body: z.object({
    companyId: id,
    category: z.enum(['Gold', 'Silver', 'Bronze']),
    mdr: z.enum(['Level 1', 'Level 2', 'Level 3']).default('Level 1'),
    contactPerson: z.string().trim().min(2).max(120),
    purpose: z.string().trim().max(500).optional().default(''),
    visitNotes: z.string().trim().min(2).max(5000),
    checkInTime: time.optional(),
    checkOutTime: time.optional(),
  }).strict(),
});
export const updateVisitSchema = envelope({
  params: z.object({ id }),
  body: visitSchema.shape.body,
});
export const historySchema = envelope({
  query: z.object({
    startDate: date.optional(), endDate: date.optional(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
    search: z.string().trim().max(100).default(''),
    sortBy: z.enum(['workDate', 'visitCount', 'duration', 'status']).default('workDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

export const companyListSchema = envelope({
  query: z.object({ search: z.string().trim().max(100).default(''), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10) }),
});
export const createCompanySchema = envelope({
  body: z.object({
    companyName: z.string().trim().min(2).max(180), address: z.string().trim().min(3).max(500),
    contactPerson: z.string().trim().max(120).optional().default(''), contactPhone: z.string().trim().max(30).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),
  }).strict(),
});
export const updateCompanySchema = envelope({
  params: z.object({ id }),
  body: createCompanySchema.shape.body,
});
