# Security controls

## Requests and configuration

- Environment values are validated at startup. Production refuses the development JWT secret, `DEV_EMAIL_MODE=true`, or `COOKIE_SECURE=false`.
- Helmet sets security headers, Express identification is disabled, payload sizes are bounded, and credentialed CORS uses the explicit `CORS_ORIGINS` allowlist.
- Requests receive a correlation ID. Structured logs redact secret-bearing fields; public error responses do not expose stack traces or database errors.
- Browser state-changing requests with an `Origin` header are checked against the CORS allowlist; safe methods and non-browser requests may omit it. Protected mutations also require the CSRF token.
- Database access is parameterized. MySQL constraints and foreign keys enforce ownership/history invariants.

## Authentication and authorization

- Passwords use Argon2id. Passwords must be at least 12 characters by default.
- Public registration always creates an Agent; the request cannot assign a role. The first Admin is created only by the guarded `npm run admin:bootstrap` command, which refuses to run once an Admin exists.
- Access and opaque refresh credentials are held in HttpOnly cookies. Refresh tokens are hashed in storage, rotated on refresh, and reuse detection revokes the affected session. Cookies use `SameSite=Lax`; production must use HTTPS and `COOKIE_SECURE=true`.
- A readable CSRF cookie is echoed in `X-CSRF-Token` for protected mutations. The UI does not store JWTs or refresh tokens in web storage.
- Authorization checks the active account and role on protected API requests. Deactivating an Agent revokes existing sessions.
- Login attempts are limited to eight per 15 minutes per limiter key; other public authentication actions have a 20-per-15-minute limit. Responses for resend/reset requests avoid disclosing account eligibility.
- Verification and password-recovery tokens are single-use, hashed at rest, expire, and are rate-limited. Email verification defaults to a 10-minute OTP lifetime and five failed attempts.

## Data and audit

Audit history is append-only at the application layer. Never include password hashes, cookies, JWTs, refresh tokens, verification/reset tokens, Brevo keys, or raw authorization headers in audit payloads or logs. Exported CSV/XLSX values are escaped to prevent spreadsheet formula execution, and exports are audited.

## Production requirements

Use HTTPS, `COOKIE_SECURE=true`, a strong random `JWT_ACCESS_SECRET`, exact browser origins in `CORS_ORIGINS`, and a least-privilege MySQL runtime account. Use a distinct migration identity for schema changes. Keep `DEV_EMAIL_MODE=false`; configure a verified Brevo sender and secret API key for transactional email. Never commit `.env` or bootstrap credentials.

Automated email tests stub Brevo's HTTP responses, including success and failure. They do not send a live email; verify provider credentials and sender configuration separately in the deployment environment.
