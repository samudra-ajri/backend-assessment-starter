import { Router } from "express";
import { db, hashPassword } from "./db";

export const usersRouter = Router();

usersRouter.post("/register", (req, res) => {
  const { email, password } = req.body as any;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "invalid email format" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }

  // Parameterized query — no SQL injection
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    return res.status(409).json({ error: "email taken" });
  }

  const result = db
    .prepare("INSERT INTO users (email, password) VALUES (?, ?)")
    .run(email, hashPassword(password));
  res.status(201).json({ id: result.lastInsertRowid });
});
