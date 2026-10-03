# Location details

A visitor opens a saved shooting location to review its information and toggle it in favorites.

## Sub-features

- A location route shows the location name and details fetched from the backend.
- The favorite button adds or removes that location in browser storage.
- Breadcrumb links return to home or favorites.

## How to get to it (user POV)

- From the saved-location list, activate `詳細` for a location.
- Open a location directly at `/location/<locationId>`.
- Use the breadcrumb links to return to `ホーム` or `お気に入り`.

## Driving it with OMP Chromium

Preconditions:
- The backend must return the selected location from `GET /api/locations`; use a location that exists in the test database.
- Open the location from `/favorites` using its visible `詳細` button. Direct route navigation is a separate deep-link entry point and should be recorded separately.

- Load: confirm the location heading, prefecture, and its returned detail fields are visible; record the request and response status.
- Favorite toggle: activate the favorite control. Confirm its label/state changes and verify the expected entry appears in `fuji-calendar-favorites` localStorage.
- Breadcrumb: activate `お気に入り` and confirm `/favorites` loads. Use browser back and forward and confirm the expected route/content returns.

## Gotchas

- The page depends on a location ID supplied by the real backend. A missing record is not a successful detail-page result.
- Do not run the toggle against a user's existing browser profile. Verify the localStorage change in an isolated profile and restore disposable state by closing that profile.