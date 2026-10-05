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

Users select year, part and state, open the original IPA booklet in another tab,
write an answer, compare the official answer and explicitly self-grade, then save.
Results use existing history/review APIs. Wrong answers can be retried with the
original question and answer links restored. The latest attempt defines current
progress. Each part has a separate denominator; no partial section is reported as
completion of all five years. Next-question navigation stays in the selected part.

**This is an external-PDF exercise workflow, not a completed inline question bank.**
Inline text/diagrams, verified per-question PDF pages, official morning answer
keys/automatic marking and third-party content clearance remain future work.
The UI explicitly states these limits. Self-grading, keyword matches and AI
feedback are not official exam scores. No 2026 actual papers or 2027 support is
claimed.

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
All 40 files were downloaded and opened with PDF.js on 2026-10-06 (JST;
2026-10-05 UTC). Many question booklets are image PDFs: text extraction cannot
establish per-question pages or prove absence of third-party notices. Consequently
`pdfPage` is deliberately null and the originals are neither embedded nor copied.
The catalog retains year, spring session, exam, part, number, source URL, check
date and modification/reference policy on every unit.

Official references:

- [IPA site usage](https://www.ipa.go.jp/siteinfo.html): external navigation with
  the original address visible; no iframe incorporation.
- [IPA exam FAQ](https://www.ipa.go.jp/shiken/faq.html): consult the current reuse
  guidance before importing original text; this PR reproduces no questions,
  diagrams, answer examples or third-party commentary.
- [2026 exam periods](https://www.ipa.go.jp/shiken/2026/ap_koudo_sc_kikan.html):
  upcoming CBT information is separate from the 2021–2025 papers.
- [NW exam practice reference](https://www.nw-siken.com/nwkakomon.php): a single
  external reference link. No crawling, copied explanations or copied images.

Before inline import: inspect every relevant PDF page and notice visually, exclude
or externally reference third-party material, record exact PDF pages and review
dates, verify morning keys against originals, state any modifications, and avoid
large-scale reproduction of the secondary site's explanations. Content should be
supplied via reviewed repository/CI updates, not a learner registration screen.

## Validation

`npm test` covers legacy workflows and updater behavior plus `test_network_exams.js`
(all years/parts, 300 stable IDs, four-part save/retry, source recovery, latest
attempt state, legacy data preservation and backup round trip).
This vanilla Node/HTML/JS project has no build or TypeScript/typecheck command;
syntax checks and server/browser validation are the applicable checks.
The optional Claude SDK tests require dependencies; no Claude implementation was
changed. Browser checks use port 43127 and a separate `LQ_DATA_DIR`.

Publish/merge is intentionally outside this draft PR. Review the limits above
before deciding whether external-PDF exercises satisfy the intended study UX or
whether inline content must be completed in a follow-up.
