"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const express_1 = require("express");
const auth_1 = require("../auth");
const db_1 = require("../../utils/db");
const generateEmployeeId_1 = require("../../utils/generateEmployeeId");
const requireHrOrAdmin_1 = require("../../utils/requireHrOrAdmin");
const router = (0, express_1.Router)();
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function generateRandomPassword() {
    return `Hrms@${(0, crypto_1.randomBytes)(6).toString("base64url")}`;
}
router.post("/genereateEmployeeCredentials", auth_1.authenticateJwt, requireHrOrAdmin_1.requireHrOrAdmin, async (req, res) => {
    if (typeof req.user === "string" || !req.user) {
        return res.status(401).json({ message: "Invalid authenticated user" });
    }
    const companyName = typeof req.user.companyName === "string" ? req.user.companyName.trim() : "";
    const name = (req.body.name ?? "").trim();
    const email = (req.body.email ?? "").trim().toLowerCase();
    const phone = (req.body.phone ?? req.body.phone_number ?? "").trim();
    const role = (req.body.role ?? "employee").trim().toLowerCase();
    if (!companyName) {
        return res.status(400).json({ message: "Authenticated user company is required" });
    }
    if (!name || !email || !phone || !role) {
        return res.status(400).json({ message: "Name, email, phone number, and role are required" });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required" });
    }
    try {
        const employeeId = await (0, generateEmployeeId_1.generateEmployeeId)(db_1.pool, companyName, name);
        const password = generateRandomPassword();
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const result = await db_1.pool.query(`
          INSERT INTO users (company_name, name, email, phone, employee_id, role, password_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, company_name, name, email, phone, employee_id, role, created_at;
        `, [companyName, name, email, phone, employeeId, role, passwordHash]);
        return res.status(201).json({
            message: "Employee credentials generated successfully",
            user: result.rows[0],
            credentials: {
                employee_id: employeeId,
                password,
            },
        });
    }
    catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Email or employee ID is already registered" });
        }
        if (error instanceof Error &&
            ["Company name", "Name"].some((prefix) => error.message.startsWith(prefix))) {
            return res.status(400).json({ message: error.message });
        }
        console.error("Employee credential generation failed", error);
        return res.status(500).json({ message: "Employee credential generation failed" });
    }
});
exports.default = router;
