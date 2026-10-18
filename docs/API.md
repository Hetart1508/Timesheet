# API

All API routes use `/api/v1`. Request and response bodies use JSON unless a route returns an export file. List routes accept the filters shown below; page numbers start at 1. Validation failures return `422`.

## Response contract

JSON success responses use this envelope:

```json
{ "success": true, "data": {}, "message": "Operation completed successfully" }
```

JSON failures use a safe public message and stable code:

```json
{
  "success": false,
  "message": "Safe public message",
  "code": "STABLE_ERROR_CODE",
  "requestId": "request-correlation-id"
}
```

Every response includes `x-request-id`. Unexpected errors are logged against that ID; stack traces and raw database errors are not sent to clients.

## Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health/live` | Public | Process liveness; no database dependency. |
| GET | `/health/ready` | Public | Verifies MySQL connectivity and query access; unavailable database returns `503 DATABASE_UNAVAILABLE`. |

## Authentication

All paths below are under `/api/v1/auth`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | Public, rate-limited | Creates an Agent account and sends a verification code. The role is never accepted from the client. |
| POST | `/register-admin` | Public, rate-limited | Creates the system’s only Admin account and sends an email verification code. Database constraints reject a second Admin. |
| POST | `/verify-email` | Public, rate-limited | Verifies `{ "email": "agent@example.com", "otp": "123456" }`. |
| POST | `/resend-verification` | Public, rate-limited | Sends a replacement code when the account is eligible. |
| POST | `/login` | Public, rate-limited | Agent-only login using verified email and password; sets session cookies. Admin accounts are rejected. |
| POST | `/admin-login/request` | Public, rate-limited | Validates Admin email/password and emails a single-use OTP; does not create a session. |
| POST | `/admin-login/verify` | Public, rate-limited | Validates the Admin login challenge, email, and OTP; consumes the OTP and creates the Admin session. |
| POST | `/refresh` | Refresh cookie + CSRF | Rotates the refresh session and access cookie. |
| POST | `/logout` | CSRF | Revokes the current refresh session and clears cookies. |
| POST | `/logout-all` | Authenticated + CSRF | Revokes every session for the current user. |
| GET | `/me` | Authenticated | Returns the current user. |
| POST | `/forgot-password` | Public, rate-limited | Starts a reset flow without disclosing account eligibility. |
| POST | `/reset-password` | Public, rate-limited | Accepts a reset token and new password; revokes existing sessions. |
| POST | `/change-password` | Authenticated + CSRF | Changes the password and revokes existing sessions. |

Verification codes are single-use, expire after 10 minutes by default, are stored as SHA-256 hashes, and are locked after five incorrect attempts by default. Login and refresh set `ts_access` and `ts_refresh` as HttpOnly cookies and `ts_csrf` as a readable cookie. Authenticated state-changing requests must echo the CSRF cookie in `X-CSRF-Token`; the bundled Axios client does this. JWTs and refresh tokens are not returned in JSON or browser storage.

## Agent timesheets

All routes are under `/api/v1/agent` and require an active Agent session. A daily sheet is unique per Agent and work date. Create or open a selected date with `POST /timesheets` and `{ "workDate": "YYYY-MM-DD" }`; omit `workDate` to use the current business date. Future dates are rejected. Repeating the request for an existing date returns that day’s sheet.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/dashboard` | Agent | Current business date, today’s sheet summary, and recent sheets. |
| GET | `/timesheets` | Agent | History filtered by `startDate`, `endDate`, `status`, `page`, and `pageSize` (maximum 50). |
| POST | `/timesheets` | Agent + CSRF | Create or open the daily sheet for optional `workDate`. |
| GET | `/timesheets/:id` | Owning Agent | Sheet declaration, visits, and review details. |
| PUT | `/timesheets/:id` | Owning Agent + CSRF | Save `{ "dailySummary": "..." }`. |
| POST | `/timesheets/:id/visits` | Owning Agent + CSRF | Add a company visit with company, category (`Gold`, `Silver`, or `Bronze`), contact, purpose, notes, and `checkInTime` / `checkOutTime` in IST (`HH:mm`). |
| PUT | `/visits/:id` | Owning Agent + CSRF | Edit a visit. |
| DELETE | `/visits/:id` | Owning Agent + CSRF | Soft-delete a visit. |
| POST | `/timesheets/:id/submit` | Owning Agent + CSRF | Submit the daily sheet for review. |

Each visit is stored against the selected work date and interpreted in `BUSINESS_TIMEZONE` (default `Asia/Kolkata`). Checkout must be later than check-in, and overlapping visits on the same sheet are rejected.

## Companies

Routes are under `/api/v1/companies` and require authentication. Listing accepts `search`, `page`, and `pageSize` (maximum 50). Agent-created entries are pending review. Agents can edit or delete only their own active pending entries; once approved, a company is shared and read-only to Agents. Admins can create, edit, approve, and deactivate any company.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Authenticated | Lists companies available to the caller. |
| GET | `/mine` | Agent | Lists the Agent’s own submissions, including inactive records. |
| POST | `/` | Authenticated + CSRF | Creates a company; Agent entries are pending review, Admin entries are approved. |
| GET | `/:id/visits` | Authenticated | Lists visits for a company. |
| PUT | `/:id` | Admin or owning Agent + CSRF | Updates details; Agent updates require an active, pending company they created. |
| DELETE | `/:id` | Admin or owning Agent + CSRF | Soft-deactivates the company; visit history and company-name snapshots are retained. |

## Administration and reports

All routes are under `/api/v1/admin` and require an active Admin session. Mutations require CSRF.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard` | Operational metrics and pending review queue. |
| GET | `/timesheets` | Filter by status, Agent, date range, and pagination. |
| GET | `/timesheets/:id` | Full timesheet detail for review. |
| POST | `/timesheets/:id/review` | Record `APPROVED`, `REJECTED`, or `CHANGES_REQUESTED`; non-approval decisions require a comment of at least five characters. |
| GET | `/agents` | Search/filter Agents and view activity totals. |
| PATCH | `/agents/:id/status` | Activate/deactivate an Agent; deactivation revokes sessions. |
| GET | `/companies` | Search/filter company review and availability status; accepts `search`, `reviewStatus`, `status`, `page`, and `pageSize`. |
| PATCH | `/companies/:id` | Approve a pending company or change its availability; inactive entries can be reactivated. |
| GET | `/audits` | Filter append-only audit events by action/entity type. |
| GET | `/analytics` | Date-scoped daily, monthly, Agent, and company aggregation. |
| GET | `/exports/timesheets.csv` | Filtered visit-level CSV download. |
| GET | `/exports/timesheets.xlsx` | Filtered visit-level XLSX download. |
| GET | `/invoices/:agentId?month=YYYY-MM` | Generate an audited PDF invoice for the Agent’s approved, non-deleted visits in that month. |

Exports accept optional `agentId`, `status`, `startDate`, and `endDate` query parameters. Invoice amounts use Gold (INR 1,000), Silver (INR 800), and Bronze (INR 600) per approved visit. Export/invoice responses are files rather than JSON envelopes; formula-like export text is escaped and file generation is audited.
