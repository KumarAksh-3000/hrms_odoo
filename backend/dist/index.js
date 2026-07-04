"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const createEmp_1 = __importDefault(require("./routes/admin/createEmp"));
const auth_1 = __importStar(require("./routes/auth"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 5000;
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/auth", auth_1.default);
app.use("/admin", createEmp_1.default);
async function startServer() {
    await (0, auth_1.initAuthSchema)();
    app.listen(port, () => {
        console.log(`Backend server running on port ${port}`);
    });
}
startServer().catch((error) => {
    console.error("Failed to start backend server", error);
    process.exit(1);
});
/*
curl -X GET http://localhost:5000/admin/genereateEmployeeCredentials \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2IiwiZW1haWwiOiJqb2huLmRvYXNkZUBhZXhhbXBsZS5jb20iLCJjb21wYW55TmFtZSI6Ik9kb28gSW5kaWEiLCJuYW1lIjoiSm9obiBEb2UiLCJlbXBsb3llZUlkIjoiT0lKT0RPMjAyNjAwMDEiLCJyb2xlIjoiaHIiLCJpYXQiOjE3ODMxNDA5MDQsImV4cCI6MTc4Mzc0NTcwNH0.19w9yDJxTh757xFnTkmWL9D03CwQXiw_voso4PUQjAc"
*/
