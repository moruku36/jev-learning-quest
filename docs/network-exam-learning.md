# NW learning scope and preservation

## Repository and production mapping

Vercel deployment `dpl_Du1kY9sKHLVuGyAS8moS9pizhiTb` has alias
`todays-learning-quest.vercel.app`, GitHub repository `moruku36/jev-learning-quest`,
branch `main`, commit `2aa6f4c401f22f07b1f2cb4ca91b0efcaa7ec656`.
This change was developed in an independent clone and feature branch.

## Shipped exercise workflow

The catalog includes 2021–2025 spring sessions. Every year contains 30 common
morning I questions, 25 NW morning II questions, 3 afternoon I large questions and
2 afternoon II large questions: 300 units in total. A written unit means the whole
large question, including its subquestions. The exam selects 2 of 3 afternoon I
questions and 1 of 2 afternoon II questions; catalog progress covers all units.

Users select year, part and state, read the original IPA question/choices/figures
as local lossless WebP scans inside the exercise, and open an image to enlarge it.
Morning: 275 choice questions use the visually verified official key, and the
server recomputes correctness independently of the client. Afternoon: all 25
large questions include every original problem page, numbered sections and
subquestions, answer fields, official answer images/text and explicit self-grades.
The 307 response units include three invalid subquestions; 304 are assessable.
Multiple lettered blanks inside a subquestion are answered in the same field.
Afternoon self-assessment is not the official exam score; no numeric exam mark
is invented. 2024 afternoon II Q2 section 5(1)–(3) is shown but excluded because
IPA states the questions do not hold due to a defect. 2023 afternoon II Q1's
answer spans two physical PDF pages, both included.

Structured answers and scores are added to existing history records; the latest
attempt defines progress. Wrong answers can be retried with the original question
restored. Answers and per-subquestion assessments can be inspected in Review.
Each part has its own denominator; next-question navigation stays in the part.
No 2026 actual papers or 2027 support is claimed.

## Data preservation

- No database schema/RLS migration, user-row update, storage migration or ID rename.
- New built-in IDs are `exam:nw-<session>-<part>-<number>`; legacy IDs are unchanged.
- Removing registration forms and feed-add buttons affects UI only. The existing
  registered-items API stays available to management workflows and backups.
- Existing registered materials still appear in Learn and remain quest candidates.
- Existing AP/SC quizzes, SC written papers, reports, reading IDs, histories,
  offline quiz state and backup interfaces remain available.
- Reading catalogs, weekly CI rotation, updater state and credentials are untouched.
- Tests use temporary data. Production data was never mutated during verification.

## Source and rights handling

The five official annual source pages are stored in `lib/content/nw-sources.json`
alongside 40 verified problem/answer PDF URLs and their actual PDF page counts.
All 40 official files were downloaded, parsed and rendered on 2026-10-06 JST.
`scripts/nw-import/sources.json` records URLs, physical page counts and PDF SHA256.
The reviewed import manifest records exact morning crop coordinates and afternoon
page ranges. OCR was used only to locate and check pages, never as displayed
question text; original text, options and diagrams remain scanned pixels.
`nw-content.json` stores question metadata and image hashes. Every question links
to its own `nw-source.html?id=...` attribution page with year/session/exam/part/Q,
question/answer physical pages, IPA original URLs and the modification notice.

The official [IPA site usage policy](https://www.ipa.go.jp/siteinfo.html) permits
attributed reuse subject to individual restrictions and third-party rights.
IPA-origin educational question content is reproduced with attribution; the
modification notice identifies rendering and morning margin cropping. Original
content is not rewritten. No external site is embedded in an iframe. The
[nw-siken reference](https://www.nw-siken.com/nwkakomon.php) stays an external link;
no secondary explanations or images were copied. No distinct third-party source
notice was identified in the rendered/OCR-assisted question review; new imports
must check such notices and externally reference restricted material.

To rebuild the checked set, use `python scripts/nw-import/import.py --pdf-dir ...`
with Pillow and official Poppler. Missing PDFs come only from recorded IPA URLs;
a changed PDF hash stops import for renewed review. The importer uses the curated
manifest and does not guess question numbering, answer keys or new years.
Update `nw-citations.json` with metadata when source records change.

## Validation

`npm test` covers legacy workflows and updater behavior plus `test_network_exams.js`
(300 stable IDs, 503 image hashes/decoding, all 275 keys and all four choices,
307 afternoon response units/3 exclusions, four-part save/retry, source recovery,
legacy data preservation and backup round trip).
This vanilla Node/HTML/JS project has no build or TypeScript/typecheck command;
syntax checks and server/browser validation are the applicable checks.
The optional Claude SDK tests require dependencies; no Claude implementation was
changed. Browser checks use port 43127 and a separate `LQ_DATA_DIR`.

The QA ledger is `docs/nw-content-qa.md`. Publish/merge is outside this draft PR.
