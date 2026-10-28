# Lesson Ledger

A mobile-first static web app for tracking group lessons and splitting their cost.
Everything runs in the browser; data lives in `localStorage`. No build step, no dependencies.

## Features

- **Data setup** — paste the student list (`name  subject1,subject2`) and the lesson schedule
  (`subject  weekday  18:30-20:00`) straight from a spreadsheet. Parse errors and roster
  warnings are shown live.
- **Registration** — one tap registers a whole lesson week. Dates default to the lesson week in
  progress (or the next one not yet registered) and can be changed per weekday or per subject,
  e.g. for holiday rescheduling. All enrolled students are present by default; tap a name to
  mark leave.
- **Fees** — each lesson (default 1500, configurable) is split evenly among the students who
  actually attended.
- **Views** — students with their subjects, schedule and fee totals, enrolment per subject,
  and a session list with editable details.
- **Backup** — export all data as JSON and restore it later.
- **Installable PWA** — can be added to the phone home screen and works offline.

## Running locally

ES modules and the locale file are loaded over HTTP, so open the app through a local server
rather than `file://`:

```sh
npm run serve        # python3 -m http.server 8000
# open http://localhost:8000
```

## PWA

- `locales/zh-CN.webmanifest` is the web app manifest. It lives with the locale because it
  contains the app name; its paths are relative to the manifest (`../`).
- `sw.js` precaches every app file and serves requests network-first, falling back to the cache
  offline, so a deploy shows up on the next online launch without bumping the cache name.
  When adding or removing a file, update the `ASSETS` list in `sw.js` (a test enforces this).
- Icons are rendered from `icons/icon.svg`.

## Tests

```sh
npm test             # node --test, requires Node 20+
```

Tests cover the parsers, date defaults, fee splitting, backup validation, that every
literal i18n key used in the source exists in the locale file, and that the service worker
precache list matches the app files.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The app is served at `https://<user>.github.io/<repo>/`.

`.nojekyll` disables Jekyll processing so files are served as-is.

## Project layout

```
index.html          app shell and tab bar
sw.js               service worker (offline cache)
css/style.css       mobile-first styles (light/dark)
icons/              app icons (icon.svg is the source)
locales/zh-CN.json  all UI text
locales/zh-CN.webmanifest  web app manifest
js/app.js           entry point and hash router
js/i18n.js          locale loading and t()
js/store.js         data model, localStorage, backup validation
js/parse.js         pasted-text parsers
js/dates.js         lesson-week date helpers
js/fees.js          fee split and totals
js/format.js        locale-aware formatting helpers
js/views/           one module per page
tests/              node:test unit tests
```

## Internationalization

UI text is never hard-coded: HTML uses `data-i18n` attributes and JS calls `t(key, params)`.
Parsers and the store return error codes that views translate. To add a language, copy
`locales/zh-CN.json` to e.g. `locales/en.json`, translate the values (including `weekdays`,
`weekdayAliases` and `parse.headerKeywords`), add a matching `.webmanifest`, and set `settings.lang` accordingly (there is no language switcher yet; edit it in an exported backup and re-import).

## Data format

Stored under the `localStorage` key `lesson-ledger:v1` and used as the backup format:

```js
{
  version: 1,
  settings: { defaultFee: 1500, lang: "zh-CN" },
  students: [{ name, subjects: [subjectName] }],
  subjects: [{ name, weekday /* 0 = Sunday */, time: "18:30-20:00" }],
  sessions: [{ id, batchId, subject, date: "YYYY-MM-DD", time, fee,
               attendees: [name], absentees: [name], createdAt }]
}
```

Sessions keep a snapshot of who attended, so editing the roster later does not change past fees.
