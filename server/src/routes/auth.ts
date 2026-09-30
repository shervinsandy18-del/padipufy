import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function createToken(userId: string) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      college = "",
      course = "",
      yearSemester = ""
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rowCount) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query<{
      id: string;
      full_name: string;
      email: string;
    }>(
      `INSERT INTO users
       (full_name, email, password_hash, college, course, year_semester)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email`,
      [
        String(fullName).trim(),
        normalizedEmail,
        passwordHash,
        college,
        course,
        yearSemester
      ]
    );

    const user = result.rows[0];

    return res.status(201).json({
      token: createToken(user.id),
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await query<{
      id: string;
      full_name: string;
      email: string;
      password_hash: string;
    }>(
      `SELECT id, full_name, email, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      token: createToken(user.id),
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await query<{
      id: string;
      full_name: string;
      email: string;
      college: string | null;
      course: string | null;
      year_semester: string | null;
    }>(
      `SELECT id, full_name, email, college, course, year_semester
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];

    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        college: user.college,
        course: user.course,
        yearSemester: user.year_semester
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load profile." });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      college,
      course,
      yearSemester
    } = req.body;

    const result = await query<{
      id: string;
      full_name: string;
      email: string;
      college: string | null;
      course: string | null;
      year_semester: string | null;
    }>(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           college = COALESCE($2, college),
           course = COALESCE($3, course),
           year_semester = COALESCE($4, year_semester),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, full_name, email, college, course, year_semester`,
      [fullName, college, course, yearSemester, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];

    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        college: user.college,
        course: user.course,
        yearSemester: user.year_semester
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update profile." });
  }
});

export default router;
