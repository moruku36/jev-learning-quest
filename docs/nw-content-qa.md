# NW content QA ledger

Checked 2026-10-06 JST (2026-10-05 UTC), against downloaded official IPA PDFs.

- 40 PDFs: URLs, actual page counts and SHA256 recorded in `scripts/nw-import/sources.json`.
- 275 morning questions: all printed question numbers and physical page assignments visually checked on 10 booklet-label sheets. All 275 keys visually compared with the 10 original key tables (5 annual sheets). Two scan-only tables were transcribed directly from their images; eight tables used PDF text extraction followed by visual comparison. Reviewed strings are in `morning-keys.json` and checked in tests.
- 25 afternoon question start headers: visually checked against question IDs and physical pages. Full consecutive page ranges preserve context, figures, word limits, section text and answer groups. Section labels on question-page contact sheets were cross-checked with all 25 official answer tables (26 physical answer pages); continuation page for 2023 pm2 Q1 is included. OCR is imperfect, so it does not supply user-visible question text or determine keys.
- 307 response units: three invalid 2024 pm2 Q2 section 5 subquestions are shown and excluded; 304 units accept responses. Unnumbered sections and multiple blanks are represented as one response field per section/subquestion. Table below records section:response-count.
- 503 unique lossless WebP assets: all decoded, nonblank and at least 900 px wide. Every morning crop's top/bottom 3 rows was checked for ink. Two cut-edge candidates (2021 am2 Q14/Q20) were inspected and extended to include the full last choice. Final edge exceptions: zero. Question and answer hashes are regression checked.
- Original files were rendered with official Poppler `pdftoppm -scale-to 1800 -png`, then losslessly encoded/cropped with Pillow. Body content is not rewritten. Exact crop coordinates are in the curated import manifest.
- OCR-assisted search for separate source/reproduction/copyright notices found no matches. This is not a legal conclusion about every symbol; attributed IPA reuse remains subject to individual and third-party restrictions. No secondary-site explanations were imported.
- Browser: morning wrong answer, correct retry and resolution; afternoon incomplete-answer rejection, all 9 response fields and 8/9 self-assessment save; source attribution page and invalid-subquestion notice. Mobile breakpoint verified at innerWidth 390 with body scrollWidth 375 and loaded original image. Desktop image and choices inspected. No live user data was used.
- `npm test`: legacy workflows, weekly reading rotation, source/key/image integrity, server marking independent of claimed client correctness, complete/unique afternoon answers, invalid exclusions, four-part history/retry, preservation and backup round trip. JavaScript syntax checked. No TypeScript/build script exists. Optional local Claude-SDK tests are skipped when that dependency is absent; CI installs dependencies.

## Afternoon inventory

| Year | Part | Q | Question physical pages | Answer physical pages | Section:response count |
|---|---|---|---|---|---|
| 2025 | pm1 | 1 | 3–7 | 1 | 1:4, 2:5 |
| 2025 | pm1 | 2 | 8–14 | 2 | 1:2, 2:4, 3:3 |
| 2025 | pm1 | 3 | 15–20 | 3 | 1:5, 2:2, 3:5 |
| 2025 | pm2 | 1 | 3–14 | 1 | 1:1, 2:6, 3:3, 4:8 |
| 2025 | pm2 | 2 | 15–25 | 2 | 1:1, 2:1, 3:6, 4:6 |
| 2024 | pm1 | 1 | 3–8 | 1 | 1:3, 2:4, 3:2 |
| 2024 | pm1 | 2 | 9–15 | 2 | 1:1, 2:2, 3:2, 4:2, 5:2 |
| 2024 | pm1 | 3 | 16–21 | 3 | 1:6, 2:5, 3:2 |
| 2024 | pm2 | 1 | 3–13 | 1 | 1:3, 2:5, 3:3, 4:5 |
| 2024 | pm2 | 2 | 14–23 | 2 | 1:5, 2:3, 3:3, 4:4, 5:3 |
| 2023 | pm1 | 1 | 2–7 | 1 | 1:1, 2:2, 3:2, 4:2 |
| 2023 | pm1 | 2 | 8–13 | 2 | 1:1, 2:3, 3:3, 4:2 |
| 2023 | pm1 | 3 | 14–19 | 3 | 1:1, 2:2, 3:3 |
| 2023 | pm2 | 1 | 2–11 | 1,2 | 1:5, 2:7, 3:4 |
| 2023 | pm2 | 2 | 12–22 | 3 | 1:1, 2:2, 3:3, 4:5, 5:3, 6:4 |
| 2022 | pm1 | 1 | 3–8 | 1 | 1:2, 2:3, 3:5 |
| 2022 | pm1 | 2 | 9–14 | 2 | 1:6, 2:2, 3:2 |
| 2022 | pm1 | 3 | 15–20 | 3 | 1:4, 2:3, 3:3 |
| 2022 | pm2 | 1 | 2–12 | 1 | 1:1, 2:2, 3:6, 4:2, 5:5 |
| 2022 | pm2 | 2 | 13–24 | 2 | 1:3, 2:4, 3:2, 4:3, 5:4 |
| 2021 | pm1 | 1 | 2–7 | 1 | 1:3, 2:4, 3:4 |
| 2021 | pm1 | 2 | 8–13 | 2 | 1:1, 2:1, 3:4, 4:3 |
| 2021 | pm1 | 3 | 14–18 | 3 | 1:1, 2:2, 3:2, 4:5 |
| 2021 | pm2 | 1 | 2–13 | 1 | 1:2, 2:2, 3:2, 4:2, 5:1, 6:8 |
| 2021 | pm2 | 2 | 14–25 | 2 | 1:3, 2:5, 3:4, 4:3 |
