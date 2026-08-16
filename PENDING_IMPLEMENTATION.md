# Pending implementation tasks — my-home

## Completed (2026-08-16)

- [x] Initialize storage lazily and idempotently; Postgres migrations create users, API keys, and device-cache tables before use.
- [x] Persist users and API keys through the storage abstraction, including expiry and revocation checks.
- [x] Make API-key reads DB-backed with a short in-process read cache; key listings expose only a hint and a revocation ID.
- [x] Persist device discovery and command updates with a 30-second TTL cache; remove a device cache entry when live discovery no longer finds it.
- [x] Improve device, login, and API-key UI states: disabled in-flight controls, success/error feedback, and SWR refresh after mutations.
- [x] Validate Shortcuts command payloads and reject revoked or expired API keys.

## Still required

### High priority

- [ ] End-to-end MirAIe verification against a real device. This checkout contains placeholder `MIRAIE_USERNAME` / `MIRAIE_PASSWORD` values, so it cannot be run here. Exercise discovery, power, mode, and temperature commands with real credentials before production use.

### Medium priority

- [ ] Add unit/integration tests for API routes, storage, and the provider adapter; add GitHub Actions CI.
- [ ] Rate-limit the Shortcuts endpoint and add scoped keys plus audit logging.
- [ ] Add Docker Compose health checks and wait for Postgres before starting the app.

### Low priority

- [ ] Optimize the Docker runtime image to install production dependencies only.
- [ ] Add monitoring, structured logging, and programmatic API-key rotation/revocation notifications.
- [ ] Publish `@msawad08/miraie-client` once protocol methods are stable.

## Verification performed

- `npm run build` passes after the storage and UI changes.
- Automated browser visual inspection could not start because the local browser bridge is unavailable in this environment.
- The production build passes. A clean local runtime smoke test remains to be re-run after restarting the development server (the prior server had stale build chunks after a production build ran concurrently).
