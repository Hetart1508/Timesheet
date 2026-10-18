import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { adminIdSchema, adminTimesheetListSchema, adminWorkCalendarSchema, agentListSchema, agentStatusSchema, auditListSchema, companyAdminListSchema, companyAdminUpdateSchema, reviewSchema } from './admin.schemas.js';

export function createAdminRouter(options = {}) {
  const service = options.service || new AdminService(new AdminRepository(), new EmailService(new AuthRepository()));
  const auth = options.authenticate || authenticate;
  const router = Router();
  router.use(auth, requireRole('ADMIN'));
  router.get('/dashboard', asyncHandler(async (_req, res) => res.json({ success: true, data: await service.dashboard(), message: 'Admin dashboard loaded' })));
  router.get('/timesheets', validate(adminTimesheetListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.listTimesheets(req.validated.query), message: 'Timesheets loaded' })));
  router.get('/work-calendar', validate(adminWorkCalendarSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.workCalendar(req.validated.query.month), message: 'Work calendar loaded' })));
  router.get('/timesheets/:id', validate(adminIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.timesheet(req.validated.params.id) }, message: 'Timesheet loaded' })));
  router.post('/timesheets/:id/review', requireCsrf, validate(reviewSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.review(req.validated.params.id, req.user, req.validated.body, { ip: req.ip }) }, message: 'Review recorded' })));
  router.get('/agents', validate(agentListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.agents(req.validated.query), message: 'Agents loaded' })));
  router.patch('/agents/:id/status', requireCsrf, validate(agentStatusSchema), asyncHandler(async (req, res) => { await service.setAgentStatus(req.validated.params.id, req.validated.body.status, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Agent status updated' }); }));
  router.get('/companies', validate(companyAdminListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.companies(req.validated.query), message: 'Companies loaded' })));
  router.patch('/companies/:id', requireCsrf, validate(companyAdminUpdateSchema), asyncHandler(async (req, res) => { await service.updateCompany(req.validated.params.id, req.validated.body, req.user, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Company updated' }); }));
  router.get('/audits', validate(auditListSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.audits(req.validated.query), message: 'Audit log loaded' })));
  return router;
}

export const adminRouter = createAdminRouter();
