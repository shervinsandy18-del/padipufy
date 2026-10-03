import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT
         sm.id,
         sm.title,
         sm.file_name,
         sm.file_url,
         sm.file_type,
         sm.created_at,
         sm.subject_id,
         sm.unit_id,
         s.name AS subject_name,
         u.unit_number,
         u.name AS unit_name
       FROM study_materials sm
       LEFT JOIN subjects s ON s.id = sm.subject_id
       LEFT JOIN units u ON u.id = sm.unit_id
       WHERE sm.user_id = $1
       ORDER BY sm.created_at DESC`,
      [req.userId]
    );

    res.json({ materials: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not load study materials."
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      fileName,
      fileUrl,
      fileType = "application/pdf",
      subjectId = null,
      unitId = null
    } = req.body;

    if (!title || !fileName || !fileUrl) {
      return res.status(400).json({
        message: "Title, file name and file URL are required."
      });
    }

    if (subjectId) {
      const subject = await query(
        `SELECT id
         FROM subjects
         WHERE id = $1 AND user_id = $2`,
        [subjectId, req.userId]
      );

      if (!subject.rowCount) {
        return res.status(404).json({
          message: "Subject not found."
        });
      }
    }

    if (unitId) {
      const unit = await query(
        `SELECT u.id
         FROM units u
         JOIN subjects s ON s.id = u.subject_id
         WHERE u.id = $1 AND s.user_id = $2`,
        [unitId, req.userId]
      );

      if (!unit.rowCount) {
        return res.status(404).json({
          message: "Unit not found."
        });
      }
    }

    const result = await query(
      `INSERT INTO study_materials
       (user_id, subject_id, unit_id, title, file_name, file_url, file_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         subject_id,
         unit_id,
         title,
         file_name,
         file_url,
         file_type,
         created_at`,
      [
        req.userId,
        subjectId,
        unitId,
        title,
        fileName,
        fileUrl,
        fileType
      ]
    );

    res.status(201).json({
      material: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not create study material."
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM study_materials
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: "Study material not found."
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not delete study material."
    });
  }
});

export default router;