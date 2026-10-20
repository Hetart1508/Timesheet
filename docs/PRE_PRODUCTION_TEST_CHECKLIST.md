# Pre-production test checklist

Use this checklist on the final staging environment before deploying production. Tick an item only after the visible result matches the expected result. Record defects with a screenshot, user role, time, URL, and request ID when available.

## Test data and release gate

- [ ] Use a staging database and staging Brevo sender; do not run destructive cases against production data.
- [ ] Prepare one Admin, Agent A, Agent B, one unverified Agent, and one inactive Agent.
- [ ] Prepare approved, pending, and inactive companies.
- [ ] Test on desktop and a phone-sized viewport.
- [ ] Test in the browsers the team will support (at minimum current Chrome and Safari/Edge).
- [ ] Confirm no unresolved **P0** or **P1** defects remain.

Severity: **P0** security/data loss/site unavailable; **P1** core workflow blocked or incorrect totals; **P2** workaround exists; **P3** cosmetic.

## Checks completed by Codex — 19 October 2026

- [x] Server automated suite: 71/71 tests passed.
- [x] Client automated suite: 47/47 tests passed.
- [x] Production frontend build completed successfully.
- [x] Database migrations `001` through `005` report `UP`.
- [x] Running local API reports both `live` and database `ready`.
- [x] Automated coverage includes role authorization, CSRF, OTP expiry/lockout, session rotation, company ownership, timesheet overlap rules, reviews, exports, invoices, and key UI controls.
- [ ] Live Brevo delivery (requires a real provider call and inbox inspection).
- [ ] Signed-in browser walkthrough (browser automation was unavailable in the test workspace).

## Public pages and navigation

- [ ] `/` sends a signed-out visitor to Agent sign-in.
- [ ] `/login` redirects to `/login/agent`; `/admin/login` redirects to `/login/admin`.
- [ ] Agent sign-in, Admin sign-in, registration, verification, resend, forgot-password, and reset-password pages render without console errors.
- [ ] Refreshing every public and protected URL directly does not produce a hosting 404.
- [ ] An unknown URL shows the application Not Found page.
- [ ] Signed-out users cannot open protected pages using Back, direct URLs, or cached tabs.
- [ ] Authenticated users who press Back cannot return to login, registration, verification, or password-recovery pages.
- [ ] Agent navigation never displays Admin destinations.
- [ ] Admin navigation never exposes Agent-only editing actions.
- [ ] Mobile menu opens, traps/moves focus correctly, closes by button/outside click/Escape, and restores focus.
- [ ] Keyboard-only navigation has visible focus and the skip link reaches main content.

## Agent registration and email verification

- [ ] Valid registration creates an Agent and sends exactly one six-digit OTP email.
- [ ] Registration cannot choose or inject an Admin role.
- [ ] Duplicate email and duplicate username receive a safe conflict message without exposing unnecessary account details.
- [ ] Invalid email, short password, missing fields, whitespace-only values, and overlong values show useful field errors.
- [ ] A password exactly at the minimum length is accepted; one character below is rejected.
- [ ] Unverified Agent cannot sign in and is directed to verification actions.
- [ ] Correct OTP verifies the account once.
- [ ] Incorrect OTP is rejected; five failed attempts lock the code.
- [ ] Expired OTP and reused OTP are rejected.
- [ ] Resending invalidates the previous OTP and the newest OTP works.
- [ ] Resend for an unknown/already-verified email does not disclose account eligibility.
- [ ] Rapid registration/resend attempts eventually return the friendly rate-limit message.
- [ ] Brevo failure produces a clear recoverable message and does not create duplicate accounts on retry.

## Agent sign-in, session, and password

- [ ] Verified active Agent signs in with email and password.
- [ ] Username in place of email is rejected if email-only sign-in is intended.
- [ ] Wrong password and unknown email return the same generic error.
- [ ] Unverified and inactive Agents cannot sign in.
- [ ] Agent credentials cannot start an Admin sign-in; Admin credentials cannot use Agent sign-in.
- [ ] Repeated failed sign-ins trigger rate limiting; a successful sign-in behaves normally afterward.
- [ ] Refreshing the browser keeps a valid session.
- [ ] Sign out clears the session; Back and refresh do not restore protected content.
- [ ] Sign out on one session does not unexpectedly corrupt another valid session.
- [ ] “Sign out all” invalidates sessions in two different browsers/devices.
- [ ] Access-token expiry refreshes transparently once and does not create a request loop.
- [ ] Forgot-password gives the same response for known and unknown emails.
- [ ] Reset link works once; expired, malformed, and reused links fail safely.
- [ ] Password reset revokes existing sessions and the old password stops working.
- [ ] Change password requires the correct current password, signs out all sessions, and accepts only the new password afterward.
- [ ] Password fields can show/hide text without changing their values.

