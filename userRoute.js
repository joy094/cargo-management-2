import express from "express";
import bcrypt from "bcrypt";
import { User } from "./models.js";
import { authMiddleware, requireSuperAdmin } from "./auth.js";

const router = express.Router();

// ১. নতুন স্টাফ বা ইউজার তৈরি করা (Only Super Admin)
router.post("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser)
      return res
        .status(400)
        .json({ error: "এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে!" });

    // পাসওয়ার্ড হ্যাশ করা
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = new User({
      username: username.toLowerCase(),
      passwordHash,
      role: role || null, // রোল আইডি
    });

    await newUser.save();
    res.status(201).json({ success: true, message: "নতুন ইউজার তৈরি হয়েছে!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ২. সব স্টাফের লিস্ট দেখা (Role সহ)
router.get("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    // পাসওয়ার্ড বাদে বাকি ডাটা পাঠাব এবং Role এর নাম নিয়ে আসব
    const users = await User.find({ isSuperAdmin: false })
      .select("-passwordHash")
      .populate("role", "roleName");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ৩. স্টাফের একাউন্ট একটিভ/ডিজেবল করা (Active/Inactive)
router.put(
  "/:id/status",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "ইউজার পাওয়া যায়নি!" });

      user.isActive = !user.isActive; // স্ট্যাটাস উল্টে দেবে (true থাকলে false হবে)
      await user.save();

      res.json({
        success: true,
        message: `একাউন্টটি ${user.isActive ? "চালু" : "বন্ধ"} করা হয়েছে।`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
