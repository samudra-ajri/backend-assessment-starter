import express from "express";
import cors from "cors";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { notesRouter } from "./notes";
import { config } from "./config";

export const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/notes", notesRouter);

// Global error handler — never leak stack traces to the client
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

// Only start the server when run directly (not when imported for tests)
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`listening on ${config.port}`);
  });
}
