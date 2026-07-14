import { Router } from "express";
import { db } from "./db";
import { authMiddleware } from "./auth";

export const notesRouter = Router();

// GET /notes — returns only the authenticated user's notes (JOIN instead of N+1)
notesRouter.get("/", authMiddleware, (req: any, res) => {
  const notes = db
    .prepare(
      `SELECT notes.id, notes.title, notes.body, notes.user_id, users.email AS author
       FROM notes
       JOIN users ON users.id = notes.user_id
       WHERE notes.user_id = ?`
    )
    .all(req.user.userId);

  res.json(notes);
});

// GET /notes/:id — owner-only access
notesRouter.get("/:id", authMiddleware, (req: any, res) => {
  const note = db
    .prepare("SELECT * FROM notes WHERE id = ?")
    .get(req.params.id) as any;

  if (!note) {
    return res.status(404).json({ error: "note not found" });
  }

  if (note.user_id !== req.user.userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  res.json(note);
});

// POST /notes — create a note for the authenticated user
notesRouter.post("/", authMiddleware, (req: any, res) => {
  const { title, body } = req.body as any;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  const info = db
    .prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)")
    .run(req.user.userId, title, body || null);
  res.status(201).json({ id: info.lastInsertRowid });
});
