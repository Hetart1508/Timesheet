import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { currentBusinessDate } from '../../utils/business-time.js';
import { ReportRepository } from './report.repository.js';
import { ReportService } from './report.service.js';
import { analyticsSchema, exportSchema } from './report.schemas.js';

export function createReportRouter(options = {}) {
  const repository = options.repository || new ReportRepository();
  const service = options.service || new ReportService(repository);
  const auth = options.authenticate || authenticate;
  const router = Router();
  router.use(auth, requireRole('ADMIN'));
  router.get('/analytics', validate(analyticsSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.analytics(req.validated.query), message: 'Analytics loaded' })));
  const sendExport = (format) => asyncHandler(async (req, res) => {
    const rows = await service.rows(req.validated.query);
    const filename = `timesheet_export_${currentBusinessDate()}.${format}`;
    const output = format === 'csv' ? service.toCsv(rows) : await service.toXlsx(rows);
    await repository.auditExport(req.user.id, format, req.validated.query, req.ip);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(output);
  });
  router.get('/exports/timesheets.csv', validate(exportSchema), sendExport('csv'));
  router.get('/exports/timesheets.xlsx', validate(exportSchema), sendExport('xlsx'));
  return router;
}

export const reportRouter = createReportRouter();
