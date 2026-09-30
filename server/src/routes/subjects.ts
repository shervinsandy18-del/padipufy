import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, course_code, difficulty, preparation_percent, exam_date
       FROM subjects
       WHERE user_id = $1
       ORDER BY exam_date NULLS LAST, created_at DESC`,
      [req.userId]
    );

    res.json({ subjects: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load subjects." });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      courseCode = "",
      difficulty = "Medium",
      preparationPercent = 0,
      examDate = null
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Subject name is required." });
    }

    const percent = Math.max(0, Math.min(100, Number(preparationPercent)));

    const result = await query(
      `INSERT INTO subjects
       (user_id, name, course_code, difficulty, preparation_percent, exam_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, course_code, difficulty, preparation_percent, exam_date`,
      [req.userId, name, courseCode, difficulty, percent, examDate]
    );

    res.status(201).json({ subject: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not create subject." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM subjects
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Subject not found." });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete subject." });
  }
});

export default router;
