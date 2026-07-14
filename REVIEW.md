# REVIEW.md — Code Review & Fixes

## Issues Found

### Blocker

| # | Issue | File(s) | What's wrong | Why it matters | Fix | Status |
|---|-------|---------|-------------|----------------|-----|--------|
| 1 | **SQL injection in login** | `src/auth.ts:11-16` | Email and hashed password are interpolated directly into SQL string via template literal. | An attacker can bypass authentication entirely (`' OR '1'='1' --`) or extract/destroy the database. This is a textbook critical vulnerability. | Replaced with parameterized query (`?` placeholders). | ✅ Fixed |
| 2 | **SQL injection in registration** | `src/users.ts:9-11` | Duplicate-email check uses string interpolation. | Same risk — an attacker can inject SQL through the email field during registration. | Replaced with parameterized query. | ✅ Fixed |
| 3 | **SQL injection in GET /notes/:id** | `src/notes.ts:21-23` | `req.params.id` interpolated directly into SQL. | Any authenticated user can extract arbitrary data or crash the database. | Replaced with parameterized query. | ✅ Fixed |
| 4 | **SQL injection in GET /notes (N+1 loop)** | `src/notes.ts:11-13` | `n.user_id` from a DB row is interpolated into another SQL query inside a loop. | While the value comes from the DB (not directly from user input), it's still bad practice and could be exploited via second-order injection if user_id values were ever tainted. | Replaced the N+1 loop with a single JOIN query using parameterized WHERE clause. | ✅ Fixed |
| 5 | **MD5 password hashing** | `src/db.ts:21-23` | Passwords are hashed with `crypto.createHash("md5")` — no salt. | MD5 is fast and unsalted, making it trivially crackable with rainbow tables or brute force. If the DB is compromised, all passwords are exposed in seconds. | Replaced with `crypto.scryptSync` with a random 16-byte salt. Passwords stored as `salt:hash`. Added `verifyPassword` using `timingSafeEqual` to prevent timing attacks. | ✅ Fixed |
| 6 | **No authorization on notes (IDOR)** | `src/notes.ts:7-25` | `GET /notes` returns ALL notes from ALL users. `GET /notes/:id` returns any note regardless of owner. | Any authenticated user can read every other user's private notes. This is a classic Insecure Direct Object Reference (IDOR) vulnerability. | `GET /notes` now filters by `req.user.userId`. `GET /notes/:id` checks ownership and returns 403 if the note belongs to another user. | ✅ Fixed |
| 7 | **JWT tokens never expire** | `src/auth.ts:23` | `jwt.sign()` is called without an `expiresIn` option. | Tokens are valid forever — if one is leaked (logs, browser history, network sniffing), the attacker has permanent access. | Added `{ expiresIn: "1h" }` to `jwt.sign()`. | ✅ Fixed |
| 8 | **Stack traces exposed to client** | `src/index.ts:17-19` | The global error handler sends `err.message` and `err.stack` in the JSON response. | Stack traces reveal internal file paths, library versions, and code structure — invaluable to an attacker. | Error handler now returns a generic `"internal server error"` message. The full error is logged server-side only with `console.error`. | ✅ Fixed |
| 9 | **Hardcoded JWT secret with insecure fallback** | `src/config.ts:2`, `.env` | The JWT secret falls back to the string `"supersecret"` if the environment variable is not set. The `.env` file with this secret is also committed to git (not in `.gitignore`). | Anyone who reads the source code (or the git history) knows the signing secret and can forge valid JWTs for any user. | Config now throws an error at startup if `JWT_SECRET` is not set (except in test mode). `.env` and `*.db` added to `.gitignore`. | ✅ Fixed |

### Should-Fix

| # | Issue | File(s) | What's wrong | Why it matters | Fix | Status |
|---|-------|---------|-------------|----------------|-----|--------|
| 10 | **No input validation** | auth, users, notes | No checks that email/password/title are present or well-formed. | Missing fields cause cryptic 500 errors or corrupt data (e.g., null email in the users table). | Added validation: email/password required on login and registration; email format and password length checks on registration; title required on note creation. | ✅ Fixed |
| 11 | **JWT token logged to console** | `src/auth.ts:24` | `console.log("issued token for", email, token)` prints the full JWT to stdout. | Logs are often stored in centralized systems, sometimes with broad access. Leaking JWTs in logs gives anyone with log access the ability to impersonate users. | Removed the `console.log` call. | ✅ Fixed |
| 12 | **N+1 query** in GET /notes | `src/notes.ts:8-15` | Fetches all notes, then queries each user individually in a loop. | Performance degrades linearly with the number of notes. With 1000 notes, that's 1001 queries for a single request. | Replaced with a single `SELECT ... JOIN` query. | ✅ Fixed |
| 13 | **No UNIQUE constraint on email** | `src/db.ts:10` | `email TEXT` without `UNIQUE`. | The application-level duplicate check has a race condition: two concurrent registrations with the same email can both succeed, creating duplicate accounts. | Added `UNIQUE NOT NULL` constraint to the email column. | ✅ Fixed |
| 14 | **CORS wide open** | `src/index.ts:11` | `cors({ origin: "*", credentials: true })` | `origin: "*"` with `credentials: true` is actually blocked by browsers (spec violation), so cookies/auth headers won't work in cross-origin requests. Even without `credentials`, `*` allows any domain to make API calls. | Removed `credentials: true` (which was non-functional with `*`). In production, `origin` should be restricted to the actual frontend domain. | ✅ Fixed |
| 15 | **`strict: false` in tsconfig** | `tsconfig.json:5` | TypeScript's strict mode is disabled. | Disabling strict mode turns off null checks, implicit-any detection, and other safety features that catch bugs at compile time. | Documented — would fix with more time, but changing it now risks introducing compilation errors across the codebase that would require additional changes. | 📝 Documented |
| 16 | **No 404 for missing note** | `src/notes.ts:20-25` | `GET /notes/:id` returns `null` with HTTP 200 when the note doesn't exist. | Clients can't distinguish "note exists but is empty" from "note doesn't exist". Violates REST conventions. | Returns 404 with `{ error: "note not found" }`. | ✅ Fixed |
| 17 | **Test suite is a placeholder** | `tests/notes.test.ts` | The only test is `expect(1 + 1).toBe(2)`. | Zero code coverage — bugs, regressions, and security issues go undetected. | Wrote 25 integration tests covering auth, registration, IDOR, SQL injection, input validation, error handling, and password hashing. | ✅ Fixed |
| 18 | **`.env` not in `.gitignore`** | `.gitignore` | The `.env` file containing `JWT_SECRET` and `ADMIN_PASSWORD` is committed to version control. | Secrets in git history are effectively public. Even if removed later, they persist in the history. | Added `.env` and `*.db` to `.gitignore`. | ✅ Fixed |
| 19 | **`app` not exported** | `src/index.ts` | The Express app is not exported, making it impossible to test with supertest without starting the server. | Integration testing requires importing the app without binding to a port. | Exported `app` and guarded `app.listen()` behind `require.main === module` check. | ✅ Fixed |

