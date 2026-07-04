import "dotenv/config";
import express from "express";
import authRouter, { initAuthSchema } from "./routes/auth";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);

async function startServer() {
  await initAuthSchema();

  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend server", error);
  process.exit(1);
});
