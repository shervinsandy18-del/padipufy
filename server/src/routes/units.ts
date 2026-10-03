import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/subject/:subjectId", async (req, res) => {
  try {
    const subject = await query(
      `SELECT id
       FROM subjects
       WHERE id = $1 AND user_id = $2`,
      [req.params.subjectId, req.userId]
    );

    if (!subject.rowCount) {
      return res.status(404).json({ message: "Subject not found." });
    }

    const result = await query(
      `SELECT id, subject_id, unit_number, name, created_at
       FROM units
       WHERE subject_id = $1
       ORDER BY unit_number ASC`,
      [req.params.subjectId]
    );

    res.json({ units: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load units." });
  }
});

router.post("/subject/:subjectId", async (req, res) => {
  try {
    const { unitNumber, name } = req.body;

    if (!name || !unitNumber) {
      return res.status(400).json({
        message: "Unit number and name are required."
      });
    }

    const subject = await query(
      `SELECT id
       FROM subjects
       WHERE id = $1 AND user_id = $2`,
      [req.params.subjectId, req.userId]
    );

    if (!subject.rowCount) {
      return res.status(404).json({ message: "Subject not found." });
    }

    const result = await query(
      `INSERT INTO units (subject_id, unit_number, name)
       VALUES ($1, $2, $3)
       RETURNING id, subject_id, unit_number, name, created_at`,
      [req.params.subjectId, Number(unitNumber), name]
    );

    res.status(201).json({ unit: result.rows[0] });
  } catch (error) {
    console.error(error);

    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({
        message: "That unit number already exists for this subject."
      });
    }

    res.status(500).json({ message: "Could not create unit." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM units
       WHERE id = $1
       AND subject_id IN (
         SELECT id FROM subjects WHERE user_id = $2
       )`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Unit not found." });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete unit." });
  }
});

export default router;