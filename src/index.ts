import express from "express";
import cors from "cors";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { notesRouter } from "./notes";
import { config } from "./config";

const app = express();

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/notes", notesRouter);

app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(config.port, () => {
  console.log(`listening on ${config.port}`);
});
