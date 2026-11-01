import express, { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { adminCreateTimesheetSchema, adminIdSchema, adminTimesheetListSchema, adminWorkCalendarSchema, agentCreateSchema, agentListSchema, agentStatusSchema, agentUpdateSchema, auditListSchema, companyAdminListSchema, companyAdminUpdateSchema, confirmationRequestSchema, reviewSchema, sessionListSchema } from './admin.schemas.js';
import { ImportRepository } from '../imports/import.repository.js';
import { ImportService } from '../imports/import.service.js';
import { TimesheetRepository } from '../timesheets/timesheet.repository.js';
import { TimesheetService } from '../timesheets/timesheet.service.js';
import { updateTimesheetSchema, updateVisitSchema, visitSchema } from '../timesheets/timesheet.schemas.js';

const excelBody = express.raw({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'], limit: '5mb' });
const uploadName = (req) => {
  try { return decodeURIComponent(req.get('x-file-name') || 'timesheet-import.xlsx').slice(0, 255); } catch { return 'timesheet-import.xlsx'; }
};

export function createAdminRouter(options = {}) {
  const authRepository = new AuthRepository();
  const emailService = options.emailService || new EmailService(authRepository);
  const service = options.service || new AdminService(new AdminRepository(), emailService);
  const importService = options.importService || new ImportService(new ImportRepository());
  const timesheetService = options.timesheetService || new TimesheetService(new TimesheetRepository(), emailService);
  const auth = options.authenticate || authenticate;
  const adminVisitUpdateSchema = z.object({ body: updateVisitSchema.shape.body, params: z.object({ timesheetId: z.coerce.number().int().positive(), id: z.coerce.number().int().positive() }), query: z.object({}) });
  const adminVisitDeleteSchema = z.object({ body: z.object({}).strict().default({}), params: z.object({ timesheetId: z.coerce.number().int().positive(), id: z.coerce.number().int().positive() }), query: z.object({}) });
  const router = Router();
  router.use(auth, requireRole('ADMIN'));
  router.get('/dashboard', asyncHandler(async (_req, res) => res.json({ success: true, data: await service.dashboard(), message: 'Admin dashboard loaded' })));
  router.get('/imports/template.xlsx', asyncHandler(async (_req, res) => { const buffer = await importService.template(); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename="timesheet-import-template.xlsx"'); res.send(Buffer.from(buffer)); }));
  router.get('/imports', asyncHandler(async (_req, res) => res.json({ success: true, data: { imports: await importService.history() }, message: 'Import history loaded' })));
  router.post('/imports/preview', requireCsrf, excelBody, asyncHandler(async (req, res) => res.json({ success: true, data: await importService.preview(req.body), message: 'Import preview ready' })));
  router.post('/imports/commit', requireCsrf, excelBody, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await importService.commit(req.body, uploadName(req), req.user, { ip: req.ip }), message: 'Excel data imported' })));
  router.get('/timesheets', validate(adminTimesheetListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.listTimesheets(req.validated.query), message: 'Timesheets loaded' })));
  router.get('/work-calendar', validate(adminWorkCalendarSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.workCalendar(req.validated.query.month, req.validated.query.agentId), message: 'Work calendar loaded' })));
  router.get('/timesheets/:id', validate(adminIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.timesheet(req.validated.params.id) }, message: 'Timesheet loaded' })));
  router.post('/timesheets/:id/review', requireCsrf, validate(reviewSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.review(req.validated.params.id, req.user, req.validated.body, { ip: req.ip }) }, message: 'Review recorded' })));
  router.post('/agent-timesheets', requireCsrf, validate(adminCreateTimesheetSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: { timesheet: await timesheetService.startForAdmin(req.validated.body.agentId, req.validated.body.workDate) }, message: 'Agent timesheet ready' })));
  router.get('/agent-timesheets/:id', validate(adminIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await timesheetService.getForAdmin(req.validated.params.id) }, message: 'Agent timesheet loaded' })));
  router.put('/agent-timesheets/:id', requireCsrf, validate(updateTimesheetSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await timesheetService.updateSummaryForAdmin(req.validated.params.id, req.user.id, req.validated.body.dailySummary, { ip: req.ip }) }, message: 'Timesheet summary saved' })));
  router.post('/agent-timesheets/:id/visits', requireCsrf, validate(visitSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: { timesheet: await timesheetService.addVisitForAdmin(req.validated.params.id, req.user.id, req.validated.body, { ip: req.ip }) }, message: 'Visit added' })));
  router.put('/agent-timesheets/:timesheetId/visits/:id', requireCsrf, validate(adminVisitUpdateSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await timesheetService.updateVisitForAdmin(req.validated.params.id, req.validated.params.timesheetId, req.user.id, req.validated.body, { ip: req.ip }) }, message: 'Visit updated' })));
  router.delete('/agent-timesheets/:timesheetId/visits/:id', requireCsrf, validate(adminVisitDeleteSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await timesheetService.deleteVisitForAdmin(req.validated.params.id, req.validated.params.timesheetId, req.user.id, { ip: req.ip }) }, message: 'Visit removed' })));
  router.post('/agent-timesheets/:id/request-confirmation', requireCsrf, validate(confirmationRequestSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.requestConfirmation(req.validated.params.id, req.user, { ip: req.ip }), message: 'Confirmation email processed' })));
  router.get('/agents', validate(agentListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.agents(req.validated.query), message: 'Agents loaded' })));
  router.post('/agents', requireCsrf, validate(agentCreateSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: { agent: await service.createAgent(req.validated.body, req.user, { ip: req.ip }) }, message: 'Agent created' })));
  router.put('/agents/:id', requireCsrf, validate(agentUpdateSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { agent: await service.updateAgent(req.validated.params.id, req.validated.body, req.user, { ip: req.ip }) }, message: 'Agent updated' })));
  router.delete('/agents/:id', requireCsrf, validate(adminIdSchema), asyncHandler(async (req, res) => { await service.deleteAgent(req.validated.params.id, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Agent deleted' }); }));
  router.patch('/agents/:id/status', requireCsrf, validate(agentStatusSchema), asyncHandler(async (req, res) => { await service.setAgentStatus(req.validated.params.id, req.validated.body.status, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Agent status updated' }); }));
  router.get('/companies', validate(companyAdminListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.companies(req.validated.query), message: 'Companies loaded' })));
  router.patch('/companies/:id', requireCsrf, validate(companyAdminUpdateSchema), asyncHandler(async (req, res) => { await service.updateCompany(req.validated.params.id, req.validated.body, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Company updated' }); }));
  router.get('/audits', validate(auditListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.audits(req.validated.query), message: 'Audit log loaded' })));
  router.get('/sessions', validate(sessionListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.sessions(req.validated.query), message: 'User sessions loaded' })));
  return router;
}

export const adminRouter = createAdminRouter();
