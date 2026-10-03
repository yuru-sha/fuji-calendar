# Monthly calendar and event selection

The home page shows a month calendar. A visitor can move between months and select a date to see that day's Fuji events, map, filters, and camera controls.

## Sub-features

- Month navigation changes the displayed month and reloads that month's API data.
- Date selection loads that day's events and reveals related map and controls.
- URL date parameters select a date when opening the home page from a shared/favorite event path.

## How to get to it (user POV)

- Open the home page from the `ホーム` navigation link or directly at `/`.
- Use the left/right month controls in the calendar header.
- Select a calendar day.

## Driving it with OMP Chromium

Preconditions:
- Follow the skill Doctor. The backend at `http://localhost:3001/api` must serve real calendar and location data; do not mock it.
- Open `http://127.0.0.1:3000/` in the run's dedicated Chromium tab.

- Initial month: wait for a heading matching `<year>年<month>月`; capture the calendar and confirm day-of-week headings and date buttons are visible.
- Month navigation: activate the calendar header's next-month control using its observed button. Confirm the month heading advances by one month, including year rollover where applicable, and verify the corresponding calendar API request completed successfully.
- Date selection: select a day with an event indicator. Confirm its details and map/control sections appear, inspect the visible event date/location, and record successful day-events/network evidence.
- Deep link: navigate to `/?date=<valid-date>` and confirm the selected day/event state agrees with the URL date. Record URL and browser back/forward behavior if navigation changes history.

## Gotchas

- The client API base is `http://localhost:3001/api`; Vite's proxy does not prove those client calls use it.
- Without API data the calendar can remain at its loading state; that is an unmet backend precondition, not a successful empty calendar.
- Calendar date buttons may be unnamed by date; inspect their rendered accessible tree and use a date-associated visible label rather than positional selectors.