## Agent dashboard and timesheet history

- [ ] Dashboard date, totals, recent records, and status labels are correct in IST.
- [ ] Today and a past date can be opened; a future date cannot be selected or submitted through the API.
- [ ] Opening the same date twice returns the same timesheet rather than creating a duplicate.
- [ ] History filters work independently and together: date range, status, page, and page size.
- [ ] Empty history and API-error states are clear and retry works.
- [ ] Date-only values never shift by one day in a different browser timezone.
- [ ] Agent A cannot view or modify Agent B's timesheet by changing an ID in the URL/request.

## Agent visit entry and submission

- [ ] Company search waits briefly, shows matching choices, and supports Enter/keyboard selection.
- [ ] A pending company created by the Agent is immediately usable for a visit.
- [ ] Gold, Silver, and Bronze save correctly; any other category is rejected.
- [ ] Required company, contact, purpose, notes, category, check-in, and check-out validation is clear.
- [ ] Check-out equal to or earlier than check-in is rejected.
- [ ] Partially and fully overlapping visits are rejected; adjacent visits (for example 10:00–11:00 and 11:00–12:00) are accepted.
- [ ] Editing a visit updates totals; deleting after confirmation removes it from active totals.
- [ ] Canceling delete leaves the visit unchanged.
- [ ] Daily summary below 20 characters cannot satisfy submission; exactly 20 valid characters can.
- [ ] Submission is blocked with no visits or no valid summary.
- [ ] Valid Draft submits once and appears in the Admin review queue.
- [ ] Double-clicking Submit does not duplicate notifications or state changes.
- [ ] Submitted/approved/rejected/changes-requested records display the correct review and comment.
- [ ] Editing a reviewed record returns it to Draft; resubmitting returns it to the review queue.
- [ ] Concurrent edits from two tabs fail safely or produce a consistent final record.

## Agent company management

- [ ] Agent can search the shared directory and view company visit history.
- [ ] Agent-created company starts Pending and appears under their submissions.
- [ ] Agent can edit and deactivate only their own active Pending company.
- [ ] Agent cannot edit another Agent's company or an approved company by altering an ID.
- [ ] Duplicate/similar company names are handled according to the intended business rule.
- [ ] Deactivated company disappears from active selection but historical visits retain the company snapshot.
- [ ] Search, pagination, empty state, long names/addresses, and special characters render correctly.

## Admin registration and sign-in

- [ ] First-Admin setup creates exactly one unverified Admin and sends a verification OTP.
- [ ] A second Admin setup attempt is rejected, including two near-simultaneous attempts.
- [ ] Admin verification follows the same single-use, expiry, resend, and lockout rules.
- [ ] Correct Admin email/password sends a fresh login OTP but does not create a session yet.
- [ ] Incorrect/expired/reused Admin login OTP is rejected.
- [ ] Correct Admin OTP creates the session once and records the sign-in audit event.
- [ ] Admin login works from the deployed hostname without repeated Brevo IP-authorization alerts.

## Admin dashboard, reviews, and calendar

- [ ] Dashboard metrics match database records and the pending queue shows submitted timesheets only.
- [ ] Reviews and full Timesheets pages search, sort, filter, paginate, and preserve sensible state on navigation.
- [ ] Admin can inspect declaration, all active visits, categories, durations, Agent, date, and review history.
- [ ] Approve works with an optional comment.
- [ ] Reject and Request changes require at least five meaningful characters.
- [ ] A timesheet that is no longer Submitted cannot be decided again from a stale tab.
- [ ] Review status and audit event are committed together; refresh shows the same result.
- [ ] Agent receives/sees the correct decision and comment.
- [ ] Work calendar counts approved active visit hours only.
- [ ] Calendar intensity, day tooltip/focus text, Agent filter, month navigation, empty month, and IST dates are correct.
- [ ] Future months and invalid month parameters are rejected.

## Admin Agent and company management

- [ ] Agent directory search, sorting/filtering, pagination, verification state, status, and totals are accurate.
- [ ] Deactivating an Agent asks for confirmation, revokes current sessions, retains history, and blocks new sign-in.
- [ ] Reactivating restores sign-in but does not restore old sessions.
- [ ] Admin cannot accidentally change the Admin account through Agent-status controls.
- [ ] Admin-created company is Approved immediately.
- [ ] Admin can edit, approve, deactivate, and reactivate the intended company.
- [ ] Approving a pending company makes it shared/read-only for Agents.
- [ ] Company actions preserve historical visits and generate correct audit entries.
- [ ] Stale-tab and double-click company actions remain consistent.

