// auth.js - updated with RBAC, rate-limit & brute-force protection

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { User, Role } from "./models.js"; // Role ইম্পোর্ট করা হলো

const LOCK_MINUTES = parseInt(process.env.ACCOUNT_LOCK_MINUTES || "15", 10);

// -----------------------------
// 1. Login Rate Limiter
// -----------------------------
export const LOGIN_RATE_LIMIT = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 8, // max 8 attempts per IP per minute
  message: { error: "Too many login attempts from this IP, try again later." },
});

// -----------------------------
// 2. Auth Middleware (Updated for RBAC)
// -----------------------------
export async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization required" });

    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 ইউজারের সাথে তার Role ডাটা populate করে আনা হচ্ছে
    const user = await User.findById(payload.id).populate("role");
    if (!user) return res.status(401).json({ error: "Invalid token" });

    // 🔥 একাউন্ট ডিজেবল করা থাকলে এক্সেস বন্ধ
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled by admin" });
    }

    // 🔥 পরবর্তী পারমিশন চেকিংয়ের জন্য req.user এ সব ডাটা দিয়ে দেওয়া হলো
    req.user = {
      id: user._id,
      username: user.username,
      role: user.role, // এখানে ইউজারের পারমিশন অবজেক্ট থাকবে
      isSuperAdmin: user.isSuperAdmin,
    };

    // ⚠️ নোট: আগের 'admin' চেকটি মুছে দেওয়া হয়েছে।
    // এখন থেকে রাউটগুলোকে checkPermission গার্ড দিয়ে প্রটেক্ট করা হবে।
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// -----------------------------
// 3. Seed Admin from ENV (Updated)
// -----------------------------
export async function seedAdmin() {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return;

  const exists = await User.findOne({ username: adminUser.toLowerCase() });
  if (exists) {
    // যদি আগের অ্যাডমিন থাকে, তাকে অটোমেটিক সুপার অ্যাডমিন বানিয়ে দেব
    if (!exists.isSuperAdmin) {
      exists.isSuperAdmin = true;
      await exists.save();
      console.log("ℹ️ Existing admin upgraded to Super Admin");
    } else {
      console.log("ℹ️ Super Admin user already exists, skipping seed");
    }
    return;
  }

  const hash = await bcrypt.hash(adminPass, 12);
  await User.create({
    username: adminUser.toLowerCase(),
    passwordHash: hash,
    isSuperAdmin: true, // 🔥 নতুন স্কিমা অনুযায়ী সুপার অ্যাডমিন
    isActive: true,
  });
  console.log("✅ Super Admin user seeded from env");
}

// -----------------------------
// 4. Login Handler (Updated for Permissions)
// -----------------------------
export async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username & password required" });

    // 🔥 Role populate করে ইউজার খোঁজা
    const user = await User.findOne({
      username: username.toLowerCase(),
    }).populate("role");
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // একাউন্ট একটিভ কি না চেক করা
    if (!user.isActive) {
      return res
        .status(403)
        .json({ error: "আপনার একাউন্টটি ডিজেবল করা হয়েছে।" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        error: `Account locked. Try again after ${Math.ceil(
          (user.lockUntil - Date.now()) / 60000,
        )} min.`,
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 3) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // 🔥 ইউজারের পারমিশন নির্ধারণ করা
    const userPermissions = user.isSuperAdmin
      ? "ALL"
      : user.role
        ? user.role.permissions
        : null;

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        isSuperAdmin: user.isSuperAdmin, // টোকেনে সুপার অ্যাডমিন স্ট্যাটাস দেওয়া হলো
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "8h" },
    );

    // 🔥 ফ্রন্টএন্ডে পারমিশনগুলো পাঠিয়ে দেওয়া হচ্ছে
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isSuperAdmin: user.isSuperAdmin,
        permissions: userPermissions,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
// -----------------------------
// 5. Super Admin Guard (New)
// -----------------------------
export const requireSuperAdmin = (req, res, next) => {
  // authMiddleware পার হয়ে আসার পর req.user এ ডাটা থাকবে
  if (req.user && req.user.isSuperAdmin) {
    next(); // সুপার অ্যাডমিন হলে ভেতরে ঢুকতে দেবে
  } else {
    res
      .status(403)
      .json({
        error: "Access Denied! শুধুমাত্র সুপার অ্যাডমিন এই কাজ করতে পারবেন।",
      });
  }
};
