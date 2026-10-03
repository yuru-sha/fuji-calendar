# Fuji Calendar verification map

Read this index and the corresponding recipe before driving the app. The app has four user-facing route groups: calendar/home, favorites, location detail, and administration. Calendar and detail data come from the backend; favorites are browser-local; admin routes require authentication and backend services.

## Baseline preconditions

- Follow `../SKILL.md` Launch and Doctor. Frontend URL: `http://127.0.0.1:3000/`; API base expected by the client: `http://localhost:3001/api`.
- Use a dedicated OMP-managed Chromium tab and a fresh browser profile/context for each run. Never overwrite the user's browser storage.
- Calendar, location detail, and successful admin operations require the real backend and its configured database/Redis. Record the unmet dependency rather than treating an API error or indefinite loading state as an app pass.

## Driving conventions

- Start each recipe from its stated route and clean browser state. Follow public navigation and rendered controls; do not write app storage or React state to manufacture a result.
- Use semantic roles and accessible names; inspect the accessibility tree before acting.
- Record screenshots and accessibility snapshots under `artifacts/verify-fuji-calendar/<run-id>/`, alongside action sequence and observed side effects.
- Verify the post-action state after reload when data is meant to persist. Do not claim an entry point is covered by testing a different route.

## Features

- [Monthly calendar and event selection](./calendar.md) covers calendar rendering, month navigation, and date selection when the API is available.
- [Favorites](./favorites.md) covers saved events and locations, tabs, import/export, and local persistence.
- [Location details](./location-detail.md) covers a selected location's details and favorite action.
- [Admin login](./admin-login.md) covers the public login form and authenticated admin entry when backend auth is configured.