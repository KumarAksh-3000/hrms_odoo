import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { pool } from "../utils/db";
import { generateEmployeeId } from "../utils/generateEmployeeId";

const router = Router();

type RegisterBody = {
  company_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  password?: string;
  confirm_password?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type AuthRequest = Request & {
  user?: JwtPayload | string;
};

export async function initAuthSchema() {
  if (!process.env.PSQL_URL) {
    throw new Error("PSQL_URL is required in backend/.env");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      phone VARCHAR(32) NOT NULL,
      employee_id VARCHAR(32) UNIQUE,
      role VARCHAR(16) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in backend/.env");
  }

  return process.env.JWT_SECRET;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[a-z]/.test(password))
    return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password))
    return "Password must include an uppercase letter";
  if (!/\d/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include a special character";

  return null;
}

function signToken(user: {
  id: string;
  email: string;
  company_name: string;
  name: string;
  employee_id: string;
  role: string;
}) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      companyName: user.company_name,
      name: user.name,
      employeeId: user.employee_id,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}

function authenticateJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

router.post(
  "/register",
  async (req: Request<unknown, unknown, RegisterBody>, res) => {
    const companyName = (req.body.company_name ?? "").trim();
    const name = (req.body.name ?? "").trim();
    const email = (req.body.email ?? "").trim().toLowerCase();
    const phone = (req.body.phone ?? "").trim();
    const role = (req.body.role ?? "").trim().toLowerCase();
    const password = req.body.password ?? "";
    const confirmPassword = req.body.confirm_password ?? "";

    console.log(companyName);
    console.log(name);
    console.log(email);
    console.log(phone);
    console.log(role);
    console.log(password);
    console.log(confirmPassword);

    if (
      !companyName ||
      !name ||
      !email ||
      !phone ||
      !role ||
      !password ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({ message: "All registration fields are required" });
    }

    if (role != "hr") {
      return res
        .status(403)
        .json({ message: "Only HR or admin users can register" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password must match" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    try {
      const employeeId = await generateEmployeeId(pool, companyName, name);
      console.log(employeeId);
      console.log(role);
      const passwordHash = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `
        INSERT INTO users (company_name, name, email, phone, employee_id, role, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, company_name, name, email, phone, employee_id, role, created_at;
      `,
        [companyName, name, email, phone, employeeId, role, passwordHash],
      );

      const user = result.rows[0];
      const token = signToken(user);

      return res.status(201).json({ user, token });
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

      console.error("Registration failed", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  },
);

router.post(
  "/login",
  async (req: Request<unknown, unknown, LoginBody>, res) => {
    const email = (req.body.email ?? "").trim().toLowerCase();
    const password = req.body.password ?? "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    try {
      const result = await pool.query(
        "SELECT id, company_name, name, email, phone, employee_id, role, password_hash, created_at FROM users WHERE email = $1",
        [email],
      );

      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      delete user.password_hash;
      const token = signToken(user);

      return res.json({ user, token });
    } catch (error) {
      console.error("Login failed", error);
      return res.status(500).json({ message: "Login failed" });
    }
  },
);

router.get("/me", authenticateJwt, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export { authenticateJwt };
export default router;

/*
  
curl -X POST http://localhost:5000/admin/genereateEmployeeCredentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2IiwiZW1haWwiOiJqb2huLmRvYXNkZUBhZXhhbXBsZS5jb20iLCJjb21wYW55TmFtZSI6Ik9kb28gSW5kaWEiLCJuYW1lIjoiSm9obiBEb2UiLCJlbXBsb3llZUlkIjoiT0lKT0RPMjAyNjAwMDEiLCJyb2xlIjoiaHIiLCJpYXQiOjE3ODMxNDA3MTgsImV4cCI6MTc4Mzc0NTUxOH0.dT0d_z290qZlJj1KfyMTb9AcHfgpWxp0NZyveHfbjF4" \
  -d '{
    "name": "Alice Brown",
    "email": "alice.brown@example.com",
    "phone": "9876543212",
    "role": "employee"
  }'

curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2IiwiZW1haWwiOiJqb2huLmRvYXNkZUBhZXhhbXBsZS5jb20iLCJjb21wYW55TmFtZSI6Ik9kb28gSW5kaWEiLCJuYW1lIjoiSm9obiBEb2UiLCJlbXBsb3llZUlkIjoiT0lKT0RPMjAyNjAwMDEiLCJyb2xlIjoiaHIiLCJpYXQiOjE3ODMxNDA3MTgsImV4cCI6MTc4Mzc0NTUxOH0.dT0d_z290qZlJj1KfyMTb9AcHfgpWxp0NZyveHfbjF4"
*/
