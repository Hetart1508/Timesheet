import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { EmailService } from '../../services/email/email.service.js';
import { TimesheetRepository } from './timesheet.repository.js';
import { TimesheetService } from './timesheet.service.js';
import { createTimesheetSchema, historySchema, timesheetIdSchema, updateTimesheetSchema, updateVisitSchema, visitIdSchema, visitSchema } from './timesheet.schemas.js';

export function createTimesheetRouter(options = {}) {
  const repository = options.repository || new TimesheetRepository();
  const service = options.service || new TimesheetService(repository, new EmailService(new AuthRepository()));
  const auth = options.authenticate || authenticate;
  const router = Router();
  router.use(auth, requireRole('AGENT'));
  router.get('/dashboard', asyncHandler(async (req, res) => res.json({ success: true, data: await service.dashboard(req.user.id), message: 'Dashboard loaded' })));
  router.get('/timesheets', validate(historySchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.list(req.user.id, req.validated.query), message: 'Timesheets loaded' })));
  router.post('/timesheets', requireCsrf, validate(createTimesheetSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: { timesheet: await service.start(req.user.id, req.validated.body.workDate) }, message: 'Timesheet ready' })));
  router.get('/timesheets/:id', validate(timesheetIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.get(req.validated.params.id, req.user.id) }, message: 'Timesheet loaded' })));
  router.put('/timesheets/:id', requireCsrf, validate(updateTimesheetSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.updateSummary(req.validated.params.id, req.user.id, req.validated.body.dailySummary, { ip: req.ip }) }, message: 'Declaration saved' })));
  router.delete('/timesheets/:id', requireCsrf, validate(timesheetIdSchema), asyncHandler(async (req, res) => { await service.deleteDraft(req.validated.params.id, req.user.id, { ip: req.ip }); res.json({ success: true, data: {}, message: 'Draft deleted' }); }));
  router.post('/timesheets/:id/visits', requireCsrf, validate(visitSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: { timesheet: await service.addVisit(req.validated.params.id, req.user.id, req.validated.body, { ip: req.ip }) }, message: 'Visit added' })));
  router.put('/visits/:id', requireCsrf, validate(updateVisitSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.updateVisit(req.validated.params.id, req.user.id, req.validated.body, { ip: req.ip }) }, message: 'Visit updated' })));
  router.delete('/visits/:id', requireCsrf, validate(visitIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.deleteVisit(req.validated.params.id, req.user.id, { ip: req.ip }) }, message: 'Visit removed' })));
  router.post('/timesheets/:id/submit', requireCsrf, validate(timesheetIdSchema), asyncHandler(async (req, res) => res.json({ success: true, data: { timesheet: await service.submit(req.validated.params.id, req.user, { ip: req.ip }) }, message: 'Timesheet submitted' })));
  return router;
}

export const timesheetRouter = createTimesheetRouter();
