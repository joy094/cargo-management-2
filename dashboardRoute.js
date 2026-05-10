// routes/dashboardRoutes.js
import express from "express";
import { Shipment, Branch, Payment } from "./models.js";

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    // ১. মোট ব্রাঞ্চ সংখ্যা
    const totalBranches = await Branch.countDocuments();

    // ২. শিপমেন্ট অ্যানালিটিক্স (Shipment Collection)
    const shipmentStats = await Shipment.aggregate([
      {
        $match: { isMasterCarton: { $ne: true } }, // মাস্টার কার্টন বাদ দিয়ে
      },
      {
        $group: {
          _id: null,
          totalBoxes: { $sum: 1 },
          // স্ট্রিং থাকলেও নম্বরে কনভার্ট করে ওজন যোগ করবে
          totalWeight: {
            $sum: {
              $toDouble: {
                $ifNull: ["$actualWeight", { $ifNull: ["$grossWeight", 0] }],
              },
            },
          },
          // বিল হওয়া আইটেমগুলোর টোটাল বিল যোগ করবে
          totalBilledAmount: {
            $sum: {
              $cond: [
                { $eq: ["$isBilled", true] },
                { $toDouble: { $ifNull: ["$totalBill", 0] } },
                0,
              ],
            },
          },
        },
      },
    ]);

    // ৩. পেমেন্ট অ্যানালিটিক্স (Payment Collection)
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: {
            $sum: {
              $cond: [
                { $eq: ["$type", "PAYMENT"] },
                { $toDouble: { $ifNull: ["$amount", 0] } },
                0,
              ],
            },
          },
          totalDiscount: {
            $sum: {
              $cond: [
                { $in: ["$type", ["DISCOUNT", "ADJUSTMENT"]] },
                { $toDouble: { $ifNull: ["$amount", 0] } },
                0,
              ],
            },
          },
        },
      },
    ]);

    // ৪. লেটেস্ট পেমেন্ট হিস্ট্রি
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // ডিফল্ট ভ্যালু সেট করা যাতে এরর না আসে
    const sStats = shipmentStats[0] || {
      totalBoxes: 0,
      totalWeight: 0,
      totalBilledAmount: 0,
    };
    const pStats = paymentStats[0] || { totalCollected: 0, totalDiscount: 0 };

    // বর্তমান মার্কেট ডিউ হিসাব
    const totalDue =
      sStats.totalBilledAmount - pStats.totalCollected - pStats.totalDiscount;

    res.status(200).json({
      success: true,
      data: {
        totalBranches,
        totalBoxes: sStats.totalBoxes,
        totalWeight: sStats.totalWeight,
        totalBilledAmount: sStats.totalBilledAmount,
        totalCollected: pStats.totalCollected,
        totalDiscount: pStats.totalDiscount,
        totalDue,
        recentPayments,
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "ড্যাশবোর্ড ডাটা লোড হতে ব্যর্থ হয়েছে",
      });
  }
});

export default router;
