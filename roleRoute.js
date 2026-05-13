// roleRoute.js

import express from "express";
import { Role } from "./models.js"; // পাথ ঠিক করে নেবেন
import { authMiddleware, requireSuperAdmin } from "./auth.js";

const router = express.Router();

// ১. নতুন রোল তৈরি করা (Only Super Admin)
router.post("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { roleName, permissions } = req.body;

    // রোল আগে থেকে আছে কি না চেক
    const existingRole = await Role.findOne({ roleName });
    if (existingRole)
      return res.status(400).json({ error: "এই নামে ইতিমধ্যে একটি রোল আছে!" });

    const newRole = new Role({ roleName, permissions });
    await newRole.save();

    res
      .status(201)
      .json({ success: true, message: "নতুন রোল তৈরি হয়েছে", role: newRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ২. সব রোল দেখা (Only Super Admin)
router.get("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 ৩. রোল এডিট বা আপডেট করা (Only Super Admin)
router.put("/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { roleName, permissions } = req.body;

    // রোল আপডেট করা
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { roleName, permissions },
      { new: true }, // এটি আপডেট হওয়া নতুন ডাটা রিটার্ন করবে
    );

    if (!updatedRole) {
      return res.status(404).json({ error: "রোলটি খুঁজে পাওয়া যায়নি!" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "রোল সফলভাবে আপডেট হয়েছে",
        role: updatedRole,
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 ৪. রোল ডিলিট করা (Only Super Admin)
router.delete("/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndDelete(req.params.id);

    if (!deletedRole) {
      return res.status(404).json({ error: "রোলটি খুঁজে পাওয়া যায়নি!" });
    }

    res
      .status(200)
      .json({ success: true, message: "রোলটি সফলভাবে ডিলিট হয়েছে" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
