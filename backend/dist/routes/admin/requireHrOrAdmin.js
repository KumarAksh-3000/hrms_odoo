"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHrOrAdmin = requireHrOrAdmin;
function requireHrOrAdmin(req, res, next) {
    if (typeof req.user === "string" || !req.user || !["hr", "admin"].includes(req.user.role)) {
        return res.status(403).json({ message: "Only HR or admin users can access this route" });
    }
    return next();
}
