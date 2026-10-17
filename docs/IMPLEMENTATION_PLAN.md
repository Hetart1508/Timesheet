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

Expected URLs: frontend `http://localhost:5173`, API liveness `http://localhost:5001/api/v1/health/live`, database readiness `http://localhost:5001/api/v1/health/ready`.

## Phase 2 — Authentication and security

- [x] Agent-only registration and single-use six-digit email OTP verification
- [x] Login by username/email, HttpOnly access cookie, opaque refresh rotation
- [x] CSRF protection, origin validation, rate limits, logout/session revocation
- [x] Forgot/reset/change password and session revocation
- [x] Brevo transactional email plus explicit development email mode
- [x] guarded one-time Admin bootstrap
- [x] public authentication pages and protected session loading
- [x] authentication, authorization and provider-isolation tests
- [ ] MySQL-backed authentication suite executed against the local test database
- [ ] public flows visually verified in a browser session

Test gate: configure the dedicated test database, migrate, bootstrap an Admin, then complete registration → verification → login → refresh → logout and forgot/reset flows.

## Phase 3 — Agent timesheets

- [x] Agent dashboard and company lookup/creation
- [x] Select a work date, then maintain one daily timesheet with multiple company visits and manual in/out times
- [x] Ownership enforcement, overlap validation and transactional audit history
- [x] Agent UI/API integration and focused tests
- [ ] MySQL-backed create, edit, submit, correct and resubmit walkthrough completed

Test gate: create, edit, submit, correct and resubmit using an Agent account.

## Phase 4 — Admin management

- [x] Operations dashboard and pending-review queue
- [x] Agent activation/deactivation with immediate session revocation
- [x] Company approval and availability administration
- [x] Timesheet review, approval/rejection/change requests
- [x] Audit viewer and focused authorization/service coverage
- [ ] Signed-in Admin browser walkthrough completed

Test gate: Admin review flow plus negative Agent-authorization tests.

## Phase 5 — Analytics and exports

- [x] Database-backed daily/monthly/Agent/company analytics
- [x] Date-scoped analytics UI with lightweight trend visualization
- [x] Filtered visit-level CSV and XLSX exports
- [x] Spreadsheet-formula injection protection and export audit events
- [ ] Signed-in Admin analytics/export browser walkthrough completed

Test gate: seeded aggregation assertions and export-content checks.

## Phase 6 — UI refinement

- [x] Responsive desktop/mobile shell, accessible controls, skip navigation, and mobile-menu focus handling
- [x] Loading, empty, failure/retry, and confirmation states across Agent and Admin workflows
- [x] No placeholder production data or inert actions in the implemented workflows
- [x] Full workspace tests (39 server tests and 10 client tests) and production client build
- [ ] Signed-in desktop/mobile browser walkthroughs for both roles; local test sessions are not available yet

Test gate: desktop and mobile browser walkthroughs for both roles. The browser currently verifies the public sign-in screen; the authenticated role walkthrough remains open until local test sessions are available.

## Phase 7 — Final verification and documentation

- Complete automated suite, production build, migration verification
- API, database, security and deployment documentation
- Honest record of external-service tests and remaining environment limitations

Test gate: clean install following only the README.

## Reference project decisions

The neighboring `Finovo` project is the reference because it uses the requested React/Express/MySQL shape and identifies `https://finsight-kybf.onrender.com/` as its deployed site. Reused visual direction: Geist-style system typography, white surfaces, neutral `#FAFBFC` background, blue `#4F9CF9` accent, compact cards, desktop sidebar and mobile navigation. Security and modularity are intentionally redesigned for this application's stricter requirements; no Finovo secrets or business code are copied.
