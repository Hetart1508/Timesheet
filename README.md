# Timesheet Management

A production-minded React, Express and MySQL application for field-agent timesheets, company visits, approvals, analytics and audit history.

## User training guides

- [Admin User Guide](docs/ADMIN_USER_GUIDE.md)
- [Agent User Guide](docs/AGENT_USER_GUIDE.md)
- [Pre-production Test Checklist](docs/PRE_PRODUCTION_TEST_CHECKLIST.md)

Development is intentionally phase-gated so the frontend, backend and database can be tested independently. See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for current status.

## Current checkpoint

Phases 1–7 are implemented across the API and React UI. A clean lockfile install, all automated server/client tests, the production client build, and all five local MySQL migrations have been verified. Signed-in desktop/mobile walkthroughs for both roles remain pending; browser checks so far cover the public sign-in screen and the mobile viewport.

## Prerequisites

- Node.js 22 or newer (Node 24 LTS is recommended)
- npm 10 or newer
- MySQL 8.0 or a compatible later release

## 1. Install

```bash
npm ci
cp .env.example .env
```

Replace every placeholder secret in `.env`. The file is ignored by Git.

## 2. Create local MySQL databases and a dedicated user

Sign in using your local administrative MySQL account, then run the following after replacing the example password:

```sql
CREATE DATABASE timesheet_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE timesheet_management_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'timesheet_app'@'localhost'
  IDENTIFIED BY 'replace_with_a_strong_local_password';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE
  ON timesheet_management.* TO 'timesheet_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON timesheet_management_test.* TO 'timesheet_app'@'localhost';

-- Local migration convenience. In production, use a separate migration account.
GRANT CREATE, ALTER, INDEX, DROP, REFERENCES
  ON timesheet_management.* TO 'timesheet_app'@'localhost';
FLUSH PRIVILEGES;
```

For TCP connections, you may need an equivalent `'timesheet_app'@'127.0.0.1'` account depending on your MySQL authentication configuration.

## 3. Configure

At minimum, set these values in `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=timesheet_management
TEST_DB_NAME=timesheet_management_test
DB_USER=timesheet_app
DB_PASSWORD=your_local_password
JWT_ACCESS_SECRET=generate_a_random_secret_of_at_least_32_characters
```

Generate a local secret without placing it in shell history:

```bash
openssl rand -base64 48
```

## 4. Migrate and verify the database

```bash
npm run db:migrate
npm run db:status
```

The status command should report migrations `001` through `005` as `UP`.

## 5. Test each layer

Run the full automated suite:

```bash
npm test
```

To run one side separately, use `npm run test:server` or `npm run test:client`.

Production frontend build:

```bash
npm run build
```

Database readiness (after starting the apps):

```bash
curl http://localhost:5001/api/v1/health/ready
```

## 6. Run locally

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- API liveness: <http://localhost:5001/api/v1/health/live>
- API/database readiness: <http://localhost:5001/api/v1/health/ready>

The Vite development server proxies `/api` to Express. The browser API client sends cookies, applies the CSRF header for state-changing requests, and keeps access/refresh tokens out of browser storage.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run client and server together |
| `npm run dev:client` | Run only Vite |
| `npm run dev:server` | Run only Express with watch mode |
| `npm test` | Run all automated tests |
| `npm run build` | Create the production client bundle |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:status` | Show applied/pending migrations |
| `npm run db:seed` | Run the current safe development seed step |
| `npm run admin:bootstrap` | Create the first Admin once, using explicit environment values |

## Phase 2 authentication test

With `DEV_EMAIL_MODE=true`, Admin verification and sign-in write their six-digit OTPs to the server log, while forgot-password and timesheet confirmation write safe local links. Admin authentication requires a valid email, password, and fresh one-time email code before a session is created. Agents are managed from the Admin directory and do not sign in.

The first Admin can use the one-time `/admin/register` setup flow. Alternatively, temporarily set the four `ADMIN_*` values in `.env`, then run:

```bash
npm run admin:bootstrap
```

Both setup methods refuse to create an account if an Admin already exists. Remove the bootstrap password from `.env` immediately afterward. The web setup route cannot create a second Admin; ordinary access uses the dedicated Admin sign-in flow.

For real email, set `DEV_EMAIL_MODE=false`, `BREVO_API_KEY`, and a verified `BREVO_SENDER_EMAIL`. Delivery uses Brevo's current transactional endpoint at `POST https://api.brevo.com/v3/smtp/email`; failed delivery is recorded without rolling back a successfully created account or reset request. Automated tests mock provider success and failure responses; live Brevo delivery has not been verified as part of this checkpoint.

## Troubleshooting

- `Access denied for user`: confirm `DB_USER`, `DB_PASSWORD`, and whether MySQL expects `localhost` or `127.0.0.1`.
- `ECONNREFUSED 127.0.0.1:3306`: start MySQL and confirm its configured port.
- readiness returns `503`: the API is alive, but cannot authenticate to or query MySQL. The response intentionally does not expose the SQL error.
- migration fails halfway: MySQL DDL can implicitly commit. Correct the reported problem, inspect `schema_migrations`, and use a fresh development database if an initial migration was partially created.

## Security notes

- Never commit `.env`.
- Do not use MySQL `root` as the application runtime account.
- `DEV_EMAIL_MODE=true` is for local development only and is rejected in production. Real email requires a valid Brevo API key and verified sender.
- Access and refresh credentials use HttpOnly cookies; the CSRF cookie is readable by the client and echoed in `X-CSRF-Token` for protected mutations. JWTs are not stored in browser storage.
- Use HTTPS in production with `COOKIE_SECURE=true`, an exact `CORS_ORIGINS` allowlist, and a least-privilege database runtime user.

## Reference project

The sibling Finovo repository and its declared deployment at `https://finsight-kybf.onrender.com/` informed the compact white/neutral/blue visual direction. This project does not copy Finovo credentials, local-storage authentication, or its monolithic server structure.
