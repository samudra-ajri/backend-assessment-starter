# Backend Assessment — Starter Repo

Welcome, and thanks for taking the time. This should take about **2 hours — please don't go over.** We're testing judgment under time pressure, not stamina.

> **You do NOT need any cloud account or external services.** Everything runs locally with Node.js and a local SQLite file. This is a code review and fix task.

## The situation

This repo is a small REST API (Express + TypeScript, SQLite for storage) for users and their notes. It **runs** — but it was put together carelessly by someone in a hurry. Your job is to review it like a senior engineer reviewing a colleague's pull request: find what's wrong, fix what matters most, and clearly explain the rest.

## Running it

```
npm install
npm start        # starts the API on http://localhost:3000
npm test         # runs the test suite
```

Endpoints: `POST /auth/login`, `POST /users/register`, `GET /notes`, `GET /notes/:id`, `POST /notes`.
Seeded users: `alice@example.com` / `password1` and `bob@example.com` / `password2`.

## What's here

```
src/
  index.ts     App bootstrap, middleware, error handling.
  config.ts    Configuration.
  db.ts        SQLite setup, password hashing, seed data.
  auth.ts      Login + auth middleware.
  users.ts     Registration.
  notes.ts     Notes CRUD.
tests/         The (minimal) test suite.
```

## What to do (top-down, by priority)

1. **`REVIEW.md` first (~30 min).** Write up the issues you'd flag in a PR: *what's wrong, why it matters, the fix,* and a priority (blocker / should-fix / nice-to-have). This is the most important deliverable.
2. **Fix the highest-impact issues (~75 min).** You won't have time for everything — fix what most reduces real risk, and leave the rest documented in `REVIEW.md`. Choosing well *is* the test. If you improve a behavior, add or update a test to prove it.
3. **One paragraph (~15 min)** in `REVIEW.md`: if this API were going to production tomorrow, what are the top three things you'd insist on first, and why?

## Show your work

Please include in `REVIEW.md`:
- The output of `npm test` after your changes.
- A short note on anything you'd have done with more time.

## Submitting

Push your branch (or send a patch) plus `REVIEW.md`. In the follow-up interview we'll screen-share your work and ask you to walk through your reasoning live — and possibly make a small change on the spot — so make sure the decisions are genuinely yours.

Good luck — and remember, a focused fix of the riskiest few things with a clear writeup beats a rushed attempt to fix everything.
