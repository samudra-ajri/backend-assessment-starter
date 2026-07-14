import { Router } from "express";
import { db, hashPassword } from "./db";

export const usersRouter = Router();

usersRouter.post("/register", (req, res) => {
  const { email, password } = req.body as any;

  const existing = db
    .prepare(`SELECT * FROM users WHERE email = '${email}'`)
    .get();
  if (existing) {
    return res.status(409).json({ error: "email taken" });
  }

  db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(
    email,
    hashPassword(password)
  );
  res.json({ ok: true });
});
