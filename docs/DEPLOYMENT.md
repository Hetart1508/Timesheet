# Deployment

This repository provides a provider-neutral deployment outline; it does not provision cloud resources or configure a production domain.

## Build and serve

1. Install from the repository root with `npm ci`.
2. Build the static client with `npm run build`; publish `client/dist` to a static host or serve it from a reverse proxy.
3. Run the API with `npm run start -w server` on Node.js 22 or newer.
4. Route `/api` to the Express service. Prefer serving client and API on the same site so the `SameSite=Lax` session cookies work without cross-site cookie configuration.
5. Terminate HTTPS at the public edge and configure `TRUST_PROXY=true` only when the service is behind a trusted proxy that sets forwarded headers correctly.

## Configuration and release order

Set `NODE_ENV=production`, `COOKIE_SECURE=true`, a random `JWT_ACCESS_SECRET` of at least 32 characters, exact `CORS_ORIGINS`, and production MySQL connection settings. Keep `DEV_EMAIL_MODE=false`; configure `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL` if transactional email is required. Do not put bootstrap credentials in the long-running service environment.

Use separate MySQL credentials for migrations and application traffic. Run `npm run db:migrate` as a release step before routing traffic to the new application version, then check `npm run db:status`. Back up the database before schema changes. Application startup does not run migrations.

## Health and operations

- Liveness: `GET /api/v1/health/live` confirms the process responds.
- Readiness: `GET /api/v1/health/ready` checks MySQL connectivity and query access; use it to gate traffic when database availability is required.
- Preserve request IDs in logs and support incident triage without logging credentials or tokens.
- Use MySQL private networking where available, restrict inbound access, enable TLS as required by the provider, and encrypt backups.

Review cookie domain, CORS, proxy trust, database TLS, backup retention, and email-provider settings against the selected hosting provider before production launch.
