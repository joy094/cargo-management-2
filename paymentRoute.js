// routes/paymentRoutes.js

import express from "express";
import { Payment, Branch } from "./models.js"; // 🔥 Branch মডেলটি ইমপোর্ট করা হলো

const router = express.Router();

// ✅ ১. পেমেন্ট/ডিসকাউন্ট ইতিহাস রাউট (সবগুলো মার্ক একসাথে সাপোর্ট করবে)
router.get("/history/:shippingMark", async (req, res) => {
  try {
    const requestedMark = req.params.shippingMark;

    // 🔥 স্পেশাল ক্যারেক্টার (যেমন / ) নিরাপদ করা
    const safeMark = requestedMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(`^${safeMark}$`, "i");

    // প্রথমে ব্রাঞ্চ খুঁজে বের করা
    const branch = await Branch.findOne({
      $or: [{ shippingMark: searchRegex }, { shippingMarks: searchRegex }],
    });

    // ব্রাঞ্চের সবগুলো মার্ক একটি Array তে নেওয়া
    let allMarksToSearch = [searchRegex];
    if (branch && branch.shippingMarks && branch.shippingMarks.length > 0) {
      allMarksToSearch = branch.shippingMarks.map((m) => {
        const safeM = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`^${safeM}$`, "i");
      });
    }

    // সবগুলো মার্কের পেমেন্ট একসাথে আনা
    const payments = await Payment.find({
      shippingMark: { $in: allMarksToSearch },
    }).sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ ২. পেমেন্ট/ডিসকাউন্ট অ্যাড রাউট (স্ট্রং স্টেটমেন্ট ফিল্টার সহ)
router.post("/add-payment", async (req, res) => {
  try {
    const { shippingMark, amount, type, transactionId, statement } = req.body;

    // ট্রানজেকশন আইডি বা স্টেটমেন্ট নাম্বার চেক
    if (transactionId || statement) {
      const query = transactionId
        ? { transactionId }
        : {
            statement: {
              $regex: new RegExp(
                `^${statement.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          };

      const existingRecord = await Payment.findOne(query);
      if (existingRecord) {
        return res.status(400).json({
          success: false,
          message:
            "সতর্কতা: এই ট্রানজেকশন আইডি বা স্টেটমেন্ট নাম্বারটি ইতিমধ্যে ব্যবহৃত হয়েছে!",
        });
      }
    }

    const newPayment = new Payment(req.body);
    await newPayment.save();
    res.status(201).json({ success: true, message: "সফলভাবে সেভ হয়েছে।" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ ৩. ডিলিট পেমেন্ট/ডিসকাউন্ট রাউট
router.delete("/delete/:id", async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "রেকর্ড ডিলিট হয়েছে।" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "ডিলিট করতে সমস্যা হয়েছে।" });
  }
});

export default router;
