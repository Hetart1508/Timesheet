import express, { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { adminIdSchema, adminTimesheetListSchema, adminWorkCalendarSchema, agentListSchema, agentStatusSchema, auditListSchema, companyAdminListSchema, companyAdminUpdateSchema, reviewSchema, sessionListSchema } from './admin.schemas.js';
import { ImportRepository } from '../imports/import.repository.js';
import { ImportService } from '../imports/import.service.js';
import { AgentImportRepository } from '../imports/agent-import.repository.js';
import { AgentImportService } from '../imports/agent-import.service.js';

const excelBody = express.raw({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'], limit: '5mb' });
const uploadName = (req) => {
  try { return decodeURIComponent(req.get('x-file-name') || 'timesheet-import.xlsx').slice(0, 255); } catch { return 'timesheet-import.xlsx'; }
};

export function createAdminRouter(options = {}) {
  const authRepository = new AuthRepository();
  const emailService = options.emailService || new EmailService(authRepository);
  const service = options.service || new AdminService(new AdminRepository(), emailService);
  const importService = options.importService || new ImportService(new ImportRepository());
  const agentImportService = options.agentImportService || new AgentImportService(new AgentImportRepository(), emailService);
  const auth = options.authenticate || authenticate;
  const router = Router();
  router.use(auth, requireRole('ADMIN'));
  router.get('/dashboard', asyncHandler(async (_req, res) => res.json({ success: true, data: await service.dashboard(), message: 'Admin dashboard loaded' })));
  router.get('/imports/agents/template.xlsx', asyncHandler(async (_req, res) => { const buffer = await agentImportService.template(); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename="agent-invitation-template.xlsx"'); res.send(Buffer.from(buffer)); }));
  router.get('/imports/agents/invitations', asyncHandler(async (_req, res) => res.json({ success: true, data: { invitations: await agentImportService.invitations() }, message: 'Agent invitations loaded' })));
  router.post('/imports/agents/preview', requireCsrf, excelBody, asyncHandler(async (req, res) => res.json({ success: true, data: await agentImportService.preview(req.body), message: 'Agent import preview ready' })));
  router.post('/imports/agents/commit', requireCsrf, excelBody, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await agentImportService.commit(req.body, uploadName(req), req.user, { ip: req.ip }), message: 'Agent invitations created' })));
  router.post('/imports/agents/invitations/:id/resend', requireCsrf, validate(adminIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await agentImportService.resend(req.validated.params.id), message: 'Agent invitation resent' })));
  router.get('/imports/template.xlsx', asyncHandler(async (_req, res) => { const buffer = await importService.template(); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename="timesheet-import-template.xlsx"'); res.send(Buffer.from(buffer)); }));
  router.get('/imports', asyncHandler(async (_req, res) => res.json({ success: true, data: { imports: await importService.history() }, message: 'Import history loaded' })));
  router.post('/imports/preview', requireCsrf, excelBody, asyncHandler(async (req, res) => res.json({ success: true, data: await importService.preview(req.body), message: 'Import preview ready' })));
  router.post('/imports/commit', requireCsrf, excelBody, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await importService.commit(req.body, uploadName(req), req.user, { ip: req.ip }), message: 'Excel data imported' })));
  router.get('/timesheets', validate(adminTimesheetListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.listTimesheets(req.validated.query), message: 'Timesheets loaded' })));
  router.get('/work-calendar', validate(adminWorkCalendarSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.workCalendar(req.validated.query.month, req.validated.query.agentId), message: 'Work calendar loaded' })));
  router.get('/timesheets/:id', validate(adminIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.timesheet(req.validated.params.id) }, message: 'Timesheet loaded' })));
  router.post('/timesheets/:id/review', requireCsrf, validate(reviewSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.review(req.validated.params.id, req.user, req.validated.body, { ip: req.ip }) }, message: 'Review recorded' })));
  router.get('/agents', validate(agentListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.agents(req.validated.query), message: 'Agents loaded' })));
  router.patch('/agents/:id/status', requireCsrf, validate(agentStatusSchema), asyncHandler(async (req, res) => { await service.setAgentStatus(req.validated.params.id, req.validated.body.status, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Agent status updated' }); }));
  router.get('/companies', validate(companyAdminListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.companies(req.validated.query), message: 'Companies loaded' })));
  router.patch('/companies/:id', requireCsrf, validate(companyAdminUpdateSchema), asyncHandler(async (req, res) => { await service.updateCompany(req.validated.params.id, req.validated.body, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Company updated' }); }));
  router.get('/audits', validate(auditListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.audits(req.validated.query), message: 'Audit log loaded' })));
  router.get('/sessions', validate(sessionListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.sessions(req.validated.query), message: 'User sessions loaded' })));
  return router;
}

export const adminRouter = createAdminRouter();
