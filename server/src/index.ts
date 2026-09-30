import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import subjectRoutes from "./routes/subjects.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "StudyMate AI",
    stage: 1
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(port, () => {
  console.log(`StudyMate AI server running on http://localhost:${port}`);
});
