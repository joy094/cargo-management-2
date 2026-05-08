// routes/paymentRoutes.js

import express from "express";

import { Payment } from "./models.js";

const router = express.Router();

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
router.post("/add-payment", async (req, res) => {
  try {
    const { shippingMark, amount, type, transactionId, date } = req.body;

    // ১. ট্রানজেকশন আইডি থাকলে তা দিয়ে চেক (Primary Check)
    if (transactionId) {
      const existingTxn = await Payment.findOne({ transactionId });
      if (existingTxn) {
        return res.status(400).json({
          success: false,
          message: "এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে!",
        });
      }
    }

    // ২. টাইম-উইন্ডো চেক (Duplicate Submission Prevention)
    // গত ৩ মিনিটের মধ্যে একই কাস্টমার ও একই অ্যামাউন্টের পেমেন্ট হয়েছে কি না
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const potentialDuplicate = await Payment.findOne({
      shippingMark,
      amount,
      type,
      createdAt: { $gte: threeMinutesAgo },
    });

    if (potentialDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "সতর্কতা: একই পেমেন্ট ডুপ্লিকেট হওয়ার সম্ভাবনা আছে! কিছুক্ষণ পর চেষ্টা করুন।",
      });
    }

    const newPayment = new Payment(req.body);
    await newPayment.save();
    res
      .status(201)
      .json({ success: true, message: "পেমেন্ট সফলভাবে জমা হয়েছে।" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
