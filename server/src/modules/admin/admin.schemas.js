import { z } from 'zod';

const envelope = ({ body = z.object({}).strict().default({}), params = z.object({}), query = z.object({}) }) => z.object({ body, params, query });
const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const paging = { page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) };

export const adminTimesheetListSchema = envelope({ query: z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
  agentId: id.optional(), startDate: date.optional(), endDate: date.optional(), ...paging,
}) });
export const adminIdSchema = envelope({ params: z.object({ id }) });
export const reviewSchema = envelope({ params: z.object({ id }), body: z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().trim().max(4000).default(''),
}).superRefine((value, context) => {
  if (value.decision !== 'APPROVED' && value.comment.length < 5) context.addIssue({ code: 'custom', path: ['comment'], message: 'Enter at least 5 characters explaining the decision' });
}) });
export const agentListSchema = envelope({ query: z.object({ search: z.string().trim().max(100).default(''), status: z.enum(['ACTIVE', 'INACTIVE']).optional(), ...paging }) });
export const agentStatusSchema = envelope({ params: z.object({ id }), body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict() });
export const companyAdminListSchema = envelope({ query: z.object({ search: z.string().trim().max(100).default(''), reviewStatus: z.enum(['APPROVED', 'PENDING']).optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional(), ...paging }) });
export const companyAdminUpdateSchema = envelope({ params: z.object({ id }), body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']).optional(), reviewStatus: z.enum(['APPROVED', 'PENDING']).optional() }).refine((value) => value.status || value.reviewStatus, 'Provide a status to update') });
export const auditListSchema = envelope({ query: z.object({ action: z.string().trim().max(100).default(''), entityType: z.string().trim().max(80).default(''), ...paging }) });
