"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHrOrAdmin = requireHrOrAdmin;
const express_1 = require("express");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
function requireHrOrAdmin(req, res, next) {
    if (typeof req.user === "string" || !req.user || !["hr", "admin"].includes(req.user.role)) {
        return res.status(403).json({ message: "Only HR or admin users can access this route" });
    }
    return next();
}
router.get("/genereateEmployeeCredentials", auth_1.authenticateJwt, requireHrOrAdmin, (_req, res) => {
    res.send("accessed");
});
exports.default = router;
