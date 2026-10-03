---
name: verify-fuji-calendar
description: "Drive the Fuji Calendar React web app in a real Chromium browser to verify calendar, favorites, location-detail, and admin-login user flows. Use after changing a client-facing route or interaction."
---

# Verify Fuji Calendar

Read `features/README.md` first, then the feature recipe for each changed user-visible flow. This project has no checked-in browser automation harness; use OMP's managed real Chromium browser and its semantic locators. Do not substitute component tests for the user path.

## Launch

- Start the frontend only: `./node_modules/.bin/vite --config apps/client/vite.config.ts --host 127.0.0.1 --strictPort`.
- Vite must report `http://127.0.0.1:3000/`; `--strictPort` makes an occupied port a failure rather than silently choosing another.
- Keep the exact OMP-managed process/job identity returned by the launch command. Do not drive an instance started by another process or user.
- The frontend requests API data from `http://localhost:3001/api`; calendar, location details, and authenticated admin workflows require a working backend and its configured PostgreSQL/Redis services. Launch those only when the feature under test needs them, using the repository's documented `npm run dev:server` / `npm run dev:worker` commands and configured local services. Never substitute fake network responses for production API behavior.

## Doctor

Before driving, verify the launch process is still the one created for this run and that its port is owned by that process. On macOS, use `lsof -nP -iTCP:3000 -sTCP:LISTEN` and compare the listener PID with the recorded launch PID. Then run `curl --fail --silent --show-error http://127.0.0.1:3000/` and confirm the response contains the Fuji Calendar frontend entry document. If the listener identity differs, the request fails, or the app has a fatal browser error, stop and diagnose; do not use somebody else's instance. For backend-dependent features, run the server doctor at `curl --fail --silent --show-error http://127.0.0.1:3001/api/health` and confirm backend readiness before opening the UI.

## Drive

- Open a dedicated OMP-managed Chromium tab at `http://127.0.0.1:3000/`; do not adopt a user's relay/CDP tab.
- Use `tab.observe()` / `tab.ariaSnapshot()` and role/name locators. Re-observe after navigation or a state-changing render before using element references.
- Follow the exact feature file recipe; verify visible state and relevant browser storage/network effects. Do not call application internals or seed React state.
- For favorites-only checks, use an isolated browser context/tab and clear only that tab's `fuji-calendar-favorites` localStorage key before setup. The frontend can run without the API for this route; expected failed API requests from unrelated home-page calls do not count as proof of API behavior.

## Evidence

- Store proof under `artifacts/verify-fuji-calendar/<run-id>/`; use a unique run ID and keep it in the final report. Keep evidence after teardown.
- Capture an accessibility snapshot and screenshot with the address bar/app identity apparent where supported. Record the user action and the resulting visible state, not just a final screen.
- For favorites mutations, inspect the `fuji-calendar-favorites` localStorage value after the UI action and after reload. This read-only inspection proves persistence; do not directly write the storage key as a substitute for the UI flow.
- Exercise the real rendered controls. Do not use internal setters, test-only endpoints, or response mocks. Record unavailable API-backed paths as unverified with the exact unmet dependency.

## Cleanup

- Close only the dedicated browser tab opened by this run.
- Stop only the OMP-managed process/job started for this run using its returned process/job ID; never kill by process name or port-wide PID.
- Leave `artifacts/verify-fuji-calendar/<run-id>/` intact. Remove only disposable browser state/context created for this run.

## Features

See [`features/README.md`](features/README.md) for the user-visible feature map and preconditions.