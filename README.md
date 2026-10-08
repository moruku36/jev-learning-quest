# Jev Learning Quest

[English](README.md) | [日本語](README.ja.md)

A learning web application where Jev selects one task based on available time and mood, then evaluates understanding and review needs. It supports security-exam preparation and AI, cloud, and security catch-up.

## Learning flow

Choose available time and mood, receive one quest, answer and self-assess, then let Jev judge understanding and whether review is needed.

Answers stay visible until you choose Next. After a session, retry only the mistakes as unsaved practice; your first result and scheduled review remain intact. Network originals have in-page zoom, scrolling and page controls, and morning answers show the official key before and after saving. See the [memorization UI notes](docs/memorization-ui.md) for scope, limitations and validation.

## Runtime choices

| Mode | Runtime | Authentication | Storage |
| --- | --- | --- | --- |
| Cloud | Vercel and Supabase | GitHub login and allowlist | Per-user Supabase Postgres data |
| Local | Your PC with `npm start` | None; listens on 127.0.0.1 | data/store.json |

[Published app](https://todays-learning-quest.vercel.app/). Configure `JEV_API_KEY` through the documented environment/settings path. The Japanese guide retains setup, cloud configuration, and operating details.


## Contents

- [api/](api)
- [data/](data)
- [lib/](lib)
- [public/](public)
- [scripts/](scripts)
- [supabase/](supabase)

## Detailed documentation

The [Japanese guide](README.ja.md) retains the complete original setup instructions, configuration, examples, project status, and limitations. See the [weekly reading refresh notes](docs/weekly-reading-updates.md) for Japanese and English details on source quality, replacement counts, and failure handling.

## Network Specialist past exams

The 2021–2025 spring catalog includes 275 automatically marked morning questions and 25 complete afternoon questions with per-subquestion answers and self-assessment. Original IPA text/choices/diagrams are displayed as attributed scans. Existing materials, history and reading CI are preserved. See [implementation and sources](docs/network-exam-learning.md) and [content QA](docs/nw-content-qa.md).

## Memorization UI validation and limits

[PR #13](https://github.com/moruku36/jev-learning-quest/pull/13) passed the existing four test scripts, syntax checks, and real Chromium learning flows at 375px and 1280px, including failed saves, offline queues and practice preserving history. [CI and screen evidence](https://github.com/moruku36/jev-learning-quest/actions/runs/37778588830) are available. There is no configured build or lint command.

Explanations absent from the source materials are labelled as unavailable; answers are not guessed. AP/SC practice choices are generated from other card answers rather than IPA's original choices. Cloud authentication, RLS, credentials and storage formats are unchanged. Production alias/asset verification still needs access: the merge commit's Vercel check succeeded, but the connected Vercel account could not inspect the project.
