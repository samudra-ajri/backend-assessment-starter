import { Router } from "express";
import { db } from "./db";
import { authMiddleware } from "./auth";

export const notesRouter = Router();

notesRouter.get("/", authMiddleware, (req: any, res) => {
  const notes = db.prepare("SELECT * FROM notes").all() as any[];

  const result = notes.map((n) => {
    const author = db
      .prepare(`SELECT email FROM users WHERE id = ${n.user_id}`)
      .get() as any;
    return { ...n, author: author ? author.email : null };
  });

  res.json(result);
});

notesRouter.get("/:id", authMiddleware, (req: any, res) => {
  const note = db
    .prepare(`SELECT * FROM notes WHERE id = ${req.params.id}`)
    .get();
  res.json(note);
});

notesRouter.post("/", authMiddleware, (req: any, res) => {
  const { title, body } = req.body as any;
  const info = db
    .prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)")
    .run(req.user.userId, title, body);
  res.json({ id: info.lastInsertRowid });
});
