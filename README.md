# Prayer Rule — Final Serene PWA

A premium Orthodox prayer rule Progressive Web App with a cleaner app-style Home screen, offline support, guided page-by-page prayer, Spotlight search, favorites, personal intercessions, rule presets, dynamic prayer planning, season mode, and liquid-glass controls.

## Smart prayer release

- Added intention-aware offline search for needs such as anxiety, study, grief, illness, confession, travel, and guidance.
- Added coherent duration targets of approximately 5, 10, 20, or 40 minutes.
- Added dedicated Before Communion and After Communion screens with full and shorter forms.
- Communion progress and long-prayer reading position are remembered locally.
- Added recently opened prayers to Home and Search.
- Added structured styling for odes, kontakia, ikoi, troparia, refrains, and rubrics.
- Added source and OCR-status information to prayer details.
- The screen stays awake while the guided reader is open when the browser supports Wake Lock.
- Search focus, mobile progress, navigation return position, and settings behavior were corrected.
- Offline cache updated to `v25-smart-prayer`.

## Final serene polish

- Split and cleaned the Jordanville prayer book text into individual prayers, canons, akathists, hymns, and Communion texts.
- Integrated the Jordanville entries into the existing Library shelves instead of keeping them in a separate section.
- Added metadata and a dynamic planner so standard and extended rules choose coherent prayers by day, office, season, style, length, source, and recent use.
- Added rule presets for common prayer shapes, including Quiet Morning, Evening Repentance, Busy Day, Jordanville Full, Before Communion, After Communion, Lenten Rule, and Theotokos & Intercession.
- Incorporated selected Jordanville prayers into dynamic morning/evening rules, daily rotations, quick prayers, and communion preparation/thanksgiving modes.
- Added rule styles: Balanced, More Jordanville, More Penitential, More Theotokos, and More Intercession.
- Rebuilt Home around one centered main prayer window.
- Kept the main action extremely simple: `Pray` or `Resume Prayer` only when real progress exists.
- Moved Quick Prayers, Find a Prayer, Random Prayer, and Prayer of the Day below the fold so the opening screen feels calmer.
- Season mode still changes the prayer selection, but no longer changes the background or overrides dark/light appearance.
- Preserved the bottom dock, centered Spotlight, guided reader, shelves, quick prayers, personal names, and liquid-glass sliders.
- Offline cache updated to `v22-rule-presets`.

## Deploy

Upload the contents of this folder to the root of your GitHub Pages repository, replacing the previous version. If iOS keeps an old copy, refresh twice in Safari or remove and re-add the Home Screen app.
