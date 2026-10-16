# Deployment outline

The application is provider-neutral:

1. Build the client with `npm run build`.
2. Serve `client/dist` from a static host or reverse proxy.
3. Run `npm run start -w server` behind HTTPS and a trusted reverse proxy.
4. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, a strong JWT secret, exact `CORS_ORIGINS`, and externally hosted MySQL settings.
5. Run migrations as a distinct release step before switching application traffic.
6. Configure health probes using `/api/v1/health/live` and `/api/v1/health/ready`.

Do not expose MySQL publicly unless the provider requires it; prefer private networking, TLS, IP allowlists, encrypted backups, and a least-privilege runtime account.
