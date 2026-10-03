# Favorites

Visitors can review saved Fuji events and locations, switch between upcoming, past, and saved-location tabs, and import or export their favorites. The data is stored in the browser's local storage.

## Sub-features

- Upcoming and past event tabs show saved events grouped by event time.
- Saved locations can be reviewed separately.
- JSON import replaces the stored favorites collection; export downloads the stored JSON.
- Saved data persists across reloads in the same browser profile.

## How to get to it (user POV)

- Open the `お気に入り` navigation link or visit `/favorites` directly.
- To create fixture data, use the page's `インポート` action and paste the sample below; this is a real UI import, not direct storage seeding.
- Switch tabs with `今後のイベント`, `過去のイベント`, or `保存地点`.

## Driving it with OMP Chromium

Preconditions:
- Open `/favorites` in a fresh dedicated browser profile; this route can be exercised without the API.
- Through the visible `インポート` button, paste this valid favorite-location fixture and submit:
  `{"locations":[{"id":71001,"name":"検証用スポット","prefecture":"山梨県","latitude":35.5,"longitude":138.8,"addedAt":"2026-01-01T00:00:00.000Z"}],"events":[]}`

- Import: activate `インポート`, enter the JSON in the labeled paste textarea, then activate the dialog's `インポート` button. Confirm the success alert, dialog close, saved-location count, and visible `検証用スポット` row.
- Persistence: reload `/favorites`. Confirm the saved-location count and row remain; read `fuji-calendar-favorites` from this isolated tab's localStorage and preserve the resulting value as side-effect evidence.
- Saved-location tab: select `保存地点 (1)` and confirm the same spot and its prefecture/coordinates appear.
- Export: activate `エクスポート`, wait for the JSON download, and compare its parsed `locations` data to the imported record. Preserve the download with the run evidence.
- Cleanup: use the UI to import `{"locations":[],"events":[]}` or discard the dedicated browser profile. Never clear another profile's data.

## Gotchas

- Use the current OMP browser file-download mechanism to capture the downloaded JSON; do not assert only that the export click did not throw.
- Each app tab reads and writes one `fuji-calendar-favorites` key. Do not run parallel checks against the same browser profile.
- `events: []` avoids time-dependent upcoming/past ordering; event-tab content still requires valid event fixtures and should not be claimed verified by this location-only recipe.