### Nice-to-Have

| # | Issue | Why it matters |
|---|-------|----------------|
| 20 | **No rate limiting** | Without rate limiting, the login endpoint is vulnerable to brute-force attacks. Should add something like `express-rate-limit`. |
| 21 | **No security headers (Helmet)** | Missing `X-Content-Type-Options`, `X-Frame-Options`, HSTS, etc. The `helmet` middleware adds these in one line. |
| 22 | **No structured logging** | `console.log`/`console.error` with no timestamp, request ID, or log level makes debugging in production painful. Should use `pino` or `winston`. |
| 23 | **No pagination on GET /notes** | As the notes table grows, returning all notes in a single response becomes a performance and usability problem. |

---

## Summary of Fixes Applied

All **9 blockers** and **8 of 10 should-fix** items were resolved:

1. **SQL injection eliminated** across all 4 vulnerable queries (auth, users, notes) by switching to parameterized queries.
2. **MD5 replaced with scrypt** — passwords are now salted with a random 16-byte salt and hashed with `crypto.scryptSync`. Verification uses `crypto.timingSafeEqual` to prevent timing attacks.
3. **IDOR fixed** — users can only see and access their own notes. Cross-user access returns 403.
4. **JWT tokens now expire** after 1 hour.
5. **Hardcoded secret removed** — the app refuses to start without a `JWT_SECRET` env var (except in test mode).
6. **Stack traces hidden** from API responses; logged server-side only.
7. **Input validation added** on all endpoints.
8. **N+1 query replaced** with a single JOIN.
9. **UNIQUE constraint** added to the email column.
10. **`.env` and `*.db` added to `.gitignore`**.
11. **25 integration tests** written covering security, auth, CRUD, and edge cases.

---

## If This API Were Going to Production Tomorrow

The **top three things I'd insist on first**:

1. **Rate limiting on authentication endpoints.** Without it, the login endpoint is an open door for brute-force attacks. Even with strong password hashing (scrypt), an attacker can overwhelm the server with thousands of login attempts per second. A simple `express-rate-limit` middleware with a sliding window (e.g., 10 attempts per minute per IP) would drastically reduce this risk with almost zero effort.

2. **HTTPS enforcement and security headers.** All API traffic must go over TLS — without it, JWT tokens and credentials travel in plaintext. Adding the `helmet` middleware sets critical headers (HSTS, X-Content-Type-Options, X-Frame-Options) that prevent common attacks like clickjacking and MIME-type sniffing. This is a one-line addition that covers a wide surface area of browser-based attacks.

3. **Proper secrets management and environment separation.** The `.env` file with real secrets should never be in the repository (even if gitignored now, the old commits still contain it — requires a `git filter-branch` or BFG to purge). Production secrets should come from a secrets manager (e.g., Vault, AWS Secrets Manager, or at minimum, environment variables set by the deployment platform). The `ADMIN_PASSWORD` in `.env` is unused and should be removed to avoid confusion.

---

## Test Output

```
> notes-api@1.0.0 test
> vitest run


 RUN  v1.6.1 /Users/ajri/dev/github.com/samudra-ajri/backend-assessment-starter

 ✓ tests/notes.test.ts  (25 tests) 378ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  14:28:19
   Duration  818ms (transform 135ms, setup 0ms, collect 259ms, tests 378ms, environment 0ms, prepare 55ms)
```

---

## What I'd Do With More Time

- **Enable `strict: true` in tsconfig** and fix the resulting type errors — replace all `any` types with proper interfaces (e.g., `Request` extensions for `req.user`, typed DB row interfaces). This would catch entire classes of bugs at compile time.
- **Add rate limiting** (`express-rate-limit`) on login and registration endpoints.
- **Add `helmet`** for security headers.
- **Add pagination** to `GET /notes` with `?page=` and `?limit=` query params.
- **Add structured logging** with `pino` — request IDs, timestamps, log levels.
- **Separate route handlers from business logic** — extract service/repository layers so routes are thin and business logic is independently testable.
- **Add a migration system** instead of `CREATE TABLE IF NOT EXISTS` — proper schema versioning for production deployments.
- **Add CSRF protection** if the API will serve browser clients directly.
- **Purge secrets from git history** using `git filter-branch` or BFG Repo-Cleaner.
