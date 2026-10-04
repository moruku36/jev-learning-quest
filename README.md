# Jev Learning Quest

[English](README.md) | [日本語](README.ja.md)

A learning web application where Jev selects one task based on available time and mood, then evaluates understanding and review needs. It supports security-exam preparation and AI, cloud, and security catch-up.

## Learning flow

Choose available time and mood, receive one quest, answer and self-assess, then let Jev judge understanding and whether review is needed.

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
