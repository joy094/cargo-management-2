// routes/paymentRoutes.js

import express from "express";
import { Payment } from "./models.js";

const router = express.Router();

// বিদ্যমান ইতিহাস রাউট
router.get("/history/:shippingMark", async (req, res) => {
  try {
    const payments = await Payment.find({
      shippingMark: req.params.shippingMark,
    }).sort({ date: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// পেমেন্ট/ডিসকাউন্ট অ্যাড রাউট (স্ট্রং স্টেটমেন্ট ফিল্টার সহ)
router.post("/add-payment", async (req, res) => {
  try {
    const { shippingMark, amount, type, transactionId, statement } = req.body;

    // ১. ট্রানজেকশন আইডি বা স্টেটমেন্ট নাম্বার চেক
    if (transactionId || statement) {
      const query = transactionId
        ? { transactionId }
        : { statement: { $regex: new RegExp(`^${statement.trim()}$`, "i") } };

      const existingRecord = await Payment.findOne(query);
      if (existingRecord) {
        return res.status(400).json({
          success: false,
          message:
            "সতর্কতা: এই ট্রানজেকশন আইডি বা স্টেটমেন্ট নাম্বারটি ইতিমধ্যে ব্যবহৃত হয়েছে!",
        });
      }
    }

    const newPayment = new Payment(req.body);
    await newPayment.save();
    res.status(201).json({ success: true, message: "সফলভাবে সেভ হয়েছে।" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ নতুন: ডিলিট পেমেন্ট/ডিসকাউন্ট রাউট
router.delete("/delete/:id", async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "রেকর্ড ডিলিট হয়েছে।" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "ডিলিট করতে সমস্যা হয়েছে।" });
  }
});

export default router;
