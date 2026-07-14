import { Router } from "express";
import jwt from "jsonwebtoken";
import { db, hashPassword } from "./db";
import { config } from "./config";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as any;

  const row = db
    .prepare(
      `SELECT * FROM users WHERE email = '${email}' AND password = '${hashPassword(
        password
      )}'`
    )
    .get() as any;

  if (!row) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign({ userId: row.id, email: row.email }, config.jwtSecret);
  console.log("issued token for", email, token);
  res.json({ token });
});

export function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
}
