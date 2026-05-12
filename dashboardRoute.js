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
        $match: { isMasterCarton: { $ne: true } },
      },
      {
        $group: {
          _id: null,
          totalBoxes: { $sum: 1 },
          totalWeight: {
            $sum: {
              $toDouble: {
                $ifNull: ["$actualWeight", { $ifNull: ["$grossWeight", 0] }],
              },
            },
          },
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

    // ডিফল্ট ভ্যালু সেট করা
    const sStats = shipmentStats[0] || {
      totalBoxes: 0,
      totalWeight: 0,
      totalBilledAmount: 0,
    };
    const pStats = paymentStats[0] || { totalCollected: 0, totalDiscount: 0 };

    // ৫. বকেয়া কাস্টমারদের তালিকা (Due List) তৈরি
    const allBranches = await Branch.find(
      {},
      "branchName shippingMark phone address",
    );

    const dueListPromises = allBranches.map(async (branch) => {
      const markRegex = new RegExp(`^${branch.shippingMark}$`, "i");

      // নির্দিষ্ট ব্রাঞ্চের বিল
      const billData = await Shipment.aggregate([
        {
          $match: {
            shippingMark: markRegex,
            isBilled: true,
            isMasterCarton: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalBill" } } },
      ]);

      // নির্দিষ্ট ব্রাঞ্চের পেমেন্ট ও ডিসকাউন্ট
      const payData = await Payment.find({ shippingMark: markRegex });
      let paid = 0;
      let discount = 0;

      payData.forEach((p) => {
        if (p.type === "PAYMENT") paid += p.amount;
        else if (p.type === "DISCOUNT" || p.type === "ADJUSTMENT")
          discount += p.amount;
      });

      const totalBill = billData[0]?.total || 0;
      const currentDue = totalBill - paid - discount;

      return {
        _id: branch._id,
        branchName: branch.branchName,
        shippingMark: branch.shippingMark,
        phone: branch.phone,
        currentDue: currentDue,
      };
    });

    const branchesWithDue = await Promise.all(dueListPromises);

    // শুধু যাদের বকেয়া আছে তাদের ফিল্টার করে সর্ট করা
    const sortedDueList = branchesWithDue
      .filter((b) => b.currentDue > 0)
      .sort((a, b) => b.currentDue - a.currentDue);

    // বর্তমান মার্কেট ডিউ হিসাব
    const totalDue =
      sStats.totalBilledAmount - pStats.totalCollected - pStats.totalDiscount;

    // ✅ ৬. ফাইনাল রেসপন্স (সব ডাটা একসাথে)
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
        dueCustomers: sortedDueList, // পপআপের জন্য ডাটা
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({
      success: false,
      message: "ড্যাশবোর্ড ডাটা লোড হতে ব্যর্থ হয়েছে",
    });
  }
});

export default router;
