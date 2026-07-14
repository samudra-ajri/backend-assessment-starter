export const config = {
  jwtSecret: process.env.JWT_SECRET || "supersecret",
  dbPath: process.env.DB_PATH || "notes.db",
  port: Number(process.env.PORT) || 3000,
};
