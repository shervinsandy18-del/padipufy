import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import subjectRoutes from "./routes/subjects.js";
import unitRoutes from "./routes/units.js";
import topicRoutes from "./routes/topics.js";
import materialRoutes from "./routes/materials.js";
import { createCorsOriginValidator } from "./corsOrigins.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";

const developmentOrigins = isProduction
  ? []
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176"
    ];
const isAllowedCorsOrigin = createCorsOriginValidator(
  process.env.CLIENT_URL,
  developmentOrigins,
  !isProduction
);

app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedCorsOrigin(origin));
  }
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
app.use("/api/units", unitRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/materials", materialRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(port, () => {
  console.log(`StudyMate AI server running on http://localhost:${port}`);
});
