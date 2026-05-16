// routes/dashboardRoutes.js
import express from "express";
import { Shipment, Branch, Payment, Batch } from "./models.js"; // 🔥 এখানে Batch মডেলটি যুক্ত করা হয়েছে

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    // ১. মোট ব্রাঞ্চ সংখ্যা
    const totalBranches = await Branch.countDocuments();

    // 🔥 ২. মোট ব্যাচ সংখ্যা (নতুন যুক্ত করা হলো)
    const totalBatches = await Batch.countDocuments();

    // ৩. শিপমেন্ট অ্যানালিটিক্স (Shipment Collection)
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

    // ৪. পেমেন্ট অ্যানালিটিক্স (Payment Collection)
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

    // ৫. লেটেস্ট পেমেন্ট হিস্ট্রি
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

    // 🔥 ৬. বকেয়া কাস্টমারদের তালিকা (Due List) তৈরি - মাল্টিপল মার্ক এবং স্ল্যাশ ফিক্স সহ
    const allBranches = await Branch.find(
      {},
      "branchName shippingMark shippingMarks phone address", // shippingMarks ও আনা হলো
    );

    const dueListPromises = allBranches.map(async (branch) => {
      // স্ল্যাশ (/) বা স্পেশাল ক্যারেক্টার নিরাপদ করে রেজেক্স অ্যারে তৈরি করা
      let marksToSearch = [];
      if (branch.shippingMarks && branch.shippingMarks.length > 0) {
        marksToSearch = branch.shippingMarks.map(
          (m) =>
            new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        );
      } else if (branch.shippingMark) {
        marksToSearch = [
          new RegExp(
            `^${branch.shippingMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        ];
      } else {
        return { _id: branch._id, currentDue: 0 };
      }

      // ওই ব্রাঞ্চের সবগুলো মার্কের মোট বিল একসাথে আনা
      const billData = await Shipment.aggregate([
        {
          $match: {
            shippingMark: { $in: marksToSearch },
            isBilled: true,
            isMasterCarton: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalBill" } } },
      ]);

      // ওই ব্রাঞ্চের সবগুলো মার্কের মোট পেমেন্ট ও ডিসকাউন্ট আনা
      const payData = await Payment.find({
        shippingMark: { $in: marksToSearch },
      });
      let paid = 0;
      let discount = 0;

      payData.forEach((p) => {
        const pType = p.type ? p.type.toUpperCase() : "";
        if (pType === "PAYMENT") paid += p.amount;
        else if (pType === "DISCOUNT" || pType === "ADJUSTMENT")
          discount += p.amount;
      });

      const totalBill = billData[0]?.total || 0;
      const currentDue = totalBill - paid - discount;

      return {
        _id: branch._id,
        branchName: branch.branchName,
        // ফ্রন্টএন্ড পপআপে দেখানোর জন্য কমা দিয়ে জয়েন করা হলো
        shippingMark:
          branch.shippingMarks && branch.shippingMarks.length > 0
            ? branch.shippingMarks.join(", ")
            : branch.shippingMark || "-",
        phone: branch.phone || "N/A",
        currentDue: currentDue,
      };
    });

    const branchesWithDue = await Promise.all(dueListPromises);

    // শুধু বকেয়া থাকা কাস্টমার ফিল্টার করে বড় থেকে ছোট ক্রমানুসারে সর্ট করা
    const sortedDueList = branchesWithDue
      .filter((b) => b && b.currentDue > 0)
      .sort((a, b) => b.currentDue - a.currentDue);

    // বর্তমান মার্কেট ডিউ হিসাব
    const totalDue =
      sStats.totalBilledAmount - pStats.totalCollected - pStats.totalDiscount;

    // ✅ ৭. ফাইনাল রেসপন্স (সব ডেটা ফ্রন্টএন্ডের স্টেট অনুযায়ী পাঠানো হলো)
    res.status(200).json({
      success: true,
      data: {
        totalBranches,
        totalBatches, // ফ্রন্টএন্ডের জন্য নতুন কাউন্ট
        totalBoxes: sStats.totalBoxes,
        totalWeight: sStats.totalWeight,
        totalBilledAmount: sStats.totalBilledAmount,
        totalCollected: pStats.totalCollected,
        totalDiscount: pStats.totalDiscount,
        totalDue,
        recentPayments,
        dueCustomers: sortedDueList,
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
