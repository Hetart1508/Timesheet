import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ConfirmationRepository } from './confirmation.repository.js';
import { ConfirmationService } from './confirmation.service.js';

const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const querySchema = z.object({ body: z.object({}).default({}), params: z.object({}), query: z.object({ token: z.string().min(32).max(500) }) });
const responseSchema = z.object({ body: z.object({ token: z.string().min(32).max(500), response: z.enum(['YES', 'NO']) }).strict(), params: z.object({}), query: z.object({}) });

export function createConfirmationRouter(options = {}) {
  const service = options.service || new ConfirmationService(new ConfirmationRepository());
  const router = Router();
  router.use(limiter);
  router.get('/', validate(querySchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.get(req.validated.query.token), message: 'Confirmation loaded' })));
  router.post('/', validate(responseSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await service.respond(req.validated.body.token, req.validated.body.response), message: 'Response recorded' })));
  return router;
}

export const confirmationRouter = createConfirmationRouter();
