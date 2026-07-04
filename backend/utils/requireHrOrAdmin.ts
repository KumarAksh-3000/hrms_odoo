import { type NextFunction, type Request, type Response } from "express";
import { type JwtPayload } from "jsonwebtoken";

type AuthRequest = Request & {
  user?: JwtPayload | string;
};

export function requireHrOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (typeof req.user === "string" || !req.user || !["hr", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only HR or admin users can access this route" });
  }

  return next();
}
