import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Router, type Request } from "express";
import { type JwtPayload } from "jsonwebtoken";
import { authenticateJwt } from "../auth";
import { pool } from "../../utils/db";
import { generateEmployeeId } from "../../utils/generateEmployeeId";
import { requireHrOrAdmin } from "../../utils/requireHrOrAdmin";

const router = Router();

type CreateEmployeeBody = {
  name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  role?: string;
};

type AuthRequest = Request<unknown, unknown, CreateEmployeeBody> & {
  user?: JwtPayload | string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateRandomPassword() {
  return `Hrms@${randomBytes(6).toString("base64url")}`;
}

router.post(
  "/genereateEmployeeCredentials",
  authenticateJwt,
  requireHrOrAdmin,
  async (req: AuthRequest, res) => {
    if (typeof req.user === "string" || !req.user) {
      return res.status(401).json({ message: "Invalid authenticated user" });
    }

    const companyName =
      typeof req.user.companyName === "string"
        ? req.user.companyName.trim()
        : "";
    const name = (req.body.name ?? "").trim();
    const email = (req.body.email ?? "").trim().toLowerCase();
    const phone = (req.body.phone ?? req.body.phone_number ?? "").trim();
    const role = (req.body.role ?? "employee").trim().toLowerCase();

    if (!companyName) {
      return res
        .status(400)
        .json({ message: "Authenticated user company is required" });
    }

    if (!name || !email || !phone || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, phone number, and role are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    try {
      const employeeId = await generateEmployeeId(pool, companyName, name);
      const password = generateRandomPassword();
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `
          INSERT INTO users (company_name, name, email, phone, employee_id, role, password_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, company_name, name, email, phone, employee_id, role, created_at;
        `,
        [companyName, name, email, phone, employeeId, role, passwordHash],
      );

      return res.status(201).json({
        message: "Employee credentials generated successfully",
        user: result.rows[0],
        credentials: {
          employee_id: employeeId,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return res
          .status(409)
          .json({ message: "Email or employee ID is already registered" });
      }

      if (
        error instanceof Error &&
        ["Company name", "Name"].some((prefix) =>
          error.message.startsWith(prefix),
        )
      ) {
        return res.status(400).json({ message: error.message });
      }

      console.error("Employee credential generation failed", error);
      return res
        .status(500)
        .json({ message: "Employee credential generation failed" });
    }
  },
);

export default router;
