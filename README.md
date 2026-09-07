# Prayer Rule

An Orthodox prayer book for daily use on iPhone, with a complete local library and a quiet, book-inspired interface. Hosted as static files on GitHub Pages; no App Store listing, account, build process, or paid API is required for the core app.

## Install on iPhone

1. Open https://scentsofhome.github.io/prayer-companion/ in Safari.
2. Choose Share → Add to Home Screen. Enable **Open as Web App** if offered.
3. Launch the new icon while connected. Wait for **Prayer book saved for offline use**.
4. Switch on airplane mode and reopen the app to check installation on your phone.

After an upgrade from the old app, load the page while connected. If an update is offered, choose **Update now**. If the old app is still open in another window, close that window and reopen. Do not delete the Home Screen app or clear website data to update it.

## Offline architecture

- `service-worker.js` atomically downloads all 31 required documents, scripts, data files, Psalm fragments, and icons. Installation fails if any required file cannot be downloaded.
- Navigation and core assets come directly from the installed release's cache, without waiting for the network.
- Readiness is verified against every required cached file by the active worker. It is never inferred from `navigator.onLine`.
- Updates download in the background and wait for explicit activation or for all older windows to close. The update prompt is hidden during prayer. An unsuccessful install preserves the working release.
- Settings includes a download/update check and can repair missing cached files when the matching release remains available online.
- Favourites, reading positions, prayer rules, and remembered names live only in browser storage. Existing storage keys are retained, and legacy formats are read when needed.
- Saved daily rules include their exact sequence, first-prayer progress, and date. Position is saved on scrolling, closing, page hiding, and app suspension.
- The complete existing prayer-library text is bundled. Appointed Psalm entries that were references in the original book remain references to a separate Psalter; external source links are not downloaded.
- AI guidance and fresh GOARCH calendar information are optional online features. Today's fetched calendar record is retained locally for that date; it is never presented as a different day's record. The on-device prayer planner can still tailor a rule offline.

Browser storage is not a permanent backup: the user or operating system can clear it. **Settings → Save backup** exports favourites, names, settings, history, and reading progress as JSON. **Restore backup** validates the whole file and shows a confirmation before replacing data. The backup is not uploaded to a server. On iPhone, choose **Save to Files** from the share sheet.

## Design

Warm ivory and charcoal surfaces, burgundy and antique-gold accents, serif prayer text, readable controls, and three primary destinations: Today, Prayer Library, Settings. The reader has stable navigation, an accessible progress indicator, text-size controls, and Auto/Light/Dark appearance. Browser zoom is enabled.

## Development and release

This is a dependency-free static app. Keep the repository's directory structure intact and serve it from an HTTPS origin (localhost is also supported for development).

Before publishing changes:

```sh
node --check src/app.js
node --check src/offline.js
node --check src/backup.js
node --check service-worker.js
node --test tests/offline.test.cjs
```

The test harness uses Node's built-in VM, test runner, Request/Response implementations, and a simulated cache/network. It checks offline cache behaviour, failed installation, repair, app rendering from bundled data, exact resume, offline search, backup validation, and rollback. It does not replace testing installation, layout, touch, and airplane mode on an actual iPhone.

For each new release, update `RELEASE` in `service-worker.js`, asset query versions in `index.html`, the app's `VERSION`, and the visible version in device settings together. Never reuse a release number after publishing different asset contents. GitHub Pages deployment follows the repository's normal publishing settings.

The optional Cloudflare Worker in `workers/` is independent of the offline prayer book and is not deployed by uploading these static files.
