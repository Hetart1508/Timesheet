# Security baseline

Phase 1 establishes:

- environment validation and production-only safety assertions;
- Helmet security headers and disabled Express identification;
- explicit credentialed CORS allowlist;
- small JSON/form request limits;
- request IDs, structured logging and secret-field redaction;
- parameterized MySQL access and a transaction helper;
- safe centralized error handling;
- schema constraints and restrictive foreign keys.

Phase 2 implements Argon2id hashing, HttpOnly access cookies, opaque refresh-token hashing and rotation, previous-token reuse detection, double-submit CSRF tokens, Origin verification, single-use recovery tokens, rate limits, and database-backed role/active-user enforcement. Email OTPs are cryptographically generated, hashed at rest, expire after 10 minutes, and lock after five failed attempts. Password reset/change revokes every session for the account.

Public registration has no role field and the service always inserts `AGENT`. The initial Admin can only be created by the guarded command, which refuses to run after any Admin exists.

Audit payloads must never include password hashes, cookies, JWTs, refresh tokens, verification/reset tokens, Brevo keys, or raw authorization headers.
