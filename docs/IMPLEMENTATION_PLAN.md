# Phased implementation plan

Each phase ends with an independently testable checkpoint. A phase is not marked complete until its commands have actually been run.

## Phase 1 — Foundation

- [x] npm workspace with separate `client` and `server` applications
- [x] React + Vite foundation and responsive reference design tokens
- [x] Express API, request IDs, safe error responses, security headers, CORS
- [x] validated environment configuration and MySQL connection pool
- [x] explicit migration runner and normalized initial schema
- [x] liveness/readiness endpoints and automated foundation tests
- [ ] migration verified against the user's local MySQL database
- [ ] frontend visually verified in a browser session

Test gate:

```bash
npm install
cp .env.example .env
npm run test
npm run db:migrate
npm run db:status
npm run dev
```

Expected URLs: frontend `http://localhost:5173`, API liveness `http://localhost:5000/api/v1/health/live`, database readiness `http://localhost:5000/api/v1/health/ready`.

## Phase 2 — Authentication and security

- Registration and single-use email verification
- Login by username/email, HttpOnly access cookie, opaque refresh rotation
- CSRF protection, origin validation, rate limits, logout/session revocation
- Forgot/reset password, Brevo integration, Admin bootstrap
- Authentication and authorization tests

Test gate: dedicated test database migration plus auth API suite and public-page browser flow.

## Phase 3 — Agent timesheets

- Agent dashboard and company lookup/creation
- One daily timesheet, multiple manual-time visits, declaration and submission
- Ownership enforcement, overlap validation and transactional audit history
- Agent UI/API integration and tests

Test gate: create, edit, submit, correct and resubmit using an Agent account.

## Phase 4 — Admin management

- Agent/company administration
- Timesheet review, approval/rejection/change requests
- Audit viewer and authorization coverage

Test gate: Admin review flow plus negative Agent-authorization tests.

## Phase 5 — Analytics and exports

- Database-backed daily/monthly/agent/company analytics
- Filtered CSV and XLSX exports with formula-injection protection

Test gate: seeded aggregation assertions and export-content checks.

## Phase 6 — UI refinement

- Responsive desktop/mobile shell, accessible controls and focus handling
- Loading, empty, failure and confirmation states
- No placeholder production data or inert actions

Test gate: desktop and mobile browser walkthroughs for both roles.

## Phase 7 — Final verification and documentation

- Complete automated suite, production build, migration verification
- API, database, security and deployment documentation
- Honest record of external-service tests and remaining environment limitations

Test gate: clean install following only the README.

## Reference project decisions

The neighboring `Finovo` project is the reference because it uses the requested React/Express/MySQL shape and identifies `https://finsight-kybf.onrender.com/` as its deployed site. Reused visual direction: Geist-style system typography, white surfaces, neutral `#FAFBFC` background, blue `#4F9CF9` accent, compact cards, desktop sidebar and mobile navigation. Security and modularity are intentionally redesigned for this application's stricter requirements; no Finovo secrets or business code are copied.
