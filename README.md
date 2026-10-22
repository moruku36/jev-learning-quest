# Jev Learning Quest

[English](README.md) | [日本語](README.ja.md)

A learning web app where the decision AI **Jev** picks one task from your available time and mood, then judges your understanding and whether a review is needed. It covers Network Specialist and Registered Information Security Specialist exam preparation and AWS study (Cloud Practitioner, SAA, SAP).

The former AI, cloud and security reading fields are archived: their data is kept, but they no longer appear in the app. AWS questions are online-only (not part of the offline question cache). See [AWS courses and field cleanup](docs/aws-courses.md).

**Live app:** <https://todays-learning-quest.vercel.app/>

**Contents:** [Learning flow](#learning-flow) · [What it covers](#what-it-covers) · [Runtime choices](#runtime-choices) · [Architecture](#architecture) · [Repository layout](#repository-layout) · [Development](#development) · [Documentation](#documentation)

## Learning flow

Choose available time and mood, receive one quest, answer and self-assess, then let Jev judge understanding and whether review is needed.

- **Recall, then reveal.** Quiz cards and Network morning questions use "see the question → Show answer → remembered / not remembered". Revealing alone never counts as correct, and the app never advances on its own.
- **Practice vs. record.** After a session you can retry only the mistakes as unsaved practice; your first result and scheduled review stay intact.
- **Interruptions are safe.** Unsaved answers survive failed saves and offline periods and are sent when you are back online.
- **Network originals** have in-page zoom, scrolling and page controls.

Details, scope and validation: [memorization UI notes](docs/memorization-ui.md).

## What it covers

| Area | Content |
| --- | --- |
| Network Specialist (2021–2025 spring) | 275 morning questions marked automatically; 25 complete afternoon questions with per-subquestion answers and self-assessment. Original IPA text, choices and diagrams are shown as attributed scans. See [implementation and sources](docs/network-exam-learning.md) and [content QA](docs/nw-content-qa.md). |
| Information Security Specialist | Morning I/II one-question-one-answer decks (original questions from past-exam themes) and afternoon / Subject B links to the official IPA PDFs, with keyword matching and optional Claude feedback. |
| AWS | Original Japanese questions grounded in official AWS documentation: CLF-C02 (39), SAA-C03 (34), SAP-C02 (30), each with domain, explanation, source URL and check date. Not official exam questions. See [AWS courses](docs/aws-courses.md). |

Explanations missing from the source materials are labelled as unavailable; answers are never guessed. AP/SC practice choices are generated from other cards' answers, not IPA's original choices.

## Runtime choices

| Mode | Runtime | Authentication | Storage |
| --- | --- | --- | --- |
| Cloud | Vercel and Supabase | GitHub login and allowlist | Per-user Supabase Postgres data (RLS) |
| Local | Your PC with `npm start` | None; listens on 127.0.0.1 | `data/store.json` |

Configure `JEV_API_KEY` through the documented environment/settings path. The [Japanese guide](README.ja.md) holds the full setup, cloud configuration, security design and operating details.

## Architecture

![System architecture](docs/diagrams/system-architecture.svg)

More diagrams (code structure, login-to-quest sequence, recall flow, field scope, CI and deploy): [docs/architecture.md](docs/architecture.md). Sources live in `docs/diagrams/*.mmd` and are rendered to SVG with [Pele](https://pele.run).

## Repository layout

| Path | Purpose |
| --- | --- |
| [api/](api) | Vercel Function entry (`/api/*`) |
| [lib/](lib) | API routing, quest engine, quiz logic, storage, security headers; [lib/content/](lib/content) holds the bundled study material |
| [public/](public) | Front end (served from the CDN on Vercel), PWA files, Network exam assets |
| [data/](data) | Local-mode data |
| [scripts/](scripts) | Weekly update of the archived reading data, Network import, diagram rendering |
| [supabase/](supabase) | Tables and RLS policies |
| [docs/](docs) | Documentation and diagram sources |

## Development

```bash
npm run check   # syntax checks
npm test        # six test_*.js scripts with mocked Jev, Supabase, Claude and RSS
```

There is no build or lint command. CI (`.github/workflows/test.yml`) runs both on every PR and push to `main`.

## Documentation

See the [documentation index](docs/README.md). Notable pages: [architecture diagrams](docs/architecture.md), [AWS courses](docs/aws-courses.md), [memorization UI](docs/memorization-ui.md), [Network exam learning](docs/network-exam-learning.md), [weekly reading refresh notes](docs/weekly-reading-updates.md) (stopped on 2026-10-22; archived fields only).
