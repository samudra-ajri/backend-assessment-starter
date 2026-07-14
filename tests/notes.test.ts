import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

// Set test environment before any app imports so config uses :memory: DB
process.env.NODE_ENV = "test";

import { app } from "../src/index";
import { db, hashPassword, verifyPassword } from "../src/db";

let aliceToken: string;
let bobToken: string;

beforeAll(async () => {
  // Login as seeded users
  const aliceRes = await request(app)
    .post("/auth/login")
    .send({ email: "alice@example.com", password: "password1" });
  aliceToken = aliceRes.body.token;

  const bobRes = await request(app)
    .post("/auth/login")
    .send({ email: "bob@example.com", password: "password2" });
  bobToken = bobRes.body.token;
});

// ─── Password Hashing ───────────────────────────────────────────────

describe("password hashing", () => {
  it("uses salted scrypt, not MD5", () => {
    const hashed = hashPassword("test");
    // MD5 produces a 32-char hex string; scrypt format is "salt:hash"
    expect(hashed).toContain(":");
    expect(hashed.length).toBeGreaterThan(32);
  });

  it("same password produces different hashes (random salt)", () => {
    const h1 = hashPassword("same");
    const h2 = hashPassword("same");
    expect(h1).not.toBe(h2);
  });

  it("verifyPassword returns true for correct password", () => {
    const hashed = hashPassword("correct");
    expect(verifyPassword("correct", hashed)).toBe(true);
  });

  it("verifyPassword returns false for wrong password", () => {
    const hashed = hashPassword("correct");
    expect(verifyPassword("wrong", hashed)).toBe(false);
  });
});

// ─── Auth / Login ────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  it("returns a JWT for valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "password1" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid credentials");
  });

  it("returns 401 for non-existent user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email or password is missing", async () => {
    const res1 = await request(app).post("/auth/login").send({ email: "a@b.com" });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/auth/login").send({ password: "x" });
    expect(res2.status).toBe(400);
  });

  it("rejects SQL injection in login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "' OR '1'='1' --", password: "anything" });

    expect(res.status).toBe(401);
  });
});

// ─── User Registration ──────────────────────────────────────────────

describe("POST /users/register", () => {
  it("creates a new user", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "newuser@example.com", password: "securepass1" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "alice@example.com", password: "whatever123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("email taken");
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "nopass@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "notanemail", password: "securepass1" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "short@example.com", password: "abc" });
    expect(res.status).toBe(400);
  });

  it("rejects SQL injection in registration", async () => {
    const res = await request(app)
      .post("/users/register")
      .send({ email: "'; DROP TABLE users; --", password: "securepass1" });

    // Should fail validation (no @) or be treated as a literal string — not execute SQL
    expect(res.status).not.toBe(500);
    // Table should still exist
    const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
    expect(count.c).toBeGreaterThan(0);
  });
});

// ─── Notes (Authentication) ─────────────────────────────────────────

describe("notes auth", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/notes");
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
  });
});

// ─── Notes (Authorization / IDOR) ───────────────────────────────────

describe("notes authorization", () => {
  it("GET /notes returns only the authenticated user's notes", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Alice should only see her own notes
    for (const note of res.body) {
      expect(note.author).toBe("alice@example.com");
    }
  });

  it("GET /notes/:id returns 403 when accessing another user's note", async () => {
    // Get Bob's note ID
    const bobNotes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${bobToken}`);
    const bobNoteId = bobNotes.body[0]?.id;

    if (bobNoteId) {
      // Alice tries to access Bob's note
      const res = await request(app)
        .get(`/notes/${bobNoteId}`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(403);
    }
  });

  it("GET /notes/:id returns 404 for non-existent note", async () => {
    const res = await request(app)
      .get("/notes/99999")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(404);
  });

  it("GET /notes/:id allows owner to access their own note", async () => {
    const aliceNotes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${aliceToken}`);
    const aliceNoteId = aliceNotes.body[0]?.id;

    if (aliceNoteId) {
      const res = await request(app)
        .get(`/notes/${aliceNoteId}`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceNoteId);
    }
  });
});

// ─── Notes (CRUD) ────────────────────────────────────────────────────

describe("POST /notes", () => {
  it("creates a note for the authenticated user", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "Test Note", body: "test content" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    // Verify the note was created and belongs to Alice
    const noteRes = await request(app)
      .get(`/notes/${res.body.id}`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(noteRes.status).toBe(200);
    expect(noteRes.body.title).toBe("Test Note");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ body: "no title" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("title is required");
  });
});

// ─── SQL Injection on Notes ─────────────────────────────────────────

describe("SQL injection on notes", () => {
  it("GET /notes/:id rejects SQL injection in id param", async () => {
    const res = await request(app)
      .get("/notes/1 OR 1=1")
      .set("Authorization", `Bearer ${aliceToken}`);

    // Should either 404 or return only the single matching note — not all notes
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      // If it returned something, it should be a single object, not an array
      expect(Array.isArray(res.body)).toBe(false);
    }
  });
});

// ─── Error Handling ──────────────────────────────────────────────────

describe("error handling", () => {
  it("does not expose stack traces in error responses", async () => {
    // Access a non-existent route to trigger error handling
    const res = await request(app).get("/nonexistent");
    expect(res.body.stack).toBeUndefined();
  });
});
