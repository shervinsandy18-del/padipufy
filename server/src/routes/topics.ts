import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/unit/:unitId", async (req, res) => {
  try {
    const unit = await query(
      `SELECT u.id
       FROM units u
       JOIN subjects s ON s.id = u.subject_id
       WHERE u.id = $1 AND s.user_id = $2`,
      [req.params.unitId, req.userId]
    );

    if (!unit.rowCount) {
      return res.status(404).json({ message: "Unit not found." });
    }

    const result = await query(
      `SELECT id, unit_id, name, completed, created_at
       FROM topics
       WHERE unit_id = $1
       ORDER BY created_at ASC`,
      [req.params.unitId]
    );

    res.json({ topics: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load topics." });
  }
});

router.post("/unit/:unitId", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Topic name is required."
      });
    }

    const unit = await query(
      `SELECT u.id
       FROM units u
       JOIN subjects s ON s.id = u.subject_id
       WHERE u.id = $1 AND s.user_id = $2`,
      [req.params.unitId, req.userId]
    );

    if (!unit.rowCount) {
      return res.status(404).json({ message: "Unit not found." });
    }

    const result = await query(
      `INSERT INTO topics (unit_id, name)
       VALUES ($1, $2)
       RETURNING id, unit_id, name, completed, created_at`,
      [req.params.unitId, name]
    );

    res.status(201).json({ topic: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not create topic." });
  }
});

router.patch("/:id/toggle", async (req, res) => {
  try {
    const result = await query(
      `UPDATE topics
       SET completed = NOT completed
       WHERE id = $1
       AND unit_id IN (
         SELECT u.id
         FROM units u
         JOIN subjects s ON s.id = u.subject_id
         WHERE s.user_id = $2
       )
       RETURNING id, unit_id, name, completed, created_at`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Topic not found." });
    }

    res.json({ topic: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update topic." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM topics
       WHERE id = $1
       AND unit_id IN (
         SELECT u.id
         FROM units u
         JOIN subjects s ON s.id = u.subject_id
         WHERE s.user_id = $2
       )`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Topic not found." });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete topic." });
  }
});

export default router;