## Reports, exports, invoices, and audit

- [ ] Daily, monthly, Agent, and company analytics match a manually calculated sample dataset.
- [ ] Combined report filters work; future and inverted date ranges are rejected.
- [ ] Charts handle no data, one point, long labels, and larger datasets without breaking layout.
- [ ] CSV downloads, opens as UTF-8, has correct filtered rows, and safely escapes commas/quotes/formula-like text.
- [ ] XLSX downloads, opens without repair warnings, has correct rows/headers, and neutralizes formula injection.
- [ ] Export filenames/content types are sensible and every export creates an audit event.
- [ ] Invoice includes approved, non-deleted visits for only the selected Agent/month.
- [ ] Invoice totals use Gold ₹1,000, Silver ₹800, and Bronze ₹600 per visit.
- [ ] Invoice PDF downloads/opens correctly and formats IST dates/times and long text cleanly.
- [ ] A month with no eligible visits shows a clear message instead of a broken PDF.
- [ ] Audit log search, filters, sort, pagination, and expanded before/after details work.
- [ ] Audit records never display passwords, OTPs, reset tokens, cookies, JWTs, API keys, or authorization headers.

## Security and failure behavior

- [ ] Agent requests to every Admin endpoint return 403; signed-out requests return 401.
- [ ] State-changing requests without a matching CSRF cookie/header are rejected.
- [ ] Requests from an unapproved browser origin are rejected; the deployed origin is accepted.
- [ ] API errors show safe messages and request IDs, never stack traces, SQL, secrets, or filesystem paths.
- [ ] Large/invalid JSON bodies and invalid query/path values fail safely without crashing the API.
- [ ] Direct ID changes cannot cross Agent ownership boundaries for timesheets, visits, or companies.
- [ ] Cookies are HttpOnly where required, Secure in production, and have the intended SameSite/domain/path settings.
- [ ] No JWT, refresh token, password, or OTP appears in localStorage/sessionStorage or browser logs.
- [ ] Database or API outage shows a recoverable error/loading state; repeated Retry does not duplicate writes.
- [ ] `/api/v1/health/live` returns success and `/api/v1/health/ready` reflects database availability.

## Responsive, accessibility, and content checks

- [ ] Test widths around 320, 375, 768, 1024, and 1440 px with no horizontal page overflow.
- [ ] Forms, tables, dialogs, menus, charts, calendars, and visit cards remain usable with long realistic content.
- [ ] Browser zoom at 200% remains usable without hidden controls.
- [ ] Every input has a label; validation is associated with the field and announced where applicable.
- [ ] Dialog focus is contained/restored and all actions work using keyboard only.
- [ ] Loading indicators and errors are announced; color is not the only status indicator.
- [ ] Dates consistently use `DD-MM-YYYY`, times use IST, and copy has no placeholder/debug text.
- [ ] No unexpected console errors, failed network calls, or mixed-content warnings occur during the complete walkthrough.

## Production configuration gate

- [ ] `NODE_ENV=production`, strong unique `JWT_ACCESS_SECRET`, `COOKIE_SECURE=true`, and exact `CORS_ORIGINS` are set.
- [ ] `DEV_EMAIL_MODE=false`; Brevo API key and verified sender are configured as secrets.
- [ ] Brevo IP policy is intentionally configured for the production backend's outbound networking.
- [ ] Production database uses least-privilege runtime credentials; migration credentials are separate.
- [ ] Database backup and restore procedure has been tested before migration/deployment.
- [ ] All migrations report `UP` and readiness passes before traffic is enabled.
- [ ] HTTPS, proxy trust, cookie domain, database TLS, log redaction, monitoring, and backup retention are verified.
- [ ] Production smoke-test owner, rollback trigger, and rollback steps are agreed before release.

## Final sign-off

- [ ] Admin end-to-end journey passed.
- [ ] Agent A end-to-end journey passed.
- [ ] Agent B/cross-user isolation journey passed.
- [ ] Desktop journey passed.
- [ ] Mobile journey passed.
- [ ] Real email, CSV, XLSX, and PDF outputs passed.
- [ ] Security/configuration gate passed.
- [ ] Product owner approved production deployment.

Notes / defect links:

- 

