// index.js

// ======================================
// Hajji Management System - Backend Entry
// ======================================

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "./auth.js";
import routes from "./routes.js";
import batchRoute from "./batchRoute.js"
import branchRoute from "./branchRoutes.js";
import paymentRoute from "./paymentRoute.js";
import dashboardRoute from "./dashboardRoute.js";
import roleRoutes from "./roleRoute.js";
import userRoutes from "./userRoute.js";
import trackingRoutes from "./trackingRoutes.js";

dotenv.config();

const app = express();

/* ===========================
   Middleware
=========================== */
app.use(cors());
app.use(express.json());

/* ===========================
   Routes
=========================== */
app.use("/api", routes);
app.use("/api/batches", batchRoute);
app.use("/api/branches", branchRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);

app.use("/api/tracking", trackingRoutes);
/* ===========================
   MongoDB Connection
=========================== */
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cargo_management";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    try {
      const { seedAdmin } = await import("./auth.js");
      await seedAdmin();
    } catch (err) {
      console.error("Seed admin error:", err.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });

/* ===========================
   Server Start
=========================== */

// Security headers
app.use(helmet());

// Resolve paths for static serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production: expose login page (public) but require admin JWT for all other pages
if (process.env.NODE_ENV === "production") {
  // serve login UI publicly
  app.use("/login", express.static(path.join(__dirname, "client", "dist")));
  app.get("/login*", (req, res) =>
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"))
  );

  // require auth for all other non-api routes
  app.use(async (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/auth") ||
      req.path.startsWith("/login")
    )
      return next();

    return authMiddleware(req, res, next);
  });

  // serve protected frontend
  app.use(express.static(path.join(__dirname, "client", "dist")));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"))
  );
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
