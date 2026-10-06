# Independent review follow-up

Reviewed findings: interrupted NW exercises displayed the previous recommendation's
hero while restarting a different question; switching from an active exercise to
another library/review question silently discarded unfinished answers.

## Changes

- Interruption now renders the current exercise as the hero and leaves the same
  object as the restart target. The message explicitly states that answers and the
  timer restart from the beginning. No persistent draft recovery is claimed.
- A shared replacement guard checks the running cards even when their navigation
  panel is hidden. NW choices, written answers/self-grades, generic answer/detail
  fields and quiz answers require confirmation before replacement. Rejecting the
  confirmation returns to the running exercise without changing its answer fields.
  Starting another NW/SC/report question, choosing a candidate, quiz startup and
  incoming recommendations all use this guard. In-flight saves cannot be replaced.
- Recommendation/quiz request generations prevent late responses from replacing
  a newly selected exercise. Separate NW mount generations stop stale content loads
  from recreating fields after a subsequent start.
- Official afternoon answer images now have keyboard-accessible enlargement links.
  Each textual answer disclosure is labelled with its section/subquestion.
- The question-image reading limitation is stated in the exam UI. All 20 original
  question PDFs yielded zero extracted body text in the inspected PDF text data;
  uncorrected OCR is not presented as reliable accessible question text. Previously
  verified official answer text remains available per response field.

## Validation and remaining checks

`test_run_transitions.js` loads the actual frontend in an isolated VM with a small
DOM fixture. It checks native-confirm return branches at code level: cancellation
retains answers/timer; accepted interruption renders the same restart question;
rejected NW/quiz/recommendation/candidate switches preserve answers; accepted NW
switches replace them; stale replies and saves cannot overwrite an exercise. It is
included in `npm test` together with the legacy, reading and NW data tests.

This is code-only regression evidence, not real browser evidence. In this follow-up
no browser-control tool is exposed in the normal tool inventory. The independent
review encountered ERR_BLOCKED_BY_CLIENT. No alternate browser/address, protection
change, direct CDP connection or bypass was attempted.

**Still unverified in the real browser:** native interruption/replacement dialogs'
cancel/accept buttons; restart and retained answers after those native actions;
375px SE3 morning/afternoon exercise → save → review; long-answer entry, afternoon
answer enlargement and page navigation at that width. The earlier 390px screenshots
are evidence for that width only. These checks remain required before approval.
Image-based question body reading is still not screen-reader accessible.

The independent reviewer matched all 40 official PDF hashes/page counts, 503 image
pixel contents, 275 morning keys, 25 afternoon question structures and three invalid
subquestions against head 44a6a4d. This follow-up changes no question assets, source
metadata, answer keys, user data, storage schema or periodic reading workflow.

Draft PR remains unmerged and production publication remains on hold.
