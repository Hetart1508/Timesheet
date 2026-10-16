# API conventions

All application endpoints use `/api/v1`.

Success envelope:

```json
{ "success": true, "data": {}, "message": "Operation completed successfully" }
```

Failure envelope:

```json
{
  "success": false,
  "message": "Safe public message",
  "code": "STABLE_ERROR_CODE",
  "requestId": "request-correlation-id"
}
```

Every response includes `x-request-id`. Unexpected failures are logged with the same identifier while the client receives no stack trace or raw database error.

## Phase 1 endpoints

- `GET /api/v1/health/live` — process liveness; does not depend on MySQL.
- `GET /api/v1/health/ready` — verifies a MySQL connection and query; returns `503 DATABASE_UNAVAILABLE` safely when unavailable.

## Phase 2 authentication endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`

Login and refresh set `ts_access` and `ts_refresh` as HttpOnly cookies. They also set a readable `ts_csrf` cookie. State-changing authenticated requests must copy that value into `X-CSRF-Token`; the bundled Axios client does this automatically. JWTs and refresh tokens are never returned in JSON.

Email verification accepts `{ "email": "agent@example.com", "otp": "123456" }`. The code expires after 10 minutes, is stored only as a SHA-256 hash, is replaced when resent, and is locked after five incorrect attempts.

Business endpoints are introduced in their corresponding phases, not exposed as non-functional placeholders.
