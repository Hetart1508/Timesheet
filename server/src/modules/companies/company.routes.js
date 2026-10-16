import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { CompanyRepository } from './company.repository.js';
import { CompanyService } from './company.service.js';
import { companyListSchema, createCompanySchema } from '../timesheets/timesheet.schemas.js';

export function createCompanyRouter(options = {}) {
  const service = options.service || new CompanyService(new CompanyRepository());
  const auth = options.authenticate || authenticate;
  const router = Router();
  router.use(auth);
  router.get('/', validate(companyListSchema), asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.list(req.validated.query), message: 'Companies loaded' });
  }));
  router.post('/', requireCsrf, validate(createCompanySchema), asyncHandler(async (req, res) => {
    const company = await service.create(req.validated.body, req.user, { ip: req.ip });
    res.status(201).json({ success: true, data: { company }, message: 'Company created' });
  }));
  return router;
}

export const companyRouter = createCompanyRouter();
