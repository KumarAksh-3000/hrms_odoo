import "dotenv/config";
import express from "express";
import adminRouter from "./routes/admin/createEmp";
import authRouter, { initAuthSchema } from "./routes/auth";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);

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
/*
curl -X GET http://localhost:5000/admin/genereateEmployeeCredentials \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2IiwiZW1haWwiOiJqb2huLmRvYXNkZUBhZXhhbXBsZS5jb20iLCJjb21wYW55TmFtZSI6Ik9kb28gSW5kaWEiLCJuYW1lIjoiSm9obiBEb2UiLCJlbXBsb3llZUlkIjoiT0lKT0RPMjAyNjAwMDEiLCJyb2xlIjoiaHIiLCJpYXQiOjE3ODMxNDA5MDQsImV4cCI6MTc4Mzc0NTcwNH0.19w9yDJxTh757xFnTkmWL9D03CwQXiw_voso4PUQjAc"
